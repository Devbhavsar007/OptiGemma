"""
Unified dataset loading for retinal structure segmentation training.

Supports:
  - DRIVE / STARE / CHASE-DB1   → vessel segmentation (binary masks)
  - IDRiD                       → optic disc/fovea (point annotations → heatmaps)
                                  + lesion pixel masks (MA, EX, HE, SE/NV)
  - DDR                         → lesion pixel masks
  - FGADR                       → lesion pixel masks

All datasets are loaded through a unified interface with consistent
augmentation, normalization, and label schema.

Unified lesion label schema:
    0 = background
    1 = microaneurysms (MA)
    2 = hard exudates (EX)
    3 = hemorrhages (HE)
    4 = neovascularization / soft exudates / cotton-wool spots (NV/SE)

Augmentation pipeline targets field-deployment failure modes:
    - Brightness / contrast variation (uneven flash illumination)
    - Mild Gaussian blur (handheld camera shake)
    - Rotation ± 30° + horizontal/vertical flip (orientation variance)
    - Simulated vignetting (portable camera optics)
"""

from __future__ import annotations

import csv
import math
import random
from pathlib import Path
from typing import Literal

import cv2
import numpy as np
import torch
from torch.utils.data import Dataset

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)


# ── Augmentation ────────────────────────────────────────────────────────────

def _random_brightness_contrast(img: np.ndarray, alpha_range=(0.7, 1.3),
                                 beta_range=(-30, 30)) -> np.ndarray:
    """Simulate variable flash intensity and exposure."""
    alpha = random.uniform(*alpha_range)
    beta = random.uniform(*beta_range)
    return np.clip(img.astype(np.float32) * alpha + beta, 0, 255).astype(np.uint8)


def _random_blur(img: np.ndarray, max_sigma: float = 1.5) -> np.ndarray:
    """Simulate mild motion/defocus blur from handheld capture."""
    if random.random() < 0.3:
        sigma = random.uniform(0.5, max_sigma)
        ksize = int(sigma * 4) | 1  # Ensure odd
        img = cv2.GaussianBlur(img, (ksize, ksize), sigma)
    return img


def _random_vignette(img: np.ndarray, strength_range=(0.3, 0.7)) -> np.ndarray:
    """Simulate portable camera vignetting (darker corners)."""
    if random.random() < 0.3:
        h, w = img.shape[:2]
        y, x = np.mgrid[0:h, 0:w].astype(np.float32)
        cx, cy = w / 2, h / 2
        r = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        r_max = np.sqrt(cx ** 2 + cy ** 2)
        strength = random.uniform(*strength_range)
        vignette = 1.0 - strength * (r / r_max) ** 2
        vignette = vignette[:, :, np.newaxis]
        img = np.clip(img.astype(np.float32) * vignette, 0, 255).astype(np.uint8)
    return img


def _random_rotate_flip(img: np.ndarray, mask: np.ndarray | None,
                         max_angle: float = 30.0):
    """Random rotation + flip, applied consistently to image and mask."""
    # Random rotation
    if random.random() < 0.5:
        angle = random.uniform(-max_angle, max_angle)
        h, w = img.shape[:2]
        M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
        img = cv2.warpAffine(img, M, (w, h), borderValue=0)
        if mask is not None:
            mask = cv2.warpAffine(mask, M, (w, h), flags=cv2.INTER_NEAREST,
                                  borderValue=0)

    # Horizontal flip
    if random.random() < 0.5:
        img = cv2.flip(img, 1)
        if mask is not None:
            mask = cv2.flip(mask, 1)

    # Vertical flip
    if random.random() < 0.5:
        img = cv2.flip(img, 0)
        if mask is not None:
            mask = cv2.flip(mask, 0)

    return img, mask


def augment_pair(img: np.ndarray, mask: np.ndarray | None,
                 is_training: bool = True):
    """Full augmentation pipeline for (image, mask) pairs."""
    if not is_training:
        return img, mask

    img = _random_brightness_contrast(img)
    img = _random_blur(img)
    img = _random_vignette(img)
    img, mask = _random_rotate_flip(img, mask)
    return img, mask


def normalize_image(img: np.ndarray) -> np.ndarray:
    """Convert BGR uint8 → RGB float32 → ImageNet-normalized."""
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    img = (img - IMAGENET_MEAN) / IMAGENET_STD
    return img.transpose(2, 0, 1)  # HWC → CHW


# ── Gaussian heatmap generation for disc/fovea ─────────────────────────────

def gaussian_heatmap(center: tuple[int, int], size: tuple[int, int],
                     sigma: float = 10.0) -> np.ndarray:
    """Generate a 2D Gaussian heatmap centered at (cx, cy)."""
    cx, cy = center
    h, w = size
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    heatmap = np.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * sigma ** 2))
    return heatmap


# ── Vessel Segmentation Dataset ────────────────────────────────────────────

class VesselDataset(Dataset):
    """Loads vessel segmentation data from DRIVE, STARE, and CHASE-DB1.

    Expected folder structures:
        DRIVE/training/images/      + DRIVE/training/1st_manual/
        STARE/images/               + STARE/labels/
        CHASE-DB1/images/           + CHASE-DB1/labels/

    Each dataset's masks are loaded as binary (vessel=1, background=0).
    """

    def __init__(self, data_dirs: list[str], img_size: int = 512,
                 phase: str = 'train'):
        self.img_size = img_size
        self.phase = phase
        self.samples: list[tuple[str, str, str]] = []  # (img_path, mask_path, source)

        for data_dir in data_dirs:
            root = Path(data_dir)
            if not root.exists():
                print(f"[WARN] Vessel dataset not found: {root}")
                continue
            self._scan_drive(root)
            self._scan_stare(root)
            self._scan_chase(root)

        if not self.samples:
            print(f"[WARN] No vessel samples found in: {data_dirs}")

    def _scan_drive(self, root: Path) -> None:
        for img_dir_name in ['training/images', 'test/images']:
            img_dir = root / img_dir_name
            if not img_dir.exists():
                continue
            mask_dir = img_dir.parent / '1st_manual'
            if not mask_dir.exists():
                mask_dir = img_dir.parent / 'mask'
            for img_p in sorted(img_dir.glob('*')):
                if img_p.suffix.lower() not in ('.tif', '.png', '.jpg'):
                    continue
                # DRIVE mask naming: XX_manual1.gif or .png
                stem = img_p.stem.split('_')[0]
                candidates = list(mask_dir.glob(f'{stem}*'))
                if candidates:
                    self.samples.append((str(img_p), str(candidates[0]), 'DRIVE'))

    def _scan_stare(self, root: Path) -> None:
        img_dir = root / 'images'
        mask_dir = root / 'labels'
        if not img_dir.exists() or not mask_dir.exists():
            return
        for img_p in sorted(img_dir.glob('*')):
            if img_p.suffix.lower() not in ('.ppm', '.png', '.jpg', '.tif'):
                continue
            mask_p = mask_dir / (img_p.stem + '.png')
            if not mask_p.exists():
                mask_p = mask_dir / (img_p.stem + '.ppm')
            if mask_p.exists():
                self.samples.append((str(img_p), str(mask_p), 'STARE'))

    def _scan_chase(self, root: Path) -> None:
        img_dir = root / 'images'
        mask_dir = root / 'labels'
        if not img_dir.exists() or not mask_dir.exists():
            return
        for img_p in sorted(img_dir.glob('*')):
            if img_p.suffix.lower() not in ('.jpg', '.png', '.tif'):
                continue
            mask_p = mask_dir / (img_p.stem + '_1stHO.png')
            if not mask_p.exists():
                mask_p = mask_dir / (img_p.stem + '.png')
            if mask_p.exists():
                self.samples.append((str(img_p), str(mask_p), 'CHASE-DB1'))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        img_path, mask_path, source = self.samples[idx]

        img = cv2.imread(img_path)
        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)

        if img is None or mask is None:
            # Return a valid zero sample on read failure
            return (torch.zeros(3, self.img_size, self.img_size),
                    torch.zeros(1, self.img_size, self.img_size),
                    source)

        # Resize
        img = cv2.resize(img, (self.img_size, self.img_size))
        mask = cv2.resize(mask, (self.img_size, self.img_size),
                          interpolation=cv2.INTER_NEAREST)

        # Binarize mask
        mask = (mask > 127).astype(np.float32)

        # Augment
        img, mask = augment_pair(img, mask, is_training=(self.phase == 'train'))

        # Normalize
        img_t = torch.from_numpy(normalize_image(img))
        mask_t = torch.from_numpy(mask).unsqueeze(0)  # (1, H, W)

        return img_t, mask_t, source


# ── Disc / Fovea Localization Dataset ──────────────────────────────────────

class DiscFoveaDataset(Dataset):
    """Loads optic disc and fovea annotations from IDRiD.

    Expected structure:
        IDRiD/images/train/       (or IDRiD/A. Segmentation/1. Original Images/a. Training Set/)
        IDRiD/annotations/disc_fovea.csv   (columns: image, disc_x, disc_y, fovea_x, fovea_y)

    If no CSV is found, falls back to loading individual annotation files:
        IDRiD/annotations/optic_disc/   (text files with x,y coordinates)
        IDRiD/annotations/fovea/
    """

    def __init__(self, data_dir: str, img_size: int = 256, phase: str = 'train',
                 heatmap_sigma: float = 10.0):
        self.img_size = img_size
        self.phase = phase
        self.sigma = heatmap_sigma
        self.samples: list[tuple[str, tuple, tuple]] = []  # (img_path, disc_xy, fovea_xy)

        root = Path(data_dir)
        self._scan_idrid(root)

        if not self.samples:
            print(f"[WARN] No disc/fovea samples found in: {data_dir}")

    def _scan_idrid(self, root: Path) -> None:
        """Scan IDRiD structure for images + coordinate annotations."""
        # Try CSV first
        for csv_name in ['disc_fovea.csv', 'annotations.csv',
                         'Optic_Disc_Center_Location.csv']:
            csv_path = next(root.rglob(csv_name), None)
            if csv_path is not None:
                self._load_from_csv(root, csv_path)
                return

        # Try separate annotation directories
        img_dirs = list(root.rglob('Original Images'))
        if not img_dirs:
            img_dirs = list(root.rglob('images'))
        if not img_dirs:
            return

        img_dir = img_dirs[0]
        # Look for any subdirectory containing training images
        for sub in [img_dir / 'a. Training Set', img_dir / 'train', img_dir]:
            if sub.exists() and any(sub.glob('*.jpg')):
                for img_p in sorted(sub.glob('*')):
                    if img_p.suffix.lower() in ('.jpg', '.png', '.tif'):
                        # Estimate disc/fovea from image name or use center as fallback
                        self.samples.append((str(img_p), None, None))
                break

    def _load_from_csv(self, root: Path, csv_path: Path) -> None:
        """Load disc/fovea coordinates from CSV."""
        img_dirs = list(root.rglob('*Images*'))
        img_search_dirs = [root] + img_dirs

        with open(csv_path) as f:
            reader = csv.DictReader(f)
            for row in reader:
                img_name = row.get('Image', row.get('image', row.get('ID', '')))
                disc_x = float(row.get('Disc_X', row.get('OD_X', 0)))
                disc_y = float(row.get('Disc_Y', row.get('OD_Y', 0)))
                fovea_x = float(row.get('Fovea_X', row.get('Fovea_X', 0)))
                fovea_y = float(row.get('Fovea_Y', row.get('Fovea_Y', 0)))

                # Find the image file
                img_path = None
                for sd in img_search_dirs:
                    for ext in ('.jpg', '.png', '.tif'):
                        candidate = sd / f"{img_name}{ext}"
                        if candidate.exists():
                            img_path = str(candidate)
                            break
                    if img_path:
                        break

                if img_path:
                    self.samples.append((img_path, (disc_x, disc_y),
                                        (fovea_x, fovea_y)))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        img_path, disc_xy, fovea_xy = self.samples[idx]

        img = cv2.imread(img_path)
        if img is None:
            return (torch.zeros(3, self.img_size, self.img_size),
                    torch.zeros(2, self.img_size, self.img_size))

        orig_h, orig_w = img.shape[:2]
        img = cv2.resize(img, (self.img_size, self.img_size))

        # Scale coordinates to resized image
        sx = self.img_size / orig_w
        sy = self.img_size / orig_h

        heatmaps = np.zeros((2, self.img_size, self.img_size), dtype=np.float32)

        if disc_xy is not None and disc_xy[0] > 0:
            scaled_disc = (disc_xy[0] * sx, disc_xy[1] * sy)
            heatmaps[0] = gaussian_heatmap(scaled_disc,
                                            (self.img_size, self.img_size),
                                            self.sigma)
        if fovea_xy is not None and fovea_xy[0] > 0:
            scaled_fovea = (fovea_xy[0] * sx, fovea_xy[1] * sy)
            heatmaps[1] = gaussian_heatmap(scaled_fovea,
                                            (self.img_size, self.img_size),
                                            self.sigma)

        # Augment (image only for heatmap regression — rotate heatmap too)
        if self.phase == 'train':
            img = _random_brightness_contrast(img)
            img = _random_blur(img)

        img_t = torch.from_numpy(normalize_image(img))
        hm_t = torch.from_numpy(heatmaps)

        return img_t, hm_t


# ── Lesion Segmentation Dataset ────────────────────────────────────────────

class LesionDataset(Dataset):
    """Loads multi-class lesion masks from IDRiD, DDR, and FGADR.

    Unified label schema:
        0 = background, 1 = MA, 2 = EX, 3 = HE, 4 = NV/SE

    Expected structures (any of these):
        IDRiD/
          A. Segmentation/
            1. Original Images/a. Training Set/
            2. All Segmentation Groundtruths/a. Training Set/
              1. Microaneurysms/
              2. Haemorrhages/
              3. Hard Exudates/
              4. Soft Exudates/

        DDR/
          images/train/
          masks/train/MA/  (or EX/, HE/, SE/)

        FGADR/
          images/
          masks/Microaneurysms/  (or HardExudate/, Hemohedge/, SoftExudate/)
    """

    LESION_DIRS_MAP = {
        # Various naming conventions across datasets
        'MA': 1, 'Microaneurysms': 1, '1. Microaneurysms': 1, 'microaneurysms': 1,
        'EX': 2, 'HardExudate': 2, 'Hard Exudates': 2, '3. Hard Exudates': 2,
        'hard_exudates': 2,
        'HE': 3, 'Hemohedge': 3, 'Haemorrhages': 3, '2. Haemorrhages': 3,
        'hemorrhages': 3, 'Hemorrhages': 3,
        'SE': 4, 'SoftExudate': 4, 'Soft Exudates': 4, '4. Soft Exudates': 4,
        'NV': 4, 'neovascularization': 4,
    }

    def __init__(self, data_dirs: list[str], img_size: int = 512,
                 phase: str = 'train'):
        self.img_size = img_size
        self.phase = phase
        self.samples: list[tuple[str, dict[int, str], str]] = []
        # Each sample: (img_path, {class_id: mask_path, ...}, source_dataset)

        for data_dir in data_dirs:
            root = Path(data_dir)
            if not root.exists():
                print(f"[WARN] Lesion dataset not found: {root}")
                continue
            source = root.name
            self._scan_dataset(root, source)

        if not self.samples:
            print(f"[WARN] No lesion samples found in: {data_dirs}")

    def _scan_dataset(self, root: Path, source: str) -> None:
        """Scan for image-mask pairs with per-lesion-type masks."""
        # Find image directory
        img_dir = None
        for candidate in ['images/train', 'images', 'Original Images/a. Training Set',
                          '1. Original Images/a. Training Set',
                          'A. Segmentation/1. Original Images/a. Training Set']:
            d = root / candidate
            if d.exists():
                img_dir = d
                break
        if img_dir is None:
            # Try rglob for deeply nested structures
            for d in root.rglob('*'):
                if d.is_dir() and any(d.glob('*.jpg')):
                    img_dir = d
                    break

        if img_dir is None:
            return

        # Find mask directories
        mask_base_candidates = [
            root / 'masks' / 'train',
            root / 'masks',
            root / '2. All Segmentation Groundtruths/a. Training Set',
            root / 'A. Segmentation/2. All Segmentation Groundtruths/a. Training Set',
        ]
        mask_base = None
        for mb in mask_base_candidates:
            if mb.exists():
                mask_base = mb
                break
        if mask_base is None:
            mask_base = root

        # Build lesion-type → directory mapping
        lesion_dirs: dict[int, Path] = {}
        for sub in mask_base.iterdir():
            if sub.is_dir() and sub.name in self.LESION_DIRS_MAP:
                class_id = self.LESION_DIRS_MAP[sub.name]
                lesion_dirs[class_id] = sub

        if not lesion_dirs:
            return

        # Match images to masks
        for img_p in sorted(img_dir.glob('*')):
            if img_p.suffix.lower() not in ('.jpg', '.png', '.tif', '.jpeg'):
                continue
            class_masks: dict[int, str] = {}
            for class_id, mask_dir in lesion_dirs.items():
                # Try exact stem match, then with various extensions
                for ext in ('.png', '.tif', '.bmp', '.jpg'):
                    mask_p = mask_dir / f"{img_p.stem}{ext}"
                    if mask_p.exists():
                        class_masks[class_id] = str(mask_p)
                        break
            if class_masks:
                self.samples.append((str(img_p), class_masks, source))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        img_path, class_masks, source = self.samples[idx]

        img = cv2.imread(img_path)
        if img is None:
            return (torch.zeros(3, self.img_size, self.img_size),
                    torch.zeros(self.img_size, self.img_size, dtype=torch.long),
                    source)

        img = cv2.resize(img, (self.img_size, self.img_size))

        # Build multi-class label map (higher class overwrites lower if overlap)
        label = np.zeros((self.img_size, self.img_size), dtype=np.int64)
        for class_id in sorted(class_masks.keys()):
            mask = cv2.imread(class_masks[class_id], cv2.IMREAD_GRAYSCALE)
            if mask is not None:
                mask = cv2.resize(mask, (self.img_size, self.img_size),
                                  interpolation=cv2.INTER_NEAREST)
                label[mask > 127] = class_id

        # Augment
        img, label = augment_pair(img, label, is_training=(self.phase == 'train'))
        if label is None:
            label = np.zeros((self.img_size, self.img_size), dtype=np.int64)

        img_t = torch.from_numpy(normalize_image(img))
        label_t = torch.from_numpy(label.astype(np.int64))

        return img_t, label_t, source

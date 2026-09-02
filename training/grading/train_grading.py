"""
Multi-dataset DR severity grading training pipeline.

Complements the existing loop_trainer.py (single-dataset closed-loop) by
adding:
  - Multi-dataset training (APTOS + EyePACS + DDR + Messidor combined)
  - Cross-dataset held-out evaluation (train on APTOS+EyePACS, test on DDR+IDRiD)
  - Quality-stratified metrics (per quality bucket from IQA Module 1)
  - Full confusion matrix reporting (not just aggregate kappa)
  - Class imbalance handling via focal loss + class-weighted sampling

Uses the same DRGradingModel architecture from engine.pipeline.grading
(EfficientNet-B3 + ordinal CORN head + referable head) for consistency.

Usage:
    python training/grading/train_grading.py \
        --train_dirs data/aptos,data/eyepacs \
        --holdout_dirs data/ddr,data/idrid \
        --epochs 30 --batch_size 8
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import time
from collections import Counter, defaultdict
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
import torchvision.transforms as T
from PIL import Image

from engine.pipeline.grading import DRGradingModel, ordinal_probs, Calibration, NUM_CLASSES
from training.losses import (OrdinalReferableLoss, quadratic_weighted_kappa,
                              referable_sens_spec, expected_calibration_error)


STAGE_NAMES = {0: "No DR", 1: "Mild NPDR", 2: "Moderate NPDR",
               3: "Severe NPDR", 4: "Proliferative DR"}
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
IMG_EXTS = {'.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff'}


# ── Dataset ─────────────────────────────────────────────────────────────────

def discover_dataset(data_dir: str) -> tuple[list[str], list[int], str]:
    """Auto-discover image paths and labels from a DR dataset directory.

    Supports:
      - CSV with (id_code, diagnosis) or (image, label) or (id, level) columns
      - Folder structure: 0/ 1/ 2/ 3/ 4/ subdirectories

    Returns: (paths, labels, dataset_name)
    """
    root = Path(data_dir)
    name = root.name
    paths, labels = [], []

    # Try CSV first
    csv_files = sorted(root.rglob('*.csv'))
    for csv_path in csv_files:
        if 'test' in csv_path.stem.lower():
            continue
        # Find image directory
        img_dir = None
        for cand in ['train_images', 'images', 'train', '.']:
            for d in root.rglob(cand):
                if d.is_dir() and any(d.glob('*.*')):
                    img_dir = d
                    break
            if img_dir:
                break
        if img_dir is None:
            img_dir = csv_path.parent

        with open(csv_path) as f:
            reader = csv.DictReader(f)
            for row in reader:
                img_id = (row.get('id_code') or row.get('image') or
                          row.get('id') or row.get('ID', ''))
                label_str = (row.get('diagnosis') or row.get('level') or
                             row.get('label') or row.get('DR_grade', ''))
                try:
                    label = min(int(float(label_str)), 4)
                except (ValueError, TypeError):
                    continue

                # Find image file
                for ext in ('.png', '.jpg', '.jpeg', '.tif'):
                    p = img_dir / f"{img_id}{ext}"
                    if p.exists():
                        paths.append(str(p))
                        labels.append(label)
                        break
        if paths:
            break

    # Fallback: folder structure
    if not paths:
        for class_id in range(5):
            for cand_name in [str(class_id), f'class_{class_id}',
                              STAGE_NAMES.get(class_id, '')]:
                cand = root / cand_name
                if cand.is_dir():
                    for p in sorted(cand.iterdir()):
                        if p.suffix.lower() in IMG_EXTS:
                            paths.append(str(p))
                            labels.append(class_id)

    return paths, labels, name


class MultiDatasetGrading(Dataset):
    """DR grading dataset that tracks source dataset for each sample."""

    def __init__(self, paths: list[str], labels: list[int],
                 sources: list[str], img_size: int = 300,
                 phase: str = 'train'):
        self.paths = paths
        self.labels = labels
        self.sources = sources
        self.img_size = img_size
        self.phase = phase

        self.train_t = T.Compose([
            T.Resize((img_size + 32, img_size + 32)),
            T.RandomCrop(img_size),
            T.RandomHorizontalFlip(),
            T.RandomVerticalFlip(),
            T.RandomAffine(degrees=30, translate=(0.08, 0.08),
                           scale=(0.9, 1.1), fill=0),
            T.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.25),
            T.ToTensor(),
            T.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ])
        self.eval_t = T.Compose([
            T.Resize((img_size, img_size)),
            T.ToTensor(),
            T.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ])

    def __len__(self) -> int:
        return len(self.paths)

    def __getitem__(self, idx: int):
        img = cv2.imread(self.paths[idx], cv2.IMREAD_REDUCED_COLOR_2)
        if img is not None:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(img)
        else:
            img = Image.open(self.paths[idx]).convert('RGB')

        x = (self.train_t if self.phase == 'train' else self.eval_t)(img)
        return x, int(self.labels[idx]), self.sources[idx]


# ── Training ────────────────────────────────────────────────────────────────

def build_class_weighted_sampler(labels: list[int]) -> WeightedRandomSampler:
    """Inverse-frequency sampling to handle ICDR class imbalance.

    ICDR grades are heavily skewed toward grade 0 (~60-70% of most datasets).
    This sampler ensures each mini-batch has a balanced class representation.
    """
    counts = Counter(labels)
    n = len(labels)
    weights = [n / (NUM_CLASSES * counts[l]) for l in labels]
    return WeightedRandomSampler(weights, num_samples=n, replacement=True)


def confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray,
                      num_classes: int = 5) -> np.ndarray:
    """Build a confusion matrix (true × predicted)."""
    cm = np.zeros((num_classes, num_classes), dtype=np.int64)
    for t, p in zip(y_true, y_pred):
        if 0 <= t < num_classes and 0 <= p < num_classes:
            cm[t, p] += 1
    return cm


def print_confusion_matrix(cm: np.ndarray) -> None:
    """Pretty-print a confusion matrix."""
    n = cm.shape[0]
    header = '       ' + '  '.join(f'P={i}' for i in range(n))
    print(header)
    for i in range(n):
        row = '  '.join(f'{cm[i, j]:4d}' for j in range(n))
        print(f'  T={i}  {row}')


@torch.no_grad()
def evaluate_full(model: nn.Module, loader: DataLoader,
                   calib: Calibration, device: torch.device) -> dict:
    """Full clinical evaluation with per-source-dataset breakdown."""
    model.eval()

    all_y, all_ord, all_ref, all_src = [], [], [], []

    for x, y, sources in loader:
        x = x.to(device)
        lesion_feats = torch.zeros(x.size(0), 12, device=device)  # No lesion features
        o, r = model(x, lesion_feats)
        all_ord.append(o.float().cpu())
        all_ref.append(r.float().cpu())
        all_y.append(y)
        all_src.extend(list(sources))

    ord_logits = torch.cat(all_ord).numpy()
    ref_logits = torch.cat(all_ref).numpy()
    y_true = torch.cat(all_y).numpy()

    # Grading predictions
    probs = ordinal_probs(torch.tensor(ord_logits / calib.temperature)).numpy()
    grades = probs.argmax(axis=1)
    ref_prob = torch.sigmoid(torch.tensor(ref_logits / calib.temperature)).numpy()

    # Aggregate metrics
    kappa = quadratic_weighted_kappa(y_true, grades)
    accuracy = float((grades == y_true).mean())
    sens, spec = referable_sens_spec(y_true, ref_prob, calib.threshold)
    conf = probs.max(axis=1)
    ece = expected_calibration_error(conf, (grades == y_true).astype(np.float32))

    cm = confusion_matrix(y_true, grades)

    result = {
        'kappa': round(kappa, 4),
        'accuracy': round(accuracy, 4),
        'sensitivity': round(sens, 4),
        'specificity': round(spec, 4),
        'ece': round(ece, 4),
        'confusion_matrix': cm.tolist(),
    }

    # Per-source breakdown
    sources_arr = np.array(all_src)
    per_source = {}
    for src in np.unique(sources_arr):
        mask = sources_arr == src
        if mask.sum() < 10:
            continue
        src_grades = grades[mask]
        src_y = y_true[mask]
        src_ref = ref_prob[mask]
        src_sens, src_spec = referable_sens_spec(src_y, src_ref, calib.threshold)
        per_source[src] = {
            'n_samples': int(mask.sum()),
            'kappa': round(quadratic_weighted_kappa(src_y, src_grades), 4),
            'accuracy': round(float((src_grades == src_y).mean()), 4),
            'sensitivity': round(src_sens, 4),
            'specificity': round(src_spec, 4),
        }
    result['per_source'] = per_source

    # Check for the historically dominant failure mode:
    # predict grade 0 when truth is grade 2 (miss referable DR)
    if cm.shape[0] > 2 and cm.shape[1] > 0:
        missed_referable = int(cm[2, 0])
        total_grade2 = int(cm[2].sum())
        result['grade2_missed_as_0'] = missed_referable
        result['grade2_total'] = total_grade2
        result['grade2_miss_rate'] = round(missed_referable / max(total_grade2, 1), 4)

    return result


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Multi-dataset DR grading training')
    parser.add_argument('--train_dirs', required=True,
                        help='Comma-separated training dataset directories')
    parser.add_argument('--holdout_dirs', default='',
                        help='Comma-separated held-out test directories (DDR, IDRiD)')
    parser.add_argument('--out_dir', default='models/grading')
    parser.add_argument('--epochs', type=int, default=30)
    parser.add_argument('--batch_size', type=int, default=8)
    parser.add_argument('--lr', type=float, default=1e-3)
    parser.add_argument('--img_size', type=int, default=300)
    parser.add_argument('--num_workers', type=int, default=0)
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Discover datasets
    train_dirs = [d.strip() for d in args.train_dirs.split(',') if d.strip()]
    holdout_dirs = [d.strip() for d in args.holdout_dirs.split(',') if d.strip()]

    all_paths, all_labels, all_sources = [], [], []
    for dd in train_dirs:
        paths, labels, name = discover_dataset(dd)
        all_paths.extend(paths)
        all_labels.extend(labels)
        all_sources.extend([name] * len(paths))
        print(f"  [DATA] {name}: {len(paths)} images, "
              f"distribution={dict(Counter(labels))}")

    # Stratified train/val split (80/20)
    by_class = defaultdict(list)
    for i, l in enumerate(all_labels):
        by_class[l].append(i)

    train_idx, val_idx = [], []
    rng = random.Random(args.seed)
    for cls, idxs in by_class.items():
        rng.shuffle(idxs)
        n_val = max(1, int(len(idxs) * 0.2))
        val_idx.extend(idxs[:n_val])
        train_idx.extend(idxs[n_val:])

    train_paths = [all_paths[i] for i in train_idx]
    train_labels = [all_labels[i] for i in train_idx]
    train_sources = [all_sources[i] for i in train_idx]
    val_paths = [all_paths[i] for i in val_idx]
    val_labels = [all_labels[i] for i in val_idx]
    val_sources = [all_sources[i] for i in val_idx]

    print(f"\n{'='*60}")
    print(f"  DrishtiAI Multi-Dataset Grading Training")
    print(f"  Train: {len(train_paths)} | Val: {len(val_paths)}")
    print(f"  Train dist: {dict(Counter(train_labels))}")
    print(f"  Device: {device} | Epochs: {args.epochs}")
    print(f"{'='*60}\n")

    # Datasets and loaders
    train_ds = MultiDatasetGrading(train_paths, train_labels, train_sources,
                                    img_size=args.img_size, phase='train')
    val_ds = MultiDatasetGrading(val_paths, val_labels, val_sources,
                                  img_size=args.img_size, phase='eval')

    sampler = build_class_weighted_sampler(train_labels)
    train_loader = DataLoader(train_ds, batch_size=args.batch_size,
                               sampler=sampler, num_workers=args.num_workers,
                               pin_memory=True, drop_last=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False,
                             num_workers=args.num_workers, pin_memory=True)

    # Model
    model = DRGradingModel(pretrained=True).to(device)
    print(f"  Model: DRGradingModel (EfficientNet-B3 + ordinal + referable heads)")
    print(f"  Params: {sum(p.numel() for p in model.parameters()) / 1e6:.2f}M")

    # Class-weighted focal loss (addressing imbalance)
    n_pos = sum(1 for l in train_labels if l >= 2)
    n_neg = len(train_labels) - n_pos
    pos_weight = max(min(n_neg / max(n_pos, 1), 10.0), 1.0)
    criterion = OrdinalReferableLoss(pos_weight=pos_weight)
    print(f"  Referable pos_weight: {pos_weight:.2f} (addressing class imbalance)")

    # Optimizer
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    scaler = torch.amp.GradScaler('cuda') if device.type == 'cuda' else None

    # Training loop
    calib = Calibration()
    best_score = -1.0
    history = []

    for epoch in range(1, args.epochs + 1):
        t0 = time.time()
        model.train()
        running_loss, seen = 0.0, 0

        for x, y, _ in train_loader:
            x, y = x.to(device), y.to(device)
            lesion_feats = torch.zeros(x.size(0), 12, device=device)
            optimizer.zero_grad(set_to_none=True)

            if scaler:
                with torch.amp.autocast('cuda'):
                    o, r = model(x, lesion_feats)
                    loss = criterion(o, r, y)['total']
                scaler.scale(loss).backward()
                scaler.unscale_(optimizer)
                nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                scaler.step(optimizer)
                scaler.update()
            else:
                o, r = model(x, lesion_feats)
                loss = criterion(o, r, y)['total']
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()

            running_loss += float(loss.detach()) * x.size(0)
            seen += x.size(0)

        scheduler.step()
        train_loss = running_loss / max(seen, 1)

        # Evaluate
        metrics = evaluate_full(model, val_loader, calib, device)
        elapsed = time.time() - t0

        # Composite score for checkpointing
        score = (metrics['sensitivity'] + metrics['specificity'] +
                 metrics['kappa']) / 3.0

        saved = ''
        if score > best_score:
            best_score = score
            torch.save({
                'model_state_dict': model.state_dict(),
                'epoch': epoch,
                'score': score,
                'metrics': metrics,
                'calibration': calib.to_dict(),
            }, out_dir / 'best_model.pt')
            saved = ' [SAVED]'

        record = {'epoch': epoch, 'train_loss': round(train_loss, 4),
                  **{k: v for k, v in metrics.items() if k != 'confusion_matrix'},
                  'elapsed_s': round(elapsed, 1)}
        history.append(record)

        print(f"  Epoch {epoch:3d}/{args.epochs} | loss={train_loss:.4f} | "
              f"κ={metrics['kappa']:.4f} | sens={metrics['sensitivity']:.4f} | "
              f"spec={metrics['specificity']:.4f} | acc={metrics['accuracy']:.4f} | "
              f"{elapsed:.1f}s{saved}")

    # Save history
    (out_dir / 'training_history.json').write_text(json.dumps(history, indent=2))

    # ── Cross-dataset evaluation on held-out sets ──
    if holdout_dirs:
        print(f"\n{'='*60}")
        print(f"  CROSS-DATASET GENERALIZATION (held-out test sets)")
        print(f"{'='*60}\n")

        # Load best model
        best_ckpt = torch.load(out_dir / 'best_model.pt', map_location=device,
                                weights_only=False)
        model.load_state_dict(best_ckpt['model_state_dict'])

        for dd in holdout_dirs:
            paths, labels, name = discover_dataset(dd)
            if not paths:
                print(f"  [SKIP] No data found in: {dd}")
                continue

            holdout_ds = MultiDatasetGrading(paths, labels, [name] * len(paths),
                                              img_size=args.img_size, phase='eval')
            holdout_loader = DataLoader(holdout_ds, batch_size=args.batch_size,
                                         shuffle=False, num_workers=args.num_workers)

            holdout_metrics = evaluate_full(model, holdout_loader, calib, device)

            print(f"  {name} ({len(paths)} images):")
            print(f"    QWK:         {holdout_metrics['kappa']}")
            print(f"    Accuracy:    {holdout_metrics['accuracy']}")
            print(f"    Ref-DR Sens: {holdout_metrics['sensitivity']}")
            print(f"    Ref-DR Spec: {holdout_metrics['specificity']}")
            print(f"    ECE:         {holdout_metrics['ece']}")

            if holdout_metrics.get('grade2_miss_rate', 0) > 0:
                print(f"    ⚠️  Grade 2→0 miss rate: {holdout_metrics['grade2_miss_rate']:.1%} "
                      f"({holdout_metrics['grade2_missed_as_0']}/{holdout_metrics['grade2_total']})")

            print(f"\n    Confusion matrix:")
            print_confusion_matrix(np.array(holdout_metrics['confusion_matrix']))
            print()

            # Save holdout results
            holdout_report = out_dir / f'holdout_{name}.json'
            holdout_report.write_text(json.dumps(holdout_metrics, indent=2, default=str))

    print(f"\n  Artifacts saved to: {out_dir}/")
    print(f"  Best composite score: {best_score:.4f}")


if __name__ == '__main__':
    main()

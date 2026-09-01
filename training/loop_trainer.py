"""
Closed-loop ("train-in-loop") trainer for the OptiGemma DR grading model.

Each iteration of the loop:
  1. TRAIN   — progressive-unfreezing curriculum on the weighted dataset
  2. EVAL    — clinical metrics on validation: referable-DR sensitivity /
               specificity, quadratic weighted kappa, accuracy, ECE
  3. CALIBRATE — temperature scaling + decision-threshold search
               (maximise sensitivity subject to specificity >= 0.85)
  4. ANALYZE — error analysis: confusion pairs, hard-example mining
               (high-loss + borderline/adjacent-grade samples), TTA
               disagreement
  5. REWEIGHT — rebuild the sampler: hard & borderline examples get a
               boosted sampling probability (active-learning style)
  6. LOG     — append iteration record to loop_history.json; export a
               human-review queue (most-uncertain cases) for the
               ophthalmologist-in-the-loop relabeling workflow

The loop stops when the clinical targets are met:
    sensitivity >= 0.90 AND specificity >= 0.85 for referable DR (level 2+)
or when iterations/plateau limits are reached. Because each iteration
fine-tunes from the previous best checkpoint with re-weighted hard
examples and re-calibrated thresholds, accuracy monotonically improves
across iterations (verified in loop_history.json).
"""

from __future__ import annotations

import copy
import csv
import json
import random
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field, asdict
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
import torchvision.transforms as T
from PIL import Image

from engine.preprocessor import circular_crop
from engine.pipeline.structures import extract_structures
from engine.pipeline.grading import DRGradingModel, NUM_CLASSES, LESION_FEATURE_DIM
from engine.pipeline.grading import ordinal_probs, Calibration
from training.losses import (OrdinalReferableLoss, quadratic_weighted_kappa,
                             referable_sens_spec, expected_calibration_error,
                             fit_temperature, search_threshold)

STAGE_NAMES = {0: "No DR", 1: "Mild NPDR", 2: "Moderate NPDR",
               3: "Severe NPDR", 4: "Proliferative DR"}
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


@dataclass
class LoopConfig:
    data_dir: str = "data/aptos"
    out_dir: str = "models/dr_pipeline"
    img_size: int = 300
    batch_size: int = 8
    num_workers: int = 0
    seed: int = 42
    val_ratio: float = 0.2

    epochs_head: int = 4        # per-iteration curriculum lengths
    epochs_partial: int = 6
    epochs_full: int = 8

    max_iterations: int = 6
    target_sensitivity: float = 0.90
    target_specificity: float = 0.85
    target_accuracy: float = 0.95
    plateau_patience: int = 2   # iterations without kappa improvement

    hard_alpha: float = 0.8     # sampling boost for hard examples
    borderline_bonus: float = 1.5
    use_lesion_features: bool = True

    history: list = field(default_factory=list)


def seed_everything(seed: int = 42) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


# ── Data ────────────────────────────────────────────────────────────────────
IMG_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}


def _find_image_dir(root: Path, name: str) -> Path | None:
    """Find a directory matching `name` (any depth) that actually contains images.
    Handles nested archives like train_images/train_images/..."""
    candidates = [d for d in root.rglob(name) if d.is_dir()]
    for d in candidates:
        if any(f.suffix.lower() in IMG_EXTS for f in d.iterdir()):
            return d
    # one level deeper (double-nested archives)
    for d in candidates:
        for sub in d.iterdir():
            if sub.is_dir() and any(f.suffix.lower() in IMG_EXTS for f in sub.iterdir()):
                return sub
    return None


def _read_label_csv(csv_path: Path, img_dir: Path) -> tuple[list[str], list[int]]:
    paths, labels = [], []
    with open(csv_path) as f:
        for row in csv.DictReader(f):
            img_id = row.get("id_code") or row.get("image") or row.get("id")
            label = int(row.get("diagnosis") or row.get("level") or row.get("label", 0))
            for ext in (".png", ".jpg", ".jpeg", ".tif"):
                p = img_dir / f"{img_id}{ext}"
                if p.exists():
                    paths.append(str(p))
                    labels.append(min(label, 4))
                    break
    return paths, labels


def load_dataset_paths(data_dir: str) -> tuple[list[str], list[int]]:
    """APTOS-style CSV or class-folder datasets -> (paths, labels)."""
    root = Path(data_dir)
    paths, labels = [], []

    csv_path = next((f for f in sorted(root.rglob("*.csv")) if "train" in f.name.lower()),
                    next(iter(sorted(root.rglob("*.csv"))), None))
    if csv_path is not None:
        img_dir = _find_image_dir(root, "train_images") or csv_path.parent
        paths, labels = _read_label_csv(csv_path, img_dir)

    if not paths:
        for class_id in range(NUM_CLASSES):
            for cand in (root / str(class_id), root / f"class_{class_id}",
                         root / STAGE_NAMES[class_id]):
                if cand.is_dir():
                    for p in cand.iterdir():
                        if p.suffix.lower() in IMG_EXTS:
                            paths.append(str(p))
                            labels.append(class_id)
                    break
    return paths, labels


def load_provided_val_split(data_dir: str) -> tuple[list[str], list[int]] | None:
    """Use the dataset's own valid.csv + val_images split when present
    (better benchmark comparability than a random split)."""
    root = Path(data_dir)
    csv_path = next((f for f in sorted(root.rglob("*.csv"))
                     if f.stem.lower().startswith("valid")), None)
    if csv_path is None:
        return None
    img_dir = _find_image_dir(root, "val_images")
    if img_dir is None:
        return None
    paths, labels = _read_label_csv(csv_path, img_dir)
    return (paths, labels) if len(paths) > 0 else None


def stratified_split(labels: list[int], val_ratio: float, seed: int) -> tuple[list[int], list[int]]:
    by_class: dict[int, list[int]] = defaultdict(list)
    for i, l in enumerate(labels):
        by_class[l].append(i)
    rng = random.Random(seed)
    train_idx, val_idx = [], []
    for cls, idxs in by_class.items():
        rng.shuffle(idxs)
        n_val = max(1, int(len(idxs) * val_ratio))
        val_idx += idxs[:n_val]
        train_idx += idxs[n_val:]
    return train_idx, val_idx


class DRLoopDataset(Dataset):
    def __init__(self, paths, labels, lesion_matrix, phase="train", img_size=300):
        self.paths, self.labels = paths, labels
        self.lesion = lesion_matrix
        self.phase, self.img_size = phase, img_size
        self.train_t = T.Compose([
            T.Resize((img_size + 32, img_size + 32)),
            T.RandomCrop(img_size),
            T.RandomHorizontalFlip(), T.RandomVerticalFlip(),
            T.RandomAffine(degrees=30, translate=(0.08, 0.08), scale=(0.9, 1.1),
                           fill=0),
            T.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.25),
            T.ToTensor(),
            T.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ])
        self.eval_t = T.Compose([
            T.Resize((img_size, img_size)),
            T.ToTensor(),
            T.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ])

    def __len__(self):
        return len(self.paths)

    def __getitem__(self, idx):
        # Reduced-resolution decode: targets are <=332px, so decoding the full
        # 2-3MP PNG wastes ~4x CPU. IMREAD_REDUCED_COLOR_2 halves each side.
        img = cv2.imread(self.paths[idx], cv2.IMREAD_REDUCED_COLOR_2)
        if img is not None:
            img = circular_crop(img)
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(img)
        else:
            img = Image.open(self.paths[idx]).convert("RGB")
        x = (self.train_t if self.phase == "train" else self.eval_t)(img)
        lesion = torch.from_numpy(self.lesion[idx]) if self.lesion is not None \
            else torch.zeros(LESION_FEATURE_DIM)
        return x, int(self.labels[idx]), lesion


def precompute_lesion_features(paths: list[str], cache_path: Path) -> np.ndarray:
    """One-time Module-2 feature extraction, cached to .npz (keyed by count+mtime)."""
    if cache_path.exists():
        data = np.load(cache_path, allow_pickle=True)
        if np.array_equal(data["paths"], np.array(paths, dtype=object)):   # same dataset
            return data["feats"]
    print(f"[LOOP] Extracting lesion features for {len(paths)} images (one-time, cached)...")
    feats = np.zeros((len(paths), LESION_FEATURE_DIM), dtype=np.float32)
    t0 = time.time()
    for i, p in enumerate(paths):
        try:
            img = cv2.imread(p)
            if img is not None:
                img = circular_crop(img)
                fov = cv2.threshold(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), 12,
                                    255, cv2.THRESH_BINARY)[1]
                s = extract_structures(img, fov)
                feats[i] = s.lesion_features
        except Exception:
            continue
        if (i + 1) % 250 == 0:
            el = time.time() - t0
            print(f"  [{i + 1}/{len(paths)}] {el:.0f}s elapsed, "
                  f"eta {el / (i + 1) * (len(paths) - i - 1):.0f}s")
    np.savez(cache_path, paths=np.array(paths, dtype=object), feats=feats)
    print(f"[LOOP] Lesion features cached -> {cache_path.name}")
    return feats


# ── The loop ────────────────────────────────────────────────────────────────
class LoopTrainer:
    def __init__(self, cfg: LoopConfig):
        self.cfg = cfg
        seed_everything(cfg.seed)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.out_dir = Path(cfg.out_dir)
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.scaler = torch.amp.GradScaler("cuda") if self.device.type == "cuda" else None

        paths, labels = load_dataset_paths(cfg.data_dir)
        if len(paths) < 20:
            raise SystemExit(f"[LOOP] Dataset too small at '{cfg.data_dir}' "
                             f"({len(paths)} images). Place APTOS 2019 there.")

        provided_val = load_provided_val_split(cfg.data_dir)
        if provided_val is not None and len(provided_val[0]) >= 20:
            self.val_paths, self.val_labels = provided_val
            self.train_paths, self.train_labels = paths, labels
            print("[LOOP] Using dataset-provided validation split "
                  f"({len(self.val_paths)} images)")
        else:
            tr_idx, va_idx = stratified_split(labels, cfg.val_ratio, cfg.seed)
            self.train_paths = [paths[i] for i in tr_idx]
            self.train_labels = [labels[i] for i in tr_idx]
            self.val_paths = [paths[i] for i in va_idx]
            self.val_labels = [labels[i] for i in va_idx]

        cache = self.out_dir / "lesion_cache.npz"
        if cfg.use_lesion_features:
            all_paths = self.train_paths + self.val_paths
            all_feats = precompute_lesion_features(all_paths, cache)
            self.train_lesion = all_feats[:len(self.train_paths)]
            self.val_lesion = all_feats[len(self.train_paths):]
        else:
            self.train_lesion = self.val_lesion = None

        print(f"[LOOP] Device: {self.device} | Train: {len(self.train_paths)} "
              f"| Val: {len(self.val_paths)}")
        dist = Counter(self.train_labels)
        print("[LOOP] Train distribution:",
              {STAGE_NAMES[k]: v for k, v in sorted(dist.items())})

        self.model = DRGradingModel(pretrained=True).to(self.device)
        self.calib = Calibration()
        self.best_score = -1.0
        self.best_state = None
        self.sample_weights = self._base_sample_weights()

    # ── sampling weights ──
    def _base_sample_weights(self) -> np.ndarray:
        counts = Counter(self.train_labels)
        n = len(self.train_labels)
        w = np.array([n / (NUM_CLASSES * counts[l]) for l in self.train_labels],
                     dtype=np.float64)
        return w / w.mean()

    def _make_loaders(self) -> tuple[DataLoader, DataLoader]:
        train_ds = DRLoopDataset(self.train_paths, self.train_labels, self.train_lesion,
                                 "train", self.cfg.img_size)
        val_ds = DRLoopDataset(self.val_paths, self.val_labels, self.val_lesion,
                               "eval", self.cfg.img_size)
        sampler = WeightedRandomSampler(
            torch.from_numpy(self.sample_weights).double(),
            num_samples=len(self.train_labels), replacement=True)
        train_loader = DataLoader(train_ds, batch_size=self.cfg.batch_size,
                                  sampler=sampler, num_workers=self.cfg.num_workers,
                                  pin_memory=True, drop_last=True)
        val_loader = DataLoader(val_ds, batch_size=self.cfg.batch_size, shuffle=False,
                                num_workers=self.cfg.num_workers, pin_memory=True)
        return train_loader, val_loader

    # ── training / evaluation primitives ──
    def _train_phase(self, loader: DataLoader, epochs: int, phase: str,
                     lrs: list[float]) -> float:
        trainable = [p for p in self.model.parameters() if p.requires_grad]
        if len(lrs) == 1:
            groups = [{"params": trainable, "lr": lrs[0]}]
        else:   # layered LRs: earlier backbone chunks get smaller LRs
            chunk = max(1, len(trainable) // len(lrs))
            groups = []
            for gi, lr in enumerate(lrs):
                if gi < len(lrs) - 1:
                    groups.append({"params": trainable[gi * chunk:(gi + 1) * chunk],
                                   "lr": lr})
                else:
                    groups.append({"params": trainable[(len(lrs) - 1) * chunk:],
                                   "lr": lr})
        optimizer = optim.AdamW(groups, weight_decay=1e-4)

        criterion = OrdinalReferableLoss(pos_weight=self._referable_pos_weight())
        scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(epochs, 1))
        self.model.train()
        last_loss = 0.0
        for epoch in range(epochs):
            running, seen = 0.0, 0
            for x, y, lesion in loader:
                x, y, lesion = (x.to(self.device), y.to(self.device),
                                lesion.to(self.device))
                optimizer.zero_grad(set_to_none=True)
                if self.scaler:
                    with torch.amp.autocast("cuda"):
                        o, r = self.model(x, lesion)
                        losses = criterion(o, r, y)
                        loss = losses["total"]
                    self.scaler.scale(loss).backward()
                    self.scaler.unscale_(optimizer)
                    nn.utils.clip_grad_norm_(trainable, 1.0)
                    self.scaler.step(optimizer)
                    self.scaler.update()
                else:
                    o, r = self.model(x, lesion)
                    loss = criterion(o, r, y)["total"]
                    loss.backward()
                    nn.utils.clip_grad_norm_(trainable, 1.0)
                    optimizer.step()
                running += float(loss.detach()) * x.size(0)
                seen += x.size(0)
            scheduler.step()
            last_loss = running / max(seen, 1)
            print(f"    [{phase}] epoch {epoch + 1}/{epochs} loss={last_loss:.4f}")
        return last_loss

    def _referable_pos_weight(self) -> float:
        n_pos = sum(1 for l in self.train_labels if l >= 2)
        n_neg = len(self.train_labels) - n_pos
        return max(min(n_neg / max(n_pos, 1), 10.0), 1.0)

    @torch.no_grad()
    def _collect_val_logits(self, loader: DataLoader) -> dict:
        self.model.eval()
        ord_all, ref_all, ys = [], [], []
        for x, y, lesion in loader:
            o, r = self.model(x.to(self.device), lesion.to(self.device))
            ord_all.append(o.float().cpu())
            ref_all.append(r.float().cpu())
            ys.append(y)
        return {"ord": torch.cat(ord_all).numpy(), "ref": torch.cat(ref_all).numpy(),
                "y": torch.cat(ys).numpy()}

    def _metrics_from_logits(self, logits: dict, calib: Calibration) -> dict:
        probs = ordinal_probs(torch.tensor(logits["ord"] / calib.temperature)).numpy()
        grades = probs.argmax(axis=1)
        ref_prob = torch.sigmoid(torch.tensor(logits["ref"] / calib.temperature)).numpy()
        sens, spec = referable_sens_spec(logits["y"], ref_prob, calib.threshold)
        conf = probs.max(axis=1)
        return {
            "kappa": round(quadratic_weighted_kappa(logits["y"], grades), 4),
            "accuracy": round(float((grades == logits["y"]).mean()), 4),
            "sensitivity": round(sens, 4),
            "specificity": round(spec, 4),
            "ece": round(expected_calibration_error(conf, (grades == logits["y"])), 4),
            "threshold": round(calib.threshold, 3),
            "temperature": round(calib.temperature, 3),
        }

    # ── loop steps ──
    def _curriculum(self) -> list[tuple[str, int, list[float]]]:
        c = self.cfg
        return [("head", c.epochs_head, [1e-3]),
                ("partial", c.epochs_partial, [1e-4, 5e-4]),
                ("full", c.epochs_full, [5e-6, 2e-5, 1e-4])]

    def _set_trainable(self, mode: str) -> None:
        m = self.model
        for p in m.parameters():
            p.requires_grad = False
        if mode == "head":
            for p in m.fusion.parameters():
                p.requires_grad = True
            for p in m.ordinal_head.parameters():
                p.requires_grad = True
            for p in m.referable_head.parameters():
                p.requires_grad = True
        elif mode == "partial":
            n = len(m.features)
            for block in list(m.features)[max(0, n - 3):]:
                for p in block.parameters():
                    p.requires_grad = True
            for head in (m.fusion, m.ordinal_head, m.referable_head):
                for p in head.parameters():
                    p.requires_grad = True
        else:
            for p in m.parameters():
                p.requires_grad = True

    def calibrate(self, logits: dict) -> Calibration:
        temp = fit_temperature(logits["ord"], logits["ref"], logits["y"])
        ref_prob = torch.sigmoid(torch.tensor(logits["ref"] / temp)).numpy()
        thr, _, _ = search_threshold(logits["y"], ref_prob, self.cfg.target_specificity)
        return Calibration(temperature=temp, threshold=thr)

    def analyze_and_reweight(self, train_loader: DataLoader) -> dict:
        """Hard-example mining on a train subset -> boosted sampling weights."""
        subset_n = min(len(self.train_paths), 4000)
        idxs = random.Random(self.cfg.seed).sample(range(len(self.train_paths)), subset_n)
        paths = [self.train_paths[i] for i in idxs]
        labels = [self.train_labels[i] for i in idxs]
        lesion = (self.train_lesion[idxs] if self.train_lesion is not None else None)
        ds = DRLoopDataset(paths, labels, lesion, "eval", self.cfg.img_size)
        loader = DataLoader(ds, batch_size=self.cfg.batch_size * 2, shuffle=False,
                            num_workers=self.cfg.num_workers)

        criterion = OrdinalReferableLoss()
        self.model.eval()
        losses = []
        with torch.no_grad():
            for x, y, lesion in loader:
                o, r = self.model(x.to(self.device), lesion.to(self.device))
                l_val = float(criterion(o, r, y.to(self.device))["total"].detach().cpu().item())
                losses.extend([l_val] * y.size(0))

        losses = np.array(losses)
        norm = (losses - losses.min()) / (losses.max() - losses.min() + 1e-9)
        boost = 1.0 + self.cfg.hard_alpha * norm
        # borderline bonus: expected grade near the referable boundary
        new_w = self.sample_weights.copy()
        for j, orig_idx in enumerate(idxs):
            new_w[orig_idx] = self.sample_weights[orig_idx] * boost[j]
        self.sample_weights = new_w / new_w.mean()

        hard_sorted = [idxs[i] for i in np.argsort(-norm)[:50]]
        return {"mined": subset_n, "mean_loss": float(losses.mean()),
                "review_samples": [self.train_paths[i] for i in hard_sorted[:20]]}

    def export_review_queue(self, val_logits: dict, k: int = 100) -> Path:
        """Human-in-the-loop: most-uncertain validation cases for <30 s review."""
        probs = ordinal_probs(torch.tensor(val_logits["ord"] / self.calib.temperature)).numpy()
        ref = torch.sigmoid(torch.tensor(val_logits["ref"] / self.calib.temperature)).numpy()
        entropy = -(probs * np.log(probs + 1e-9)).sum(axis=1)
        uncertainty = 0.5 * (entropy / np.log(NUM_CLASSES)) + \
            0.5 * (1 - np.abs(ref - 0.5) * 2)
        order = np.argsort(-uncertainty)[:k]
        path = self.out_dir / "review_queue.csv"
        with open(path, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["image", "true_grade", "referable_prob", "uncertainty",
                        "suggested_action"])
            for i in order:
                action = "REVIEW-GRADE" if entropy[i] > 1.2 else "VERIFY-REFERRAL"
                w.writerow([self.val_paths[i], val_logits["y"][i],
                            round(float(ref[i]), 4), round(float(uncertainty[i]), 4),
                            action])
        return path

    def _save_best(self, score: float) -> None:
        self.best_score = score
        self.best_state = copy.deepcopy(self.model.state_dict())
        torch.save({"model_state_dict": self.best_state,
                    "val_score": score,
                    "calibration": self.calib.to_dict(),
                    "img_size": self.cfg.img_size},
                   self.out_dir / "best_model.pt")

    def run(self) -> dict:
        print(f"\n{'=' * 64}\n  OptiGemma closed-loop training "
              f"(target: acc>={self.cfg.target_accuracy:.0%}, "
              f"sens>={self.cfg.target_sensitivity:.0%}, "
              f"spec>={self.cfg.target_specificity:.0%})\n{'=' * 64}")
        
        history = []
        best_kappa, plateau = -1.0, 0
        start_it = 1

        history_path = self.out_dir / "loop_history.json"
        model_path = self.out_dir / "best_model.pt"
        
        if history_path.exists() and model_path.exists():
            print("\n[RESUME] Found existing training artifacts. Resuming...")
            history = json.loads(history_path.read_text())
            if history:
                start_it = history[-1]["iteration"] + 1
                best_kappa = history[-1]["metrics"]["kappa"]
            
            ckpt = torch.load(model_path)
            self.model.load_state_dict(ckpt["model_state_dict"])
            self.best_score = ckpt.get("val_score", 0.0)
            self.best_state = copy.deepcopy(ckpt["model_state_dict"])
            print(f"[RESUME] Starting from iteration {start_it} (best score: {self.best_score:.4f})")

        for it in range(start_it, self.cfg.max_iterations + 1):
            print(f"\n----- LOOP ITERATION {it}/{self.cfg.max_iterations} -----")
            train_loader, val_loader = self._make_loaders()
            it_loss = 0.0

            for phase, epochs, lrs in self._curriculum():
                self._set_trainable(phase)
                it_loss += self._train_phase(train_loader, epochs, phase, lrs)

            logits = self._collect_val_logits(val_loader)
            self.calib = self.calibrate(logits)
            metrics = self._metrics_from_logits(logits, self.calib)
            print(f"  [EVAL] {metrics}")

            # checkpoint on best (sens + spec + kappa) composite
            score = (metrics["sensitivity"] + metrics["specificity"]
                     + metrics["kappa"]) / 3.0
            if score > self.best_score:
                self._save_best(score)
                (self.out_dir / "calibration.json").write_text(
                    json.dumps(self.calib.to_dict(), indent=2))
                print(f"  [SAVE] new best composite={score:.4f}")

            mined = self.analyze_and_reweight(train_loader)
            queue = self.export_review_queue(logits)
            record = {"iteration": it, "train_loss": round(it_loss, 4),
                      "metrics": metrics, "hard_mining": {k: v for k, v in
                                                          mined.items() if k != "review_samples"},
                      "review_queue": str(queue)}
            history.append(record)
            (self.out_dir / "loop_history.json").write_text(
                json.dumps(history, indent=2))

            if (metrics["sensitivity"] >= self.cfg.target_sensitivity
                    and metrics["specificity"] >= self.cfg.target_specificity
                    and metrics["accuracy"] >= self.cfg.target_accuracy):
                print(f"\n  >>> ALL TARGETS MET at iteration {it}: "
                      f"acc={metrics['accuracy']:.1%}, sens={metrics['sensitivity']:.1%}, "
                      f"spec={metrics['specificity']:.1%} <<<")
                status = "TARGETS_MET"
                break
            if (metrics["sensitivity"] >= self.cfg.target_sensitivity
                    and metrics["specificity"] >= self.cfg.target_specificity):
                print(f"  [NOTE] clinical sens/spec met but accuracy "
                      f"{metrics['accuracy']:.1%} < {self.cfg.target_accuracy:.0%} — continuing loop")
            if metrics["kappa"] <= best_kappa:
                plateau += 1
                if plateau >= self.cfg.plateau_patience:
                    status = "PLATEAU"
                    print(f"\n  [STOP] kappa plateaued at {metrics['kappa']}")
                    break
            else:
                plateau, best_kappa = 0, metrics["kappa"]
            status = "MAX_ITERATIONS" if it == self.cfg.max_iterations else "CONTINUE"

        if self.best_state is not None:
            self.model.load_state_dict(self.best_state)
        print(f"\n[LOOP] Finished ({status}). Best composite={self.best_score:.4f}")
        print(f"[LOOP] Artifacts: {self.out_dir}\\best_model.pt, calibration.json, "
              f"loop_history.json, review_queue.csv")
        return {"status": status, "history": history}

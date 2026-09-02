"""
Unified training script for retinal segmentation models.

Usage:
    python training/segmentation/train.py --task=vessel --data_dir=data/DRIVE --epochs=50
    python training/segmentation/train.py --task=disc   --data_dir=data/IDRiD --epochs=30
    python training/segmentation/train.py --task=lesion --data_dir=data/IDRiD,data/DDR,data/FGADR --epochs=60

Reports:
    - Dice score and IoU per class
    - Metrics reported SEPARATELY per source dataset (not averaged)
    - Training curves saved to output directory
"""

from __future__ import annotations

import argparse
import json
import time
from collections import defaultdict
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, random_split

from training.segmentation.models import build_model, get_input_size, MODEL_REGISTRY
from training.segmentation.datasets import VesselDataset, DiscFoveaDataset, LesionDataset


# ── Loss Functions ──────────────────────────────────────────────────────────

class DiceBCELoss(nn.Module):
    """Combined Dice + BCE loss for binary segmentation (vessels)."""

    def __init__(self, dice_weight: float = 0.5, smooth: float = 1.0):
        super().__init__()
        self.dice_weight = dice_weight
        self.smooth = smooth

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        bce = F.binary_cross_entropy(pred, target, reduction='mean')

        pred_flat = pred.view(-1)
        target_flat = target.view(-1)
        intersection = (pred_flat * target_flat).sum()
        dice = 1.0 - (2.0 * intersection + self.smooth) / \
               (pred_flat.sum() + target_flat.sum() + self.smooth)

        return self.dice_weight * dice + (1 - self.dice_weight) * bce


class MultiClassDiceCELoss(nn.Module):
    """Combined per-class Dice + cross-entropy for multi-class segmentation.

    Uses class weights to handle severe imbalance (MA pixels are typically
    <0.1% of the image, while background is >95%).
    """

    def __init__(self, num_classes: int = 5, smooth: float = 1.0,
                 class_weights: list[float] | None = None):
        super().__init__()
        self.num_classes = num_classes
        self.smooth = smooth
        if class_weights is not None:
            self.register_buffer('ce_weights',
                                 torch.tensor(class_weights, dtype=torch.float32))
        else:
            # Default weights: heavily penalize missing small lesions
            # BG=0.1, MA=5.0, EX=2.0, HE=2.0, NV=3.0
            self.register_buffer('ce_weights',
                                 torch.tensor([0.1, 5.0, 2.0, 2.0, 3.0]))

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        # Cross-entropy with class weights
        ce = F.cross_entropy(logits, targets, weight=self.ce_weights.to(logits.device))

        # Per-class Dice
        probs = F.softmax(logits, dim=1)
        dice_loss = 0.0
        for c in range(1, self.num_classes):  # Skip background
            pred_c = probs[:, c]
            target_c = (targets == c).float()
            intersection = (pred_c * target_c).sum()
            dice_c = 1.0 - (2.0 * intersection + self.smooth) / \
                     (pred_c.sum() + target_c.sum() + self.smooth)
            dice_loss += dice_c
        dice_loss /= max(self.num_classes - 1, 1)

        return 0.5 * ce + 0.5 * dice_loss


class HeatmapMSELoss(nn.Module):
    """Pixel-wise MSE for heatmap regression (disc/fovea localization)."""

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        return F.mse_loss(pred, target)


# ── Metrics ─────────────────────────────────────────────────────────────────

def dice_score(pred: np.ndarray, target: np.ndarray, smooth: float = 1.0) -> float:
    """Compute Dice coefficient for a single binary class."""
    intersection = (pred * target).sum()
    return float((2.0 * intersection + smooth) / (pred.sum() + target.sum() + smooth))


def iou_score(pred: np.ndarray, target: np.ndarray, smooth: float = 1.0) -> float:
    """Compute IoU for a single binary class."""
    intersection = (pred * target).sum()
    union = pred.sum() + target.sum() - intersection
    return float((intersection + smooth) / (union + smooth))


def compute_metrics_binary(preds: np.ndarray, targets: np.ndarray) -> dict:
    """Dice + IoU for binary segmentation."""
    pred_bin = (preds > 0.5).astype(np.float32)
    return {
        'dice': round(dice_score(pred_bin, targets), 4),
        'iou': round(iou_score(pred_bin, targets), 4),
    }


def compute_metrics_multiclass(preds: np.ndarray, targets: np.ndarray,
                                 num_classes: int = 5) -> dict:
    """Per-class Dice + IoU for multi-class segmentation."""
    pred_classes = preds.argmax(axis=1)
    class_names = {0: 'background', 1: 'MA', 2: 'exudate', 3: 'hemorrhage', 4: 'NV'}
    metrics = {}
    for c in range(num_classes):
        pred_c = (pred_classes == c).astype(np.float32)
        target_c = (targets == c).astype(np.float32)
        name = class_names.get(c, f'class_{c}')
        metrics[f'{name}_dice'] = round(dice_score(pred_c, target_c), 4)
        metrics[f'{name}_iou'] = round(iou_score(pred_c, target_c), 4)
    return metrics


def localization_error(pred_heatmap: np.ndarray, target_heatmap: np.ndarray,
                        img_size: int) -> float:
    """Mean Euclidean distance between predicted and GT peak locations."""
    errors = []
    for ch in range(pred_heatmap.shape[0]):
        pred_flat = pred_heatmap[ch].reshape(-1)
        gt_flat = target_heatmap[ch].reshape(-1)
        if gt_flat.max() < 0.01:
            continue
        pred_idx = pred_flat.argmax()
        gt_idx = gt_flat.argmax()
        pred_y, pred_x = divmod(int(pred_idx), img_size)
        gt_y, gt_x = divmod(int(gt_idx), img_size)
        errors.append(np.sqrt((pred_x - gt_x) ** 2 + (pred_y - gt_y) ** 2))
    return float(np.mean(errors)) if errors else 999.0


# ── Training Loop ───────────────────────────────────────────────────────────

def train_one_epoch(model: nn.Module, loader: DataLoader, criterion: nn.Module,
                     optimizer: torch.optim.Optimizer, device: torch.device,
                     scaler=None) -> float:
    model.train()
    running_loss = 0.0
    n_samples = 0
    for batch in loader:
        if len(batch) == 3:
            x, y, _ = batch
        else:
            x, y = batch

        x, y = x.to(device), y.to(device)
        optimizer.zero_grad(set_to_none=True)

        if scaler is not None:
            with torch.amp.autocast('cuda'):
                out = model(x)
                loss = criterion(out, y)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            scaler.step(optimizer)
            scaler.update()
        else:
            out = model(x)
            loss = criterion(out, y)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

        running_loss += float(loss.detach()) * x.size(0)
        n_samples += x.size(0)

    return running_loss / max(n_samples, 1)


@torch.no_grad()
def evaluate(model: nn.Module, loader: DataLoader, criterion: nn.Module,
             device: torch.device, task: str) -> dict:
    """Evaluate and compute per-source-dataset metrics."""
    model.eval()
    all_preds, all_targets = [], []
    source_preds = defaultdict(list)
    source_targets = defaultdict(list)
    total_loss = 0.0
    n_samples = 0

    for batch in loader:
        if len(batch) == 3:
            x, y, sources = batch
        else:
            x, y = batch
            sources = ['unknown'] * x.size(0)

        x, y = x.to(device), y.to(device)
        out = model(x)
        loss = criterion(out, y)
        total_loss += float(loss.detach()) * x.size(0)
        n_samples += x.size(0)

        pred_np = out.cpu().numpy()
        target_np = y.cpu().numpy()
        all_preds.append(pred_np)
        all_targets.append(target_np)

        # Track per-source
        if isinstance(sources, (list, tuple)):
            for i, src in enumerate(sources):
                source_preds[src].append(pred_np[i:i+1])
                source_targets[src].append(target_np[i:i+1])

    all_preds = np.concatenate(all_preds, axis=0)
    all_targets = np.concatenate(all_targets, axis=0)

    # Aggregate metrics
    result = {'val_loss': round(total_loss / max(n_samples, 1), 4)}

    if task == 'vessel':
        result.update(compute_metrics_binary(all_preds, all_targets))
    elif task == 'disc':
        img_size = all_preds.shape[-1]
        result['loc_error_px'] = round(localization_error(
            all_preds.mean(axis=0), all_targets.mean(axis=0), img_size), 2)
    elif task == 'lesion':
        result.update(compute_metrics_multiclass(all_preds, all_targets))

    # Per-source metrics (the whole point of cross-dataset validation)
    per_source = {}
    for src, preds in source_preds.items():
        src_p = np.concatenate(preds, axis=0)
        src_t = np.concatenate(source_targets[src], axis=0)
        if task == 'vessel':
            per_source[src] = compute_metrics_binary(src_p, src_t)
        elif task == 'lesion':
            per_source[src] = compute_metrics_multiclass(src_p, src_t)
    if per_source:
        result['per_source'] = per_source

    return result


# ── Main ────────────────────────────────────────────────────────────────────

def build_datasets(task: str, data_dirs: list[str], img_size: int):
    """Build train/val datasets based on task."""
    if task == 'vessel':
        full_ds = VesselDataset(data_dirs, img_size=img_size, phase='train')
        n_val = max(1, int(len(full_ds) * 0.2))
        n_train = len(full_ds) - n_val
        train_ds, val_ds = random_split(full_ds, [n_train, n_val],
                                         generator=torch.Generator().manual_seed(42))
        # Swap phase for val split (disable augmentation)
        val_ds_wrapper = VesselDataset(data_dirs, img_size=img_size, phase='eval')
        return train_ds, val_ds

    elif task == 'disc':
        full_ds = DiscFoveaDataset(data_dirs[0] if data_dirs else '', img_size=img_size,
                                    phase='train')
        n_val = max(1, int(len(full_ds) * 0.2))
        n_train = len(full_ds) - n_val
        train_ds, val_ds = random_split(full_ds, [n_train, n_val],
                                         generator=torch.Generator().manual_seed(42))
        return train_ds, val_ds

    elif task == 'lesion':
        full_ds = LesionDataset(data_dirs, img_size=img_size, phase='train')
        n_val = max(1, int(len(full_ds) * 0.2))
        n_train = len(full_ds) - n_val
        train_ds, val_ds = random_split(full_ds, [n_train, n_val],
                                         generator=torch.Generator().manual_seed(42))
        return train_ds, val_ds

    else:
        raise ValueError(f"Unknown task: {task}")


def get_criterion(task: str) -> nn.Module:
    """Return the appropriate loss function for each task."""
    if task == 'vessel':
        return DiceBCELoss(dice_weight=0.5)
    elif task == 'disc':
        return HeatmapMSELoss()
    elif task == 'lesion':
        return MultiClassDiceCELoss(num_classes=5)
    else:
        raise ValueError(f"Unknown task: {task}")


def main():
    parser = argparse.ArgumentParser(description='Train retinal segmentation models')
    parser.add_argument('--task', required=True, choices=['vessel', 'disc', 'lesion'],
                        help='Which model to train')
    parser.add_argument('--data_dir', required=True,
                        help='Comma-separated list of dataset directories')
    parser.add_argument('--out_dir', default='models/segmentation',
                        help='Output directory for checkpoints and logs')
    parser.add_argument('--epochs', type=int, default=50)
    parser.add_argument('--batch_size', type=int, default=4)
    parser.add_argument('--lr', type=float, default=1e-3)
    parser.add_argument('--num_workers', type=int, default=0)
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    out_dir = Path(args.out_dir) / args.task
    out_dir.mkdir(parents=True, exist_ok=True)

    data_dirs = [d.strip() for d in args.data_dir.split(',')]
    img_h, img_w = get_input_size(args.task)

    print(f"\n{'='*60}")
    print(f"  DrishtiAI Segmentation Training — {args.task}")
    print(f"  Data: {data_dirs}")
    print(f"  Device: {device} | Epochs: {args.epochs} | Batch: {args.batch_size}")
    print(f"  Input size: {img_h}x{img_w}")
    print(f"{'='*60}\n")

    # Build datasets
    train_ds, val_ds = build_datasets(args.task, data_dirs, img_h)
    print(f"  Train samples: {len(train_ds)} | Val samples: {len(val_ds)}")

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True,
                               num_workers=args.num_workers, pin_memory=True,
                               drop_last=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False,
                             num_workers=args.num_workers, pin_memory=True)

    # Build model
    model = build_model(args.task, pretrained=True).to(device)
    param_count = sum(p.numel() for p in model.parameters()) / 1e6
    print(f"  Model parameters: {param_count:.2f}M")

    # Optimizer: AdamW with cosine annealing
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    criterion = get_criterion(args.task)
    scaler = torch.amp.GradScaler('cuda') if device.type == 'cuda' else None

    # Training loop
    best_score = -1.0
    history = []

    for epoch in range(1, args.epochs + 1):
        t0 = time.time()
        train_loss = train_one_epoch(model, train_loader, criterion, optimizer,
                                      device, scaler)
        metrics = evaluate(model, val_loader, criterion, device, args.task)
        scheduler.step()
        elapsed = time.time() - t0

        # Determine checkpoint score
        if args.task == 'vessel':
            score = metrics.get('dice', 0.0)
            score_name = 'dice'
        elif args.task == 'disc':
            score = -metrics.get('loc_error_px', 999.0)  # Lower is better
            score_name = 'loc_error_px'
        elif args.task == 'lesion':
            # Average non-background Dice
            lesion_dices = [v for k, v in metrics.items()
                           if k.endswith('_dice') and 'background' not in k]
            score = float(np.mean(lesion_dices)) if lesion_dices else 0.0
            score_name = 'mean_lesion_dice'
            metrics[score_name] = round(score, 4)

        # Save best
        saved = ''
        if score > best_score:
            best_score = score
            torch.save({
                'model_state_dict': model.state_dict(),
                'task': args.task,
                'epoch': epoch,
                'score': score,
                'metrics': metrics,
            }, out_dir / 'best_model.pt')
            saved = ' [SAVED]'

        record = {'epoch': epoch, 'train_loss': round(train_loss, 4),
                  **metrics, 'elapsed_s': round(elapsed, 1)}
        history.append(record)

        print(f"  Epoch {epoch:3d}/{args.epochs} | "
              f"loss={train_loss:.4f} | {score_name}={abs(score):.4f} | "
              f"{elapsed:.1f}s{saved}")

        # Print per-source metrics if available
        per_source = metrics.get('per_source', {})
        if per_source:
            for src, src_m in per_source.items():
                print(f"    {src}: {src_m}")

    # Save training history
    (out_dir / 'training_history.json').write_text(json.dumps(history, indent=2))

    # Final results table
    print(f"\n{'='*60}")
    print(f"  FINAL RESULTS — {args.task}")
    print(f"  Best {score_name}: {abs(best_score):.4f}")
    print(f"  Checkpoint: {out_dir / 'best_model.pt'}")
    if history:
        final = history[-1]
        print(f"\n  Metrics on last epoch:")
        for k, v in final.items():
            if k not in ('epoch', 'elapsed_s', 'per_source'):
                print(f"    {k}: {v}")

        per_source = final.get('per_source', {})
        if per_source:
            print(f"\n  PER-SOURCE DATASET METRICS (cross-dataset validation):")
            for src, src_m in per_source.items():
                print(f"    {src}:")
                for mk, mv in src_m.items():
                    print(f"      {mk}: {mv}")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()

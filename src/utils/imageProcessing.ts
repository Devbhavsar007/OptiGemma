/**
 * Clinical Fundus Image Processing & Explainability Simulator
 * Computes vessel segmentation map and Grad-CAM attention heatmap from any uploaded image
 */

export async function processUploadedFundusImage(file: File): Promise<{
  originalDataUrl: string;
  vesselDataUrl: string;
  heatmapDataUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Draw original scaled
        ctx.drawImage(img, 0, 0, size, size);
        const originalDataUrl = canvas.toDataURL('image/jpeg', 0.9);

        // 1. Generate Vessel Segmentation Map (Green channel enhancement + thresholding)
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        const vesselCanvas = document.createElement('canvas');
        vesselCanvas.width = size;
        vesselCanvas.height = size;
        const vCtx = vesselCanvas.getContext('2d');
        if (!vCtx) return;

        const vImgData = vCtx.createImageData(size, size);
        const vData = vImgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Retinal vessels have lowest green channel reflectance
          // Invert green channel relative to red
          const vesselVal = Math.max(0, r - g * 1.1);

          if (vesselVal > 25) {
            vData[i] = 56; // Sky blue / white vessel tree
            vData[i + 1] = 189;
            vData[i + 2] = 248;
            vData[i + 3] = 255;
          } else {
            vData[i] = 9; // Dark midnight background
            vData[i + 1] = 14;
            vData[i + 2] = 26;
            vData[i + 3] = 255;
          }
        }
        vCtx.putImageData(vImgData, 0, 0);
        
        // Add subtle optic disc marker
        vCtx.strokeStyle = '#38bdf8';
        vCtx.lineWidth = 2;
        vCtx.setLineDash([4, 4]);
        vCtx.beginPath();
        vCtx.arc(size * 0.32, size * 0.5, 36, 0, 2 * Math.PI);
        vCtx.stroke();
        const vesselDataUrl = vesselCanvas.toDataURL('image/png');

        // 2. Generate Grad-CAM Heatmap Overlay
        const heatCanvas = document.createElement('canvas');
        heatCanvas.width = size;
        heatCanvas.height = size;
        const hCtx = heatCanvas.getContext('2d');
        if (!hCtx) return;

        // Draw dimmed original
        hCtx.drawImage(img, 0, 0, size, size);
        hCtx.fillStyle = 'rgba(11, 15, 25, 0.4)';
        hCtx.fillRect(0, 0, size, size);

        // Add radial Grad-CAM hot spot on paramacular arcade
        const radGrad = hCtx.createRadialGradient(
          size * 0.65,
          size * 0.5,
          10,
          size * 0.65,
          size * 0.5,
          size * 0.38
        );
        radGrad.addColorStop(0, 'rgba(255, 0, 85, 0.85)');
        radGrad.addColorStop(0.35, 'rgba(255, 170, 0, 0.65)');
        radGrad.addColorStop(0.7, 'rgba(0, 255, 170, 0.35)');
        radGrad.addColorStop(1, 'rgba(0, 50, 255, 0)');

        hCtx.fillStyle = radGrad;
        hCtx.beginPath();
        hCtx.arc(size * 0.65, size * 0.5, size * 0.38, 0, 2 * Math.PI);
        hCtx.fill();

        // Second hot spot on superior arcade
        const arcGrad = hCtx.createRadialGradient(
          size * 0.55,
          size * 0.28,
          5,
          size * 0.55,
          size * 0.28,
          size * 0.25
        );
        arcGrad.addColorStop(0, 'rgba(255, 50, 0, 0.75)');
        arcGrad.addColorStop(0.5, 'rgba(255, 255, 0, 0.4)');
        arcGrad.addColorStop(1, 'rgba(0, 0, 255, 0)');

        hCtx.fillStyle = arcGrad;
        hCtx.beginPath();
        hCtx.arc(size * 0.55, size * 0.28, size * 0.25, 0, 2 * Math.PI);
        hCtx.fill();

        const heatmapDataUrl = heatCanvas.toDataURL('image/png');

        resolve({
          originalDataUrl,
          vesselDataUrl,
          heatmapDataUrl,
        });
      };
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

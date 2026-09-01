function [enhanced] = enhanceImage(img)
%ENHANCEIMAGE Adaptive enhancement for borderline-quality fundus images.
%   [ENHANCED] = enhanceImage(IMG) applies a sequence of enhancement steps
%   designed to improve image quality enough for downstream DR grading,
%   without introducing artifacts or destroying thin-vessel detail.
%
%   Only applied to images classified BORDERLINE by assessQuality.
%   PASS images skip this to save latency.
%
%   Enhancement pipeline:
%       1. CLAHE on luminance channel (L in Lab color space)
%       2. Illumination normalization (large-kernel background division)
%       3. Bilateral denoising (edge-preserving, Coder-compatible)
%       4. Final contrast stretch preserving vessel visibility
%
%   This function is MATLAB Coder-compatible for standalone C++ deployment.
%
%   INPUT:
%       img  - H x W x 3 uint8 RGB fundus image
%
%   OUTPUT:
%       enhanced - H x W x 3 uint8 enhanced RGB image
%
%   Reference: mirrors engine/pipeline/iqa.py:enhance() (Python)

%#codegen

% =========================================================================
%  NAMED CONSTANTS — All tunable parameters exposed here
% =========================================================================

% ── CLAHE parameters ──
% Clip limit controls contrast amplification ceiling. Too high = noise
% amplification; too low = negligible enhancement. 2.0 is conservative
% enough to avoid amplifying MA-like noise while recovering vessel contrast.
CLAHE_CLIP_LIMIT    = 2.0;
CLAHE_NUM_TILES     = 8;      % 8x8 tile grid (standard for fundus at 512px)

% ── Illumination normalization ──
% Background estimate via morphological opening with a large disk structuring
% element. The disk diameter must be larger than the largest retinal
% structure (optic disc ~1/6 of image width) to capture only the
% slowly-varying illumination field, not anatomical features.
ILLUM_DISK_RADIUS   = 25;     % SE radius for background estimation (at 512px scale)
ILLUM_GAUSS_SIGMA   = 21.0;   % Gaussian smoothing of background estimate

% ── Denoising parameters ──
% Bilateral filter: preserves edges (vessel boundaries) while smoothing
% noise. Chosen over non-local means for MATLAB Coder compatibility
% (imbilatfilt is supported since R2019b; imnlmfilt is not Coder-supported).
DENOISE_DEGREE      = 0.02;   % Degree of smoothing (fraction of intensity range)
DENOISE_SPATIAL_SIG = 3.0;    % Spatial sigma (pixels): how far to look for smoothing

% ── Contrast stretch ──
% Percentile-based stretch to avoid outlier-driven rescaling.
% Low/high percentiles clip extreme pixels before stretching.
STRETCH_LOW_PCT     = 1.0;    % Clip below this percentile
STRETCH_HIGH_PCT    = 99.0;   % Clip above this percentile

% =========================================================================
%  STEP 0: Convert to double for processing
% =========================================================================
imgD = double(img);

% =========================================================================
%  STEP 1: CLAHE on luminance channel
% =========================================================================
% Convert RGB → Lab (luminance + chrominance separation)
% MATLAB's rgb2lab returns L in [0,100], a/b in [-128,127]
labImg = rgb2lab(imgD / 255.0);

L = labImg(:,:,1);       % Luminance channel
a = labImg(:,:,2);       % Chrominance a
b = labImg(:,:,3);       % Chrominance b

% Normalize L to [0, 1] for adapthisteq (expects [0,1] input)
L_norm = L / 100.0;

% Apply CLAHE (adapthisteq is Coder-compatible)
L_clahe = adapthisteq(L_norm, ...
    'ClipLimit',     CLAHE_CLIP_LIMIT / 256, ...  % adapthisteq uses normalized clip
    'NumTiles',      [CLAHE_NUM_TILES CLAHE_NUM_TILES], ...
    'Distribution',  'rayleigh', ...              % Rayleigh: natural appearance for retinal images
    'Range',         'full');

% =========================================================================
%  STEP 2: Illumination normalization
% =========================================================================
% Estimate background illumination via morphological opening with a large
% disk SE. This captures the slowly-varying illumination gradient from
% uneven flash illumination without picking up retinal structures.
se = strel('disk', ILLUM_DISK_RADIUS);
L_bg = imopen(L_clahe, se);

% Smooth the background estimate to avoid morphological artifacts at SE edges
% Use imgaussfilt (Coder-compatible) for Gaussian smoothing
L_bg_smooth = imgaussfilt(L_bg, ILLUM_GAUSS_SIGMA);

% Divide luminance by background estimate, then renormalize
% This corrects for uneven illumination across the fundus image
L_bg_safe = max(L_bg_smooth, 0.01);  % Avoid division by zero
L_norm2 = L_clahe ./ L_bg_safe;

% Renormalize to [0, 1]
L_min = min(L_norm2(:));
L_max = max(L_norm2(:));
if (L_max - L_min) > 0.001
    L_norm2 = (L_norm2 - L_min) / (L_max - L_min);
else
    L_norm2 = L_clahe;  % Fallback if normalization produces constant output
end

% =========================================================================
%  STEP 3: Reconstruct Lab image and convert back to RGB
% =========================================================================
labEnhanced = labImg;
labEnhanced(:,:,1) = L_norm2 * 100.0;  % Scale back to [0, 100]

% Convert Lab → RGB (result is double [0, 1])
rgbEnhanced = lab2rgb(labEnhanced);

% Clip to valid range (numerical errors can push values slightly outside)
rgbEnhanced = max(0, min(1, rgbEnhanced));

% =========================================================================
%  STEP 4: Bilateral denoising (edge-preserving)
% =========================================================================
% imbilatfilt preserves vessel boundaries while reducing shot noise.
% This is critical: standard Gaussian blur would destroy thin vessel detail
% that's essential for DR grading.
enhanced_denoised = imbilatfilt(rgbEnhanced, DENOISE_DEGREE, DENOISE_SPATIAL_SIG);

% =========================================================================
%  STEP 5: Final contrast stretch (percentile-based)
% =========================================================================
% Per-channel percentile stretch to maximize dynamic range usage while
% protecting against outlier-driven rescaling (e.g., a single bright pixel
% shouldn't compress the entire histogram).
enhanced_stretched = enhanced_denoised;
for ch = 1:3
    channel = enhanced_denoised(:,:,ch);
    sortedPx = sort(channel(:));
    nPx = numel(sortedPx);

    % Compute percentile boundaries
    lowIdx  = max(1, round(STRETCH_LOW_PCT / 100.0 * nPx));
    highIdx = min(nPx, round(STRETCH_HIGH_PCT / 100.0 * nPx));
    lowVal  = sortedPx(lowIdx);
    highVal = sortedPx(highIdx);

    if (highVal - lowVal) > 0.01
        stretchedCh = (channel - lowVal) / (highVal - lowVal);
        stretchedCh = max(0, min(1, stretchedCh));
        enhanced_stretched(:,:,ch) = stretchedCh;
    end
end

% =========================================================================
%  STEP 6: Convert back to uint8 output
% =========================================================================
enhanced = uint8(round(enhanced_stretched * 255));

end

function [result] = assessQuality(img)
%ASSESSQUALITY Image quality assessment for fundus screening pipeline.
%   [RESULT] = assessQuality(IMG) evaluates a fundus image for clinical
%   gradability. Returns a struct with composite quality score, individual
%   metric scores, a classification (PASS / BORDERLINE / REJECT), and a
%   specific reject reason string for operator feedback.
%
%   This function is designed to be MATLAB Coder-compatible for standalone
%   C++/CUDA deployment via GPU Coder on Jetson Nano/Orin-class hardware.
%
%   INPUT:
%       img  - H x W x 3 uint8 RGB fundus image (any resolution)
%
%   OUTPUT:
%       result - struct with fields:
%           .qualityScore    (double, 0-1 composite)
%           .focusScore      (double, Laplacian variance)
%           .brightnessScore (double, green-channel mean in FOV)
%           .contrastScore   (double, green-channel std in FOV)
%           .fovCoverage     (double, 0-1 fraction of image covered by retina)
%           .glareDetected   (logical)
%           .classification  (int32: 1=PASS, 2=BORDERLINE, 3=REJECT)
%           .rejectReason    (int32: encoded reason, see REASON_* constants)
%
%   Reject reason codes (returned as int32 for Coder compatibility):
%       0 = NONE
%       1 = TOO_DARK
%       2 = OVEREXPOSED
%       3 = OUT_OF_FOCUS
%       4 = INCOMPLETE_FOV
%       5 = GLARE_DETECTED
%       6 = LOW_CONTRAST
%       7 = MULTIPLE_ISSUES
%
%   MATLAB Coder compatibility notes:
%       - Uses only Coder-supported functions (conv2, rgb2gray, imresize, etc.)
%       - No figure/imshow/plotting functions
%       - No cell arrays or dynamic sizing in the deployment path
%       - String outputs encoded as int32 for codegen
%
%   Reference: mirrors engine/pipeline/iqa.py (Python implementation)

%#codegen

% =========================================================================
%  NAMED CONSTANTS — Tunable thresholds (not magic numbers)
%  All calibrated at 512px analysis scale on 8-bit fundus imagery.
% =========================================================================

% ── Focus thresholds ──
% Laplacian variance on CLAHE-normalized green channel inside FOV.
% Rationale: typical in-focus fundus images score 50-200+ at 512px;
% out-of-focus handheld captures drop below 25.
FOCUS_ACCEPT   = 60.0;    % Above this: image is sharp enough for grading
FOCUS_BORDER   = 30.0;    % Between BORDER and ACCEPT: enhancement may help
FOCUS_REJECT   = 15.0;    % Below this: unrecoverable blur, must recapture

% ── Illumination thresholds ──
% Green channel mean within the retinal FOV (8-bit scale).
% Rationale: green channel has best vessel contrast; mean < 40 means
% severely under-lit, > 200 means overexposed/washed out.
BRIGHT_LOW     = 40.0;    % Below: too dark to grade
BRIGHT_HIGH    = 200.0;   % Above: overexposed, detail lost
BRIGHT_IDEAL_LOW  = 60.0; % Ideal range lower bound
BRIGHT_IDEAL_HIGH = 170.0;% Ideal range upper bound

% ── Contrast thresholds ──
% Green channel standard deviation within FOV.
% Rationale: std < 12 means nearly uniform intensity — no vessel/lesion
% contrast. Often caused by severe cataract or media opacity.
CONTRAST_ACCEPT = 15.0;   % Above: adequate tissue contrast
CONTRAST_MIN    = 8.0;    % Below: ungradeable, no structure visible

% ── Field of View thresholds ──
% Ratio of retinal ROI area to total image area.
% Rationale: portable cameras with poor centring may clip the retina.
% We need >= 50% coverage for reliable grading; < 30% is ungradeable.
FOV_ACCEPT      = 0.50;   % Above: adequate retinal coverage
FOV_MIN         = 0.30;   % Below: too much of the retina is missing

% ── Glare detection thresholds ──
% Local contrast anomaly: sliding window where mean is high but std is low
% indicates specular reflection (glare from flash/cornea).
GLARE_WINDOW    = int32(31);  % Window size for local statistics (pixels at 512px scale)
GLARE_MEAN_THR  = 230.0;     % Local mean above this = potentially glare
GLARE_STD_THR   = 10.0;      % Local std below this + high mean = confirmed glare
GLARE_AREA_THR  = 0.005;     % Glare area fraction above this = flagged

% ── Analysis resolution ──
% Normalize all images to this max dimension so thresholds are
% resolution-independent across 1-12 MP portable cameras.
ANALYSIS_SIZE   = int32(512);

% ── Composite score weights ──
W_FOCUS    = 0.35;   % Focus is most critical for grading accuracy
W_BRIGHT   = 0.20;   % Illumination affects all downstream processing
W_CONTRAST = 0.20;   % Contrast determines lesion/vessel visibility
W_FOV      = 0.15;   % FOV coverage affects spatial completeness
W_GLARE    = 0.10;   % Glare is a local artifact, less globally disruptive

% ── Classification thresholds on composite score ──
COMPOSITE_PASS   = 0.75;   % Above: image is clinically gradeable
COMPOSITE_BORDER = 0.45;   % Between: enhancement may salvage it

% ── Reject reason codes ──
REASON_NONE           = int32(0);
REASON_TOO_DARK       = int32(1);
REASON_OVEREXPOSED    = int32(2);
REASON_OUT_OF_FOCUS   = int32(3);
REASON_INCOMPLETE_FOV = int32(4);
REASON_GLARE_DETECTED = int32(5);
REASON_LOW_CONTRAST   = int32(6);
REASON_MULTIPLE       = int32(7);

% Classification codes
CLASS_PASS       = int32(1);
CLASS_BORDERLINE = int32(2);
CLASS_REJECT     = int32(3);

% =========================================================================
%  STEP 0: Resize to analysis scale (resolution-independent thresholds)
% =========================================================================
[h, w, ~] = size(img);
maxDim = max(h, w);
if maxDim > ANALYSIS_SIZE
    scaleFactor = double(ANALYSIS_SIZE) / double(maxDim);
    newH = max(int32(1), int32(round(double(h) * scaleFactor)));
    newW = max(int32(1), int32(round(double(w) * scaleFactor)));
    imgA = imresize(img, [newH, newW]);
else
    imgA = img;
end

% =========================================================================
%  STEP 1: Detect retinal field-of-view (FOV) mask
% =========================================================================
grayImg = rgb2gray(imgA);
% Threshold to find the bright retinal region against the dark surround
fovMask = grayImg > uint8(12);

% Morphological cleanup: remove noise, fill holes
se_open  = strel('disk', 7);
se_close = strel('disk', 15);
fovMask = imopen(fovMask, se_open);
fovMask = imclose(fovMask, se_close);
fovMask = imfill(fovMask, 'holes');

% Keep only the largest connected component (the retinal circle)
CC = bwconncomp(fovMask);
if CC.NumObjects > 1
    numPixels = zeros(1, CC.NumObjects);
    for k = 1:CC.NumObjects
        numPixels(k) = numel(CC.PixelIdxList{k});
    end
    [~, maxIdx] = max(numPixels);
    cleanMask = false(size(fovMask));
    cleanMask(CC.PixelIdxList{maxIdx}) = true;
    fovMask = cleanMask;
end

% Compute FOV coverage
[hA, wA, ~] = size(imgA);
totalPixels = double(hA * wA);
fovPixels   = double(sum(fovMask(:)));
fovCoverage = fovPixels / totalPixels;

% =========================================================================
%  STEP 2: Focus score — Laplacian variance on green channel inside FOV
% =========================================================================
% Extract green channel (best vessel/lesion contrast in fundus images)
greenCh = double(imgA(:,:,2));

% Apply CLAHE-equivalent normalization to decouple focus from exposure:
% Normalize green channel to zero-mean unit-variance inside FOV before
% computing Laplacian, so the focus metric isn't biased by brightness.
fovPixelsGreen = greenCh(fovMask);
if numel(fovPixelsGreen) > 100
    gMean = mean(fovPixelsGreen);
    gStd  = max(std(fovPixelsGreen), 1.0);
    greenNorm = (greenCh - gMean) / gStd * 50 + 128;
    greenNorm = max(0, min(255, greenNorm));
else
    greenNorm = greenCh;
end

% Laplacian kernel (3x3 standard discrete Laplacian)
lapKernel = [0  1  0;
             1 -4  1;
             0  1  0];

% Convolution — Coder-compatible (conv2 is supported)
lapResponse = conv2(greenNorm, lapKernel, 'same');

% Variance of Laplacian within FOV only
lapInFov = lapResponse(fovMask);
if numel(lapInFov) > 10
    focusScore = var(lapInFov);
else
    focusScore = 0.0;
end

% =========================================================================
%  STEP 3: Illumination — green channel statistics inside FOV
% =========================================================================
greenInFov = double(imgA(repmat(fovMask, [1, 1]) & true(hA, wA)));
% More robust: extract green channel pixels inside FOV
greenChRaw = double(imgA(:,:,2));
greenFovPx = greenChRaw(fovMask);

if numel(greenFovPx) > 10
    brightnessScore = mean(greenFovPx);
    contrastScore   = std(greenFovPx);
else
    brightnessScore = 0.0;
    contrastScore   = 0.0;
end

% =========================================================================
%  STEP 4: Glare / artifact detection — local contrast anomaly
% =========================================================================
% Sliding window: find regions where local mean is very high but local
% std is very low — characteristic of specular reflections from flash.
halfWin = (GLARE_WINDOW - 1) / 2;
grayD = double(grayImg);

% Box filter for local mean (Coder-compatible: conv2 with uniform kernel)
boxKernel = ones(double(GLARE_WINDOW)) / double(GLARE_WINDOW * GLARE_WINDOW);
localMean = conv2(grayD, boxKernel, 'same');

% Local variance via E[X^2] - E[X]^2
localMeanSq = conv2(grayD .^ 2, boxKernel, 'same');
localVar = max(0, localMeanSq - localMean .^ 2);
localStd = sqrt(localVar);

% Glare: high brightness + low texture, within FOV
glareMask = (localMean > GLARE_MEAN_THR) & (localStd < GLARE_STD_THR) & fovMask;
glareArea = double(sum(glareMask(:))) / max(fovPixels, 1.0);
glareDetected = glareArea > GLARE_AREA_THR;

% =========================================================================
%  STEP 5: Compute individual sub-scores (0-1 normalized)
% =========================================================================
% Focus sub-score: sigmoid-like ramp between REJECT and ACCEPT
if focusScore >= FOCUS_ACCEPT
    focusNorm = 1.0;
elseif focusScore <= FOCUS_REJECT
    focusNorm = 0.0;
else
    focusNorm = (focusScore - FOCUS_REJECT) / (FOCUS_ACCEPT - FOCUS_REJECT);
end

% Brightness sub-score: 1.0 in ideal range, drops outside
if brightnessScore >= BRIGHT_IDEAL_LOW && brightnessScore <= BRIGHT_IDEAL_HIGH
    brightNorm = 1.0;
elseif brightnessScore < BRIGHT_LOW || brightnessScore > BRIGHT_HIGH
    brightNorm = 0.0;
elseif brightnessScore < BRIGHT_IDEAL_LOW
    brightNorm = (brightnessScore - BRIGHT_LOW) / (BRIGHT_IDEAL_LOW - BRIGHT_LOW);
else
    brightNorm = (BRIGHT_HIGH - brightnessScore) / (BRIGHT_HIGH - BRIGHT_IDEAL_HIGH);
end

% Contrast sub-score
if contrastScore >= CONTRAST_ACCEPT
    contrastNorm = 1.0;
elseif contrastScore <= CONTRAST_MIN
    contrastNorm = 0.0;
else
    contrastNorm = (contrastScore - CONTRAST_MIN) / (CONTRAST_ACCEPT - CONTRAST_MIN);
end

% FOV sub-score
if fovCoverage >= FOV_ACCEPT
    fovNorm = 1.0;
elseif fovCoverage <= FOV_MIN
    fovNorm = 0.0;
else
    fovNorm = (fovCoverage - FOV_MIN) / (FOV_ACCEPT - FOV_MIN);
end

% Glare sub-score (binary: 0 if detected, 1 if clean)
if glareDetected
    glareNorm = 0.0;
else
    glareNorm = 1.0;
end

% =========================================================================
%  STEP 6: Composite quality score (weighted sum)
% =========================================================================
qualityScore = W_FOCUS    * focusNorm   + ...
               W_BRIGHT   * brightNorm  + ...
               W_CONTRAST * contrastNorm + ...
               W_FOV      * fovNorm     + ...
               W_GLARE    * glareNorm;

% =========================================================================
%  STEP 7: Classification + reject reason
% =========================================================================
% Hard-fail conditions: no amount of enhancement can fix these
hardFail = (focusScore < FOCUS_REJECT) || ...
           (fovCoverage < FOV_MIN) || ...
           (brightnessScore < 15.0) || ...
           (contrastScore < CONTRAST_MIN);

if qualityScore >= COMPOSITE_PASS && ~hardFail
    classification = CLASS_PASS;
    rejectReason   = REASON_NONE;
elseif ~hardFail && qualityScore >= COMPOSITE_BORDER
    classification = CLASS_BORDERLINE;
    rejectReason   = REASON_NONE;
else
    classification = CLASS_REJECT;
    % Determine the most severe reject reason
    rejectReason = determineRejectReason(focusScore, brightnessScore, ...
                       contrastScore, fovCoverage, glareDetected, ...
                       FOCUS_REJECT, BRIGHT_LOW, BRIGHT_HIGH, ...
                       CONTRAST_MIN, FOV_MIN, ...
                       REASON_OUT_OF_FOCUS, REASON_TOO_DARK, ...
                       REASON_OVEREXPOSED, REASON_LOW_CONTRAST, ...
                       REASON_INCOMPLETE_FOV, REASON_GLARE_DETECTED, ...
                       REASON_MULTIPLE);
end

% =========================================================================
%  STEP 8: Assemble result struct
% =========================================================================
result.qualityScore    = qualityScore;
result.focusScore      = focusScore;
result.brightnessScore = brightnessScore;
result.contrastScore   = contrastScore;
result.fovCoverage     = fovCoverage;
result.glareDetected   = glareDetected;
result.classification  = classification;
result.rejectReason    = rejectReason;

end


function reason = determineRejectReason(focusScore, brightness, contrast, ...
    fovCoverage, glareDetected, ...
    FOCUS_REJECT, BRIGHT_LOW, BRIGHT_HIGH, CONTRAST_MIN, FOV_MIN, ...
    REASON_FOCUS, REASON_DARK, REASON_OVER, REASON_CONTRAST, ...
    REASON_FOV, REASON_GLARE, REASON_MULTI)
%DETERMINEREJECTREASON Find the primary failure mode for operator feedback.
%#codegen

    failCount = int32(0);
    reason = int32(0);

    if focusScore < FOCUS_REJECT
        failCount = failCount + 1;
        reason = REASON_FOCUS;
    end
    if brightness < BRIGHT_LOW
        failCount = failCount + 1;
        reason = REASON_DARK;
    end
    if brightness > BRIGHT_HIGH
        failCount = failCount + 1;
        reason = REASON_OVER;
    end
    if contrast < CONTRAST_MIN
        failCount = failCount + 1;
        reason = REASON_CONTRAST;
    end
    if fovCoverage < FOV_MIN
        failCount = failCount + 1;
        reason = REASON_FOV;
    end
    if glareDetected
        failCount = failCount + 1;
        reason = REASON_GLARE;
    end

    if failCount > 1
        reason = REASON_MULTI;
    end
end

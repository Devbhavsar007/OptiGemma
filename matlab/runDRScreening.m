function [result] = runDRScreening(img)
%RUNDRSCREENING End-to-end DR screening pipeline in MATLAB.
%   [RESULT] = runDRScreening(IMG) processes a fundus image through the
%   complete pipeline: Quality Gate → Enhancement → Segmentation → Grading
%   → Explainability → Report.
%
%   This function chains the MATLAB quality gate/enhancement (Coder-compiled)
%   with imported ONNX models (Deep Learning Toolbox) into a single callable.
%
%   INPUT:
%       img - H x W x 3 uint8 RGB fundus image
%
%   OUTPUT:
%       result - struct with fields:
%           .qualityScore      (double) Composite image quality 0-1
%           .qualityClass      (int32)  1=PASS, 2=BORDERLINE, 3=REJECT
%           .rejectReason      (int32)  Encoded reason (0=none)
%           .enhanced          (logical) Whether enhancement was applied
%           .icdrGrade         (int32)  ICDR severity 0-4
%           .gradeProbs        (1x5 double) Class probability distribution
%           .referableFlag     (logical) Grade >= 2 flag
%           .referableProb     (double) Calibrated referable probability
%           .confidence        (double) Max class probability (calibrated)
%           .routingDecision   (int32)  1=AUTO_GRADE, 2=REFER_TO_HUMAN
%           .discCenter        (1x2 double) Optic disc [x, y]
%           .foveaCenter       (1x2 double) Fovea [x, y]
%           .vesselDensity     (double) Vessel pixel fraction
%           .lesionCounts      (struct) MA, exudate, hemorrhage, NV counts
%           .gradcamOverlay    (H x W x 3 uint8) Annotated overlay image
%           .latencyMs         (double) Total processing time in ms
%
%   DEPLOYMENT:
%       Compile with: codegen runDRScreening -args {coder.typeof(uint8(0),[2000 2000 3])}
%       Target: GPU Coder → Jetson Nano/Orin, or MATLAB Coder → CPU standalone
%
%   NOTE: This function requires pre-imported MATLAB networks (.mat files)
%   in models/matlab_imported/. Run importModels.m first.

    tStart = tic;

    % ── Persistent model cache (loaded once, reused across calls) ──
    persistent vesselNet discNet lesionNet gradingNet calibTemp calibThresh modelsLoaded
    if isempty(modelsLoaded) || ~modelsLoaded
        modelDir = fullfile(fileparts(mfilename('fullpath')), '..', 'models', 'matlab_imported');
        calibDir = fullfile(fileparts(mfilename('fullpath')), '..', 'models', 'grading');

        vesselNet  = loadNetSafe(fullfile(modelDir, 'vessel_seg.mat'));
        discNet    = loadNetSafe(fullfile(modelDir, 'disc_fovea.mat'));
        lesionNet  = loadNetSafe(fullfile(modelDir, 'lesion_seg.mat'));
        gradingNet = loadNetSafe(fullfile(modelDir, 'dr_grading.mat'));

        % Load calibration parameters
        calibFile = fullfile(calibDir, 'calibration.json');
        if exist(calibFile, 'file')
            calibData = jsondecode(fileread(calibFile));
            calibTemp = calibData.temperature;
            calibThresh = calibData.threshold;
        else
            calibTemp = 1.0;
            calibThresh = 0.5;
        end

        modelsLoaded = true;
        fprintf('[runDRScreening] Models loaded.\n');
    end

    % Initialize result struct
    result = initResult();

    % =====================================================================
    %  LAYER 1: Quality Gate
    % =====================================================================
    qResult = assessQuality(img);
    result.qualityScore = qResult.qualityScore;
    result.qualityClass = qResult.classification;
    result.rejectReason = qResult.rejectReason;

    % If REJECT, return early with feedback
    if qResult.classification == 3  % REJECT
        result.latencyMs = toc(tStart) * 1000;
        return;
    end

    % =====================================================================
    %  LAYER 2: Adaptive Enhancement (BORDERLINE images only)
    % =====================================================================
    processedImg = img;
    if qResult.classification == 2  % BORDERLINE
        processedImg = enhanceImage(img);
        result.enhanced = true;
    end

    % =====================================================================
    %  LAYER 3: Structure Segmentation
    % =====================================================================

    % --- 3a. Optic Disc / Fovea Localization ---
    if ~isempty(discNet)
        discInput = prepareInput(processedImg, [256 256]);
        discHeatmap = predict(discNet, discInput);
        % Channel 1 = disc, Channel 2 = fovea
        [~, discIdx] = max(discHeatmap(:,:,1,:), [], 'all', 'linear');
        [dy, dx] = ind2sub([256 256], discIdx);
        result.discCenter = [dx, dy] .* (size(img, [2 1]) ./ [256 256]);

        [~, fovIdx] = max(discHeatmap(:,:,2,:), [], 'all', 'linear');
        [fy, fx] = ind2sub([256 256], fovIdx);
        result.foveaCenter = [fx, fy] .* (size(img, [2 1]) ./ [256 256]);
    end

    % --- 3b. Vessel Segmentation ---
    if ~isempty(vesselNet)
        vesselInput = prepareInput(processedImg, [512 512]);
        vesselMask = predict(vesselNet, vesselInput);
        vesselBinary = vesselMask > 0.5;
        result.vesselDensity = sum(vesselBinary(:)) / numel(vesselBinary);
    end

    % --- 3c. Lesion Detection ---
    if ~isempty(lesionNet)
        lesionInput = prepareInput(processedImg, [512 512]);
        lesionLogits = predict(lesionNet, lesionInput);
        [~, lesionClasses] = max(lesionLogits, [], 3);
        result.lesionCounts.MA         = sum(lesionClasses(:) == 2); % MA = class 1 in 0-indexed
        result.lesionCounts.exudate    = sum(lesionClasses(:) == 3);
        result.lesionCounts.hemorrhage = sum(lesionClasses(:) == 4);
        result.lesionCounts.NV         = sum(lesionClasses(:) == 5);
    end

    % =====================================================================
    %  LAYER 4: DR Severity Grading
    % =====================================================================
    if ~isempty(gradingNet)
        gradingInput = prepareInput(processedImg, [300 300]);
        logits = predict(gradingNet, gradingInput);
        % logits layout: [ordinal(4) | referable(1)]
        ordLogits = logits(1:4) / calibTemp;
        refLogit  = logits(5) / calibTemp;

        % Ordinal probabilities via cumulative product
        pGt = cumprod(sigmoid(ordLogits));
        cumProbs = [1, pGt, 0];
        gradeProbs = cumProbs(1:5) - cumProbs(2:6);
        gradeProbs = max(gradeProbs, 1e-9);
        gradeProbs = gradeProbs / sum(gradeProbs);

        [confidence, icdrGrade] = max(gradeProbs);
        icdrGrade = int32(icdrGrade - 1);  % Convert to 0-indexed

        referableProb = sigmoid(refLogit);
        referableFlag = referableProb >= calibThresh;

        result.icdrGrade    = icdrGrade;
        result.gradeProbs   = gradeProbs;
        result.referableFlag = referableFlag;
        result.referableProb = referableProb;
        result.confidence   = confidence;

        % Routing decision
        result.routingDecision = routeDecision(icdrGrade, referableFlag, confidence);
    end

    % =====================================================================
    %  LAYER 5: Grad-CAM Explainability
    % =====================================================================
    if ~isempty(gradingNet)
        try
            gradingInput4D = prepareInput(processedImg, [300 300]);
            camMap = gradCAM(gradingNet, gradingInput4D, 1);
            % Resize to original image dimensions
            camResized = imresize(camMap, [size(img, 1), size(img, 2)]);
            % Create overlay
            result.gradcamOverlay = applyHeatmapOverlay(img, camResized, 0.4);
        catch
            % Fallback: return original image if gradCAM fails
            result.gradcamOverlay = img;
        end
    else
        result.gradcamOverlay = img;
    end

    result.latencyMs = toc(tStart) * 1000;
end


% =========================================================================
%  Helper functions
% =========================================================================

function result = initResult()
    result.qualityScore    = 0.0;
    result.qualityClass    = int32(0);
    result.rejectReason    = int32(0);
    result.enhanced        = false;
    result.icdrGrade       = int32(-1);
    result.gradeProbs      = zeros(1, 5);
    result.referableFlag   = false;
    result.referableProb   = 0.0;
    result.confidence      = 0.0;
    result.routingDecision = int32(0);
    result.discCenter      = [0, 0];
    result.foveaCenter     = [0, 0];
    result.vesselDensity   = 0.0;
    result.lesionCounts    = struct('MA', 0, 'exudate', 0, 'hemorrhage', 0, 'NV', 0);
    result.gradcamOverlay  = uint8(zeros(1, 1, 3));
    result.latencyMs       = 0.0;
end


function net = loadNetSafe(matPath)
%LOADNETSAFE Load a .mat network file, return empty if not found.
    if exist(matPath, 'file')
        data = load(matPath, 'net');
        net = data.net;
    else
        fprintf('  [WARN] Model not found: %s\n', matPath);
        net = [];
    end
end


function input4D = prepareInput(img, targetSize)
%PREPAREINPUT Resize, normalize (ImageNet), and format for MATLAB DLT predict.
    resized = imresize(img, targetSize);
    imgF = single(resized) / 255.0;

    % ImageNet normalization
    imgF(:,:,1) = (imgF(:,:,1) - 0.485) / 0.229;
    imgF(:,:,2) = (imgF(:,:,2) - 0.456) / 0.224;
    imgF(:,:,3) = (imgF(:,:,3) - 0.406) / 0.225;

    % MATLAB DLT expects SSCB format: H x W x C x B
    input4D = reshape(imgF, [targetSize(1), targetSize(2), 3, 1]);
end


function y = sigmoid(x)
    y = 1.0 ./ (1.0 + exp(-x));
end


function decision = routeDecision(grade, referable, confidence)
%ROUTEDECISION Deterministic routing: AUTO_GRADE (1) or REFER_TO_HUMAN (2).
    AUTO = int32(1);
    REFER = int32(2);

    % PDR always requires specialist confirmation
    if grade == 4
        decision = REFER;
        return;
    end

    % Low confidence
    if confidence < 0.70
        decision = REFER;
        return;
    end

    % Referable with borderline confidence
    if referable && confidence < 0.85
        decision = REFER;
        return;
    end

    decision = AUTO;
end


function overlay = applyHeatmapOverlay(img, camMap, alpha)
%APPLYHEATMAPOVERLAY Create a Grad-CAM overlay on the original image.
    camNorm = (camMap - min(camMap(:))) / (max(camMap(:)) - min(camMap(:)) + 1e-9);
    camUint8 = uint8(camNorm * 255);

    % Jet colormap
    cmap = jet(256);
    heatR = uint8(reshape(cmap(camUint8 + 1, 1), size(camUint8)) * 255);
    heatG = uint8(reshape(cmap(camUint8 + 1, 2), size(camUint8)) * 255);
    heatB = uint8(reshape(cmap(camUint8 + 1, 3), size(camUint8)) * 255);
    heatmap = cat(3, heatR, heatG, heatB);

    % Blend
    overlay = uint8(double(img) * (1 - alpha) + double(heatmap) * alpha);
end

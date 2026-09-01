function [report] = generateReport(screeningResult, originalImg)
%GENERATEREPORT Generate a structured clinical report from screening results.
%   [REPORT] = generateReport(SCREENINGRESULT, ORIGINALIMG)
%
%   Takes the output of runDRScreening and produces:
%     1. Visual overlay: original + Grad-CAM + lesion contours (composite)
%     2. Structured summary for health worker display
%     3. Machine-readable JSON record for local storage / sync
%
%   INPUTS:
%       screeningResult - struct from runDRScreening()
%       originalImg     - H x W x 3 uint8 original fundus image
%
%   OUTPUT:
%       report - struct with fields:
%           .overlayImage     (uint8 HxWx3) Annotated composite image
%           .summary          (struct) Human-readable summary
%           .jsonRecord       (string) JSON for local store / dashboard sync
%           .action           (struct) From actionMapping
%           .timestamp        (string) ISO 8601 timestamp

    r = screeningResult;

    % ── Generate action recommendation ──
    action = actionMapping(r.icdrGrade, r.referableFlag, ...
                           r.confidence, r.routingDecision);

    % ── Build visual overlay ──
    overlayImage = r.gradcamOverlay;

    % Add annotation text to the overlay
    stageNames = {'No DR', 'Mild NPDR', 'Moderate NPDR', 'Severe NPDR', 'PDR'};
    if r.icdrGrade >= 0 && r.icdrGrade <= 4
        gradeName = stageNames{r.icdrGrade + 1};
    else
        gradeName = 'N/A';
    end

    % ── Build structured summary ──
    summary = struct();
    summary.qualityScore = round(r.qualityScore, 3);
    summary.qualityStatus = qualityLabel(r.qualityClass);
    summary.enhanced = r.enhanced;

    summary.icdrGrade = r.icdrGrade;
    summary.gradeName = gradeName;
    summary.referableDR = r.referableFlag;
    summary.referableProbability = round(r.referableProb, 4);
    summary.confidence = round(r.confidence, 4);

    routeLabels = {'AUTO_GRADE', 'REFER_TO_HUMAN'};
    if r.routingDecision >= 1 && r.routingDecision <= 2
        summary.routingDecision = routeLabels{r.routingDecision};
    else
        summary.routingDecision = 'UNKNOWN';
    end

    summary.vesselDensity = round(r.vesselDensity, 4);
    summary.lesionCounts = r.lesionCounts;
    summary.discCenter = round(r.discCenter, 1);
    summary.foveaCenter = round(r.foveaCenter, 1);

    summary.recommendedAction = action.text;
    summary.urgency = action.urgency;
    summary.timeframe = action.timeframe;
    summary.requiresSpecialistReview = action.requiresReview;

    summary.latencyMs = round(r.latencyMs, 1);

    % ── Machine-readable JSON record ──
    % For local SQLite storage and opportunistic sync to central dashboard
    record = struct();
    record.pipeline = 'optigemma-v2-matlab';
    record.timestamp = datestr(now, 'yyyy-mm-ddTHH:MM:SS');
    record.iqa = struct('score', r.qualityScore, 'class', r.qualityClass, ...
                         'enhanced', r.enhanced);
    record.grading = struct('icdr_grade', r.icdrGrade, ...
                             'referable', r.referableFlag, ...
                             'referable_prob', r.referableProb, ...
                             'confidence', r.confidence, ...
                             'routing', summary.routingDecision, ...
                             'probs', r.gradeProbs);
    record.structures = struct('vessel_density', r.vesselDensity, ...
                                'disc_center', r.discCenter, ...
                                'fovea_center', r.foveaCenter, ...
                                'lesions', r.lesionCounts);
    record.action = struct('code', action.code, ...
                            'urgency', action.urgency, ...
                            'timeframe', action.timeframe, ...
                            'requires_review', action.requiresReview);
    record.latency_ms = r.latencyMs;

    jsonRecord = jsonencode(record);

    % ── Assemble report ──
    report = struct();
    report.overlayImage = overlayImage;
    report.summary = summary;
    report.jsonRecord = jsonRecord;
    report.action = action;
    report.timestamp = record.timestamp;

    % ── Print human-readable report ──
    fprintf('\n');
    fprintf('╔%.0s', 1:60);
    fprintf('╗\n');
    fprintf('║  OptiGemma DR Screening Report');
    fprintf('%*.s║\n', 29, '');
    fprintf('║  %s', record.timestamp);
    fprintf('%*.s║\n', 41 - length(record.timestamp), '');
    fprintf('╠%.0s', 1:60);
    fprintf('╣\n');

    fprintf('║  Image Quality: %.2f (%s)', r.qualityScore, summary.qualityStatus);
    fprintf('%*.s║\n', max(1, 35 - length(summary.qualityStatus)), '');

    fprintf('║  ICDR Grade: %d — %s', r.icdrGrade, gradeName);
    fprintf('%*.s║\n', max(1, 39 - length(gradeName)), '');

    fprintf('║  Referable DR: %s (prob=%.2f)', yesNo(r.referableFlag), r.referableProb);
    fprintf('%*.s║\n', max(1, 23 - length(yesNo(r.referableFlag))), '');

    fprintf('║  Confidence: %.0f%%', r.confidence * 100);
    fprintf('%*.s║\n', max(1, 39), '');

    fprintf('║  Routing: %s', summary.routingDecision);
    fprintf('%*.s║\n', max(1, 48 - length(summary.routingDecision)), '');

    fprintf('╠%.0s', 1:60);
    fprintf('╣\n');

    fprintf('║  RECOMMENDED ACTION:');
    fprintf('%*.s║\n', max(1, 39), '');

    % Word-wrap action text
    actionText = action.text;
    maxLineLen = 56;
    while length(actionText) > 0
        if length(actionText) <= maxLineLen
            fprintf('║  %s', actionText);
            fprintf('%*.s║\n', max(1, maxLineLen - length(actionText) + 2), '');
            actionText = '';
        else
            breakIdx = maxLineLen;
            spaceIdx = find(actionText(1:maxLineLen) == ' ', 1, 'last');
            if ~isempty(spaceIdx)
                breakIdx = spaceIdx;
            end
            fprintf('║  %s', actionText(1:breakIdx));
            fprintf('%*.s║\n', max(1, maxLineLen - breakIdx + 2), '');
            actionText = strtrim(actionText(breakIdx+1:end));
        end
    end

    if action.requiresReview
        fprintf('║  ⚠️  REQUIRES SPECIALIST REVIEW');
        fprintf('%*.s║\n', max(1, 27), '');
    end

    fprintf('╠%.0s', 1:60);
    fprintf('╣\n');
    fprintf('║  Urgency: %s | Timeframe: %s', action.urgency, action.timeframe);
    fprintf('%*.s║\n', max(1, 25 - length(action.urgency) - length(action.timeframe)), '');
    fprintf('║  Latency: %.0f ms', r.latencyMs);
    fprintf('%*.s║\n', max(1, 41), '');
    fprintf('╚%.0s', 1:60);
    fprintf('╝\n\n');
end


function label = qualityLabel(classCode)
    switch classCode
        case 1, label = 'PASS';
        case 2, label = 'BORDERLINE (enhanced)';
        case 3, label = 'REJECT';
        otherwise, label = 'UNKNOWN';
    end
end


function s = yesNo(flag)
    if flag
        s = 'YES';
    else
        s = 'NO';
    end
end

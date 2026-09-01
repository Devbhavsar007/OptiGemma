function testEnhancement(imageFolder)
%TESTENHANCEMENT Before/after comparison of enhancement on BORDERLINE images.
%   testEnhancement(IMAGEFOLDER) runs assessQuality on each image, identifies
%   BORDERLINE cases, applies enhanceImage, and reports quality improvement.
%
%   Usage:
%       testEnhancement('sample_data/')

    if nargin < 1
        imageFolder = 'sample_data';
    end

    extensions = {'*.png', '*.jpg', '*.jpeg', '*.bmp', '*.tif', '*.tiff'};
    files = [];
    for i = 1:length(extensions)
        found = dir(fullfile(imageFolder, extensions{i}));
        files = [files; found]; %#ok<AGROW>
    end

    if isempty(files)
        fprintf('[ERROR] No images found in: %s\n', imageFolder);
        return;
    end

    fprintf('\n');
    fprintf('=%.0s', 1:90);
    fprintf('\n');
    fprintf('  OptiGemma Enhancement Test — Before/After Quality Comparison\n');
    fprintf('  Folder: %s\n', imageFolder);
    fprintf('=%.0s', 1:90);
    fprintf('\n\n');

    nBorderline = 0;
    nImproved   = 0;
    nMovedToPass = 0;
    nDegraded   = 0;

    for i = 1:length(files)
        filePath = fullfile(files(i).folder, files(i).name);

        try
            img = imread(filePath);
        catch
            continue;
        end

        if size(img, 3) == 1
            img = cat(3, img, img, img);
        end

        % Run quality assessment on original
        resultBefore = assessQuality(img);

        % Only process BORDERLINE images (classification == 2)
        if resultBefore.classification ~= 2
            continue;
        end

        nBorderline = nBorderline + 1;

        % Apply enhancement
        enhanced = enhanceImage(img);

        % Re-assess quality on enhanced image
        resultAfter = assessQuality(enhanced);

        % Report
        classLabels = {'PASS', 'BORDERLINE', 'REJECT'};
        improveDelta = resultAfter.qualityScore - resultBefore.qualityScore;

        dispName = files(i).name;
        if length(dispName) > 30
            dispName = [dispName(1:27), '...'];
        end

        fprintf('  %s\n', dispName);
        fprintf('    BEFORE: score=%.3f  focus=%.1f  bright=%.1f  contrast=%.1f  -> %s\n', ...
            resultBefore.qualityScore, resultBefore.focusScore, ...
            resultBefore.brightnessScore, resultBefore.contrastScore, ...
            classLabels{resultBefore.classification});
        fprintf('    AFTER:  score=%.3f  focus=%.1f  bright=%.1f  contrast=%.1f  -> %s', ...
            resultAfter.qualityScore, resultAfter.focusScore, ...
            resultAfter.brightnessScore, resultAfter.contrastScore, ...
            classLabels{resultAfter.classification});

        if improveDelta > 0
            fprintf('  [+%.3f IMPROVED]\n', improveDelta);
            nImproved = nImproved + 1;
        elseif improveDelta < 0
            fprintf('  [%.3f DEGRADED]\n', improveDelta);
            nDegraded = nDegraded + 1;
        else
            fprintf('  [NO CHANGE]\n');
        end

        if resultAfter.classification == 1  % moved to PASS
            nMovedToPass = nMovedToPass + 1;
            fprintf('    >>> PROMOTED TO PASS\n');
        end
        fprintf('\n');
    end

    % Summary
    fprintf('-%.0s', 1:90);
    fprintf('\n');
    fprintf('  SUMMARY:\n');
    fprintf('    Total BORDERLINE images: %d\n', nBorderline);
    fprintf('    Improved (score increase): %d\n', nImproved);
    fprintf('    Moved to PASS: %d\n', nMovedToPass);
    fprintf('    Degraded (score decrease): %d\n', nDegraded);
    fprintf('\n');

    % Acceptance criteria
    fprintf('  ACCEPTANCE CRITERIA:\n');
    if nBorderline > 0
        pctImproved = nImproved / nBorderline * 100;
        fprintf('    [%s] Enhancement improves quality score on %.0f%% of BORDERLINE images\n', ...
            ternaryCheck(pctImproved > 50), pctImproved);
        fprintf('    [%s] No BORDERLINE images degraded to REJECT\n', ...
            ternaryCheck(nDegraded == 0));
    else
        fprintf('    [!] No BORDERLINE images found — test with intentionally degraded images\n');
    end
    fprintf('=%.0s', 1:90);
    fprintf('\n\n');
end


function s = ternaryCheck(condition)
    if condition
        s = char(9989);
    else
        s = char(10060);
    end
end

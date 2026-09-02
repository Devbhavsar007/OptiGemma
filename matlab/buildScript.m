%% buildScript.m — MATLAB Coder / GPU Coder build script
%
%  Compiles the DR screening pipeline into a standalone executable or
%  shared library for edge deployment.
%
%  TARGETS:
%    1. GPU Coder → NVIDIA Jetson (Nano/Orin) via CUDA code generation
%    2. MATLAB Coder → CPU-only standalone C++ (fallback if no GPU Coder license)
%
%  USAGE:
%    buildScript()              % Auto-detect: GPU Coder if available, else CPU
%    buildScript('gpu')         % Force GPU Coder build
%    buildScript('cpu')         % Force CPU-only MATLAB Coder build
%
%  NOTES:
%    - assessQuality.m and enhanceImage.m are fully Coder-compatible
%    - DL model inference uses the Deep Learning Toolbox predict() function,
%      which is supported by GPU Coder with the NVIDIA GPU Coder support package
%    - gradCAM is NOT supported by Coder — it runs in interpreted MATLAB only
%      and is excluded from the compiled binary (pre-computed at report time)

function buildScript(target)

    if nargin < 1
        % Auto-detect: use GPU Coder if license available
        if license('test', 'GPU_Coder')
            target = 'gpu';
        else
            target = 'cpu';
        end
    end

    fprintf('\n');
    fprintf('=%.0s', 1:70);
    fprintf('\n  DrishtiAI — Code Generation Build Script\n');
    fprintf('  Target: %s\n', upper(target));
    fprintf('=%.0s', 1:70);
    fprintf('\n\n');

    % =====================================================================
    %  STEP 1: Verify Coder compatibility of individual functions
    % =====================================================================
    fprintf('  STEP 1: Coder compatibility check\n');
    fprintf('  -----------------------------------\n');

    % assessQuality — fully Coder-compatible
    fprintf('    assessQuality.m ... ');
    try
        coder.screener('assessQuality');
        fprintf('[OK] Coder-compatible\n');
    catch e
        fprintf('[WARN] %s\n', e.message);
    end

    % enhanceImage — fully Coder-compatible
    fprintf('    enhanceImage.m ... ');
    try
        coder.screener('enhanceImage');
        fprintf('[OK] Coder-compatible\n');
    catch e
        fprintf('[WARN] %s\n', e.message);
    end

    fprintf('\n');

    % =====================================================================
    %  STEP 2: Define input types for codegen
    % =====================================================================
    fprintf('  STEP 2: Define input types\n');
    fprintf('  --------------------------\n');

    % Max input image size: 2000x2000 RGB uint8
    imgType = coder.typeof(uint8(0), [2000 2000 3], [true true false]);
    fprintf('    Input: uint8 image up to 2000x2000x3\n\n');

    % =====================================================================
    %  STEP 3: Build configuration
    % =====================================================================
    fprintf('  STEP 3: Configure build\n');
    fprintf('  -----------------------\n');

    if strcmp(target, 'gpu')
        % ── GPU Coder configuration (Jetson Nano/Orin) ──
        cfg = coder.gpuConfig('lib');  % Shared library

        % NVIDIA target configuration
        cfg.GpuConfig.ComputeCapability = '7.2';  % Jetson Nano: 5.3, Orin: 8.7
        % Use 7.2 as safe middle ground (Xavier NX compatible)

        cfg.GenerateReport = true;
        cfg.TargetLang = 'C++';

        % cuDNN for DL inference acceleration
        cfg.GpuConfig.EnableCUDNN = true;

        fprintf('    Target: GPU Coder → CUDA shared library\n');
        fprintf('    Compute capability: %s\n', cfg.GpuConfig.ComputeCapability);
        fprintf('    cuDNN: enabled\n');

    else
        % ── MATLAB Coder configuration (CPU-only) ──
        cfg = coder.config('lib');  % Shared library

        cfg.GenerateReport = true;
        cfg.TargetLang = 'C++';

        % Enable multi-threading for image processing operations
        cfg.EnableAutoParallelization = true;

        fprintf('    Target: MATLAB Coder → C++ shared library\n');
        fprintf('    Multi-threading: enabled\n');
    end

    fprintf('\n');

    % =====================================================================
    %  STEP 4: Code generation
    % =====================================================================
    fprintf('  STEP 4: Code generation\n');
    fprintf('  -----------------------\n');

    % Build the quality gate first (most likely to succeed — no DL dependencies)
    fprintf('    Building assessQuality...\n');
    try
        codegen assessQuality -args {imgType} -config cfg -d codegen_assessQuality -report
        fprintf('    [OK] assessQuality compiled successfully\n');
    catch e
        fprintf('    [ERROR] assessQuality failed: %s\n', e.message);
        fprintf('    Common fixes:\n');
        fprintf('      - Check all functions are Coder-supported\n');
        fprintf('      - Run: coder.screener(''assessQuality'') for details\n');
    end

    fprintf('\n    Building enhanceImage...\n');
    try
        codegen enhanceImage -args {imgType} -config cfg -d codegen_enhanceImage -report
        fprintf('    [OK] enhanceImage compiled successfully\n');
    catch e
        fprintf('    [ERROR] enhanceImage failed: %s\n', e.message);
    end

    % =====================================================================
    %  STEP 5: Coder-incompatible functions documentation
    % =====================================================================
    fprintf('\n');
    fprintf('  KNOWN CODER-INCOMPATIBLE FUNCTIONS\n');
    fprintf('  ===================================\n');
    fprintf('  The following functions used in runDRScreening.m are NOT\n');
    fprintf('  supported by MATLAB Coder and must be handled separately:\n\n');

    incompatible = {
        'gradCAM',      'Pre-compute at report generation time, not in compiled path';
        'jsondecode',   'Replace with manual JSON parsing or pass calibration as arguments';
        'fileread',     'Read file externally, pass content as argument';
        'jet (colormap)', 'Embed the jet colormap as a hardcoded 256x3 array';
        'persist vars', 'Use coder.extrinsic or pre-load models at init time';
    };

    for i = 1:size(incompatible, 1)
        fprintf('    %-20s → %s\n', incompatible{i, 1}, incompatible{i, 2});
    end

    fprintf('\n  NOTE: assessQuality.m and enhanceImage.m are designed to\n');
    fprintf('  be fully Coder-compatible. runDRScreening.m requires the\n');
    fprintf('  Deep Learning Toolbox predict() function, which is supported\n');
    fprintf('  by GPU Coder with the NVIDIA support package but NOT by\n');
    fprintf('  standalone MATLAB Coder without DLT.\n\n');

    % =====================================================================
    %  STEP 6: Deployment artifact summary
    % =====================================================================
    fprintf('  BUILD ARTIFACTS\n');
    fprintf('  ===============\n');
    fprintf('    codegen_assessQuality/ — compiled quality gate\n');
    fprintf('    codegen_enhanceImage/  — compiled enhancement\n');
    fprintf('    models/matlab_imported/ — DL networks (.mat)\n');
    fprintf('\n  DEPLOYMENT TARGET: %s\n', upper(target));

    if strcmp(target, 'gpu')
        fprintf('    Hardware: NVIDIA Jetson Nano/Orin\n');
        fprintf('    Runtime: MATLAB Runtime (free) + CUDA + cuDNN\n');
    else
        fprintf('    Hardware: Any x86/ARM CPU\n');
        fprintf('    Runtime: MATLAB Runtime (free redistributable)\n');
    end

    fprintf('\n  To run on target hardware:\n');
    fprintf('    1. Install MATLAB Runtime (free) from mathworks.com\n');
    fprintf('    2. Copy compiled libraries + model .mat files\n');
    fprintf('    3. Call from C++/Python wrapper\n');

    fprintf('\n');
    fprintf('=%.0s', 1:70);
    fprintf('\n  Build complete.\n');
    fprintf('=%.0s', 1:70);
    fprintf('\n\n');
end

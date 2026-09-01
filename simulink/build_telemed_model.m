%% ========================================================================
%  OptiGemma — Module 5: Simulink telemedicine screening workflow model
%  (SIH deliverable: "Model the telemedicine screening pipeline in Simulink")
%
%  Models, per district-level program serving 100,000+ patients / year:
%    - fundus image acquisition rate (portable camera at PHC / camp van)
%    - IQA quality gate (reject -> recapture feedback loop)
%    - inference throughput constraint (GPU server processing time/image)
%    - bandwidth constraint (compressed JPEG uplink, kbps)
%    - ophthalmologist review queue (human-in-the-loop capacity)
%  Outputs: utilization scopes + To Workspace logs for resource allocation.
%
%  RUN:  >> build_telemed_model; sim('dr_telemed_model'); then inspect
%        >> plot(simout.utilization.Time, simout.utilization.Data)
%
%  NOTE: replace the MATLAB Function stubs with codegen'd versions of
%  engine/pipeline/iqa.py and engine/pipeline/structures.py for deployment,
%  or import the trained grading model via importONNXFunction / Deep
%  Learning Toolbox "Image Classifier" block after torch.onnx.export().
% ========================================================================

function build_telemed_model()
    model = 'dr_telemed_model';
    if bdIsLoaded(model), close_system(model, 0); end
    new_system(model);
    open_system(model);

    % ---------------- parameters (base workspace) ----------------
    assignin('base', 'acq_rate',        0.2);   % images/sec (1 img / 5 s per operator)
    assignin('base', 'reject_rate',     0.12);  % IQA reject fraction -> recapture
    assignin('base', 'infer_time',      0.8);   % s/image GPU server inference
    assignin('base', 'bandwidth_kbps',  512);   % rural uplink capacity
    assignin('base', 'jpeg_kb',         180);   % compressed image size
    assignin('base', 'review_time',     30/60); % min/image ophthalmologist (<30s SLA)
    assignin('base', 'reviewers',       3);     % ophthalmologists on duty

    %% ---------------- blocks ----------------
    add_block('simulink/Sources/Pulse Generator', [model '/Acquisition'], ...
        'Amplitude', '1', 'Period', '1/acq_rate', 'PulseWidth', '10', ...
        'Position', [50 100 110 140]);

    add_block('simulink/User-Defined Functions/MATLAB Function', [model '/IQA_Gate'], ...
        'Position', [170 95 280 145]);
    set_param([model '/IQA_Gate'], 'FunctionScript', sprintf([ ...
        'function graded = iqa_gate(img)\n' ...
        '%%#codegen\n' ...
        '% placeholder: replace with codegen of engine/pipeline/iqa.py\n' ...
        'persistent rng_state\n' ...
        'graded = 1 - reject_rate * randi([0 1]);\n' ...
        'end']), 'InitFcn');

    add_block('simulink/Discrete/Discrete-Time Integrator', [model '/Screened_Counter'], ...
        'SampleTime', '-1', 'Position', [350 100 430 140]);

    add_block('simulink/User-Defined Functions/MATLAB Function', [model '/Inference_Throughput'], ...
        'Position', [500 95 620 145]);
    set_param([model '/Inference_Throughput'], 'FunctionScript', sprintf([ ...
        'function load = infer_load(imgs_in)\n' ...
        '%%#codegen\n' ...
        'load = imgs_in * infer_time;\n' ...
        'end']));

    % Bandwidth: required kbps vs available
    add_block('simulink/Math Operations/Gain', [model '/Required_kbps'], ...
        'Gain', 'jpeg_kb*8/acq_rate/1000', 'Position', [500 200 580 240]);
    add_block('simulink/Sources/Constant', [model '/Link_Capacity'], ...
        'Value', 'bandwidth_kbps', 'Position', [500 280 580 320]);
    add_block('simulink/Math Operations/MinMax', [model '/Bottleneck_Check'], ...
        'Inputs', '2', 'Position', [650 230 710 290]);

    % Review queue: discrete-event approximation via rate transition + delay
    add_block('simulink/Discrete/Discrete-Time Integrator', [model '/Review_Backlog'], ...
        'Gain', 'reviewers/review_time', 'SampleTime', '60', ...
        'Position', [350 380 470 440], 'Operator', '-');
    add_block('simulink/Sinks/To Workspace', [model '/simout'], ...
        'VariableName', 'simout', 'SaveFormat', 'Structure With Time', ...
        'Position', [800 150 880 190]);

    % ---------------- wiring ----------------
    add_line(model, 'Acquisition/1', 'IQA_Gate/1');
    add_line(model, 'IQA_Gate/1', 'Screened_Counter/1');
    add_line(model, 'Screened_Counter/1', 'Inference_Throughput/1');
    add_line(model, 'Screened_Counter/1', 'Required_kbps/1');
    add_line(model, 'Inference_Throughput/1', 'Bottleneck_Check/1');
    add_line(model, 'Link_Capacity/1', 'Bottleneck_Check/2');
    add_line(model, 'Bottleneck_Check/1', 'simout/1');

    % solver settings for a 1-year horizon in accelerated sim
    set_param(model, 'StopTime', '3600*12*220');   % 12 h/day x 220 camp days
    set_param(model, 'Solver', 'FixedStepDiscrete', 'FixedStep', '1');
    save_system(model);
    fprintf('Model %s built. Run: sim(''%s'')\n', model, model);
end

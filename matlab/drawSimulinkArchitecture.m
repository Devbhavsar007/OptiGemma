function drawSimulinkArchitecture()
    % Draws a pure Simulink block diagram of the pipeline for screenshots.
    % Does not require a Stateflow license!
    
    model = 'DR_Pipeline_Architecture';
    
    % Close if already open
    if bdIsLoaded(model)
        close_system(model, 0);
    end
    
    % Create and open new model
    new_system(model);
    open_system(model);

    % Block definitions: {Name, [left, top, right, bottom]}
    blocks = {
        'Image Capture',       [50, 100, 170, 160];
        'Quality Gate',        [250, 100, 370, 160];
        'Image Enhancement',   [450, 20, 570, 80];
        'AI Segmentation',     [450, 180, 570, 240];
        'DR Grading Model',    [650, 180, 770, 240];
        'Report & Sync',       [850, 180, 970, 240];
    };

    % Create Subsystems and setup ports
    for i = 1:size(blocks, 1)
        name = blocks{i, 1};
        pos = blocks{i, 2};
        
        blockPath = [model '/' name];
        add_block('simulink/Ports & Subsystems/Subsystem', blockPath, 'Position', pos);
        
        % Configure ports based on block type
        Simulink.SubSystem.deleteContents(blockPath); % Clear default ports
        
        switch name
            case 'Image Capture'
                add_block('simulink/Sinks/Out1', [blockPath '/Out1']);
            case 'Quality Gate'
                add_block('simulink/Sources/In1', [blockPath '/In1']);
                add_block('simulink/Sinks/Out1', [blockPath '/Out1']); % To Enhancement
                add_block('simulink/Sinks/Out1', [blockPath '/Out2']); % To Segmentation
            case 'AI Segmentation'
                add_block('simulink/Sources/In1', [blockPath '/In1']); % From QG
                add_block('simulink/Sources/In1', [blockPath '/In2']); % From Enhancement
                add_block('simulink/Sinks/Out1', [blockPath '/Out1']);
            case 'Report & Sync'
                add_block('simulink/Sources/In1', [blockPath '/In1']);
            otherwise
                % Default 1-in, 1-out
                add_block('simulink/Sources/In1', [blockPath '/In1']);
                add_block('simulink/Sinks/Out1', [blockPath '/Out1']);
        end
        
        % Style the block
        set_param(blockPath, 'BackgroundColor', 'lightblue');
        set_param(blockPath, 'DropShadow', 'on');
        set_param(blockPath, 'FontSize', '12');
        set_param(blockPath, 'FontWeight', 'bold');
    end

    % Connect the blocks
    add_line(model, 'Image Capture/1', 'Quality Gate/1', 'autorouting', 'on');
    add_line(model, 'Quality Gate/1', 'Image Enhancement/1', 'autorouting', 'on');
    add_line(model, 'Quality Gate/2', 'AI Segmentation/1', 'autorouting', 'on');
    add_line(model, 'Image Enhancement/1', 'AI Segmentation/2', 'autorouting', 'on');
    add_line(model, 'AI Segmentation/1', 'DR Grading Model/1', 'autorouting', 'on');
    add_line(model, 'DR Grading Model/1', 'Report & Sync/1', 'autorouting', 'on');

    % Adjust view
    set_param(model, 'ZoomFactor', '120');
    
    fprintf('\n✅ Simulink Architecture Diagram generated successfully!\n');
    fprintf('   You can now take a screenshot of the model window.\n\n');
end

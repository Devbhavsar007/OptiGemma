function [action] = actionMapping(grade, referableFlag, confidence, routingDecision)
%ACTIONMAPPING Deterministic clinical action lookup table.
%   [ACTION] = actionMapping(GRADE, REFERABLEFLAG, CONFIDENCE, ROUTINGDECISION)
%
%   Maps the combination of (ICDR grade, referable flag, confidence level,
%   routing decision) to a specific clinical action string.
%
%   This mapping is DETERMINISTIC and EXPLICIT — the complete decision logic
%   is visible in this single function, not buried across multiple modules.
%   This is the mechanism that prevents the tool from acting as an
%   unaccountable black box.
%
%   INPUTS:
%       grade            - int32, ICDR severity 0-4
%       referableFlag    - logical, true if grade >= 2
%       confidence       - double, calibrated confidence 0-1
%       routingDecision  - int32, 1=AUTO_GRADE, 2=REFER_TO_HUMAN
%
%   OUTPUT:
%       action - struct with fields:
%           .code         (string) Machine-readable action code
%           .text         (string) Plain-language recommended action
%           .urgency      (string) ROUTINE / SOON / URGENT / EMERGENCY
%           .timeframe    (string) When to act
%           .requiresReview (logical) Whether specialist review banner needed
%
%   ACTION MAPPING TABLE:
%   ┌───────┬───────────┬──────────┬─────────┬──────────────────────────────────┐
%   │ Grade │ Referable │ Conf     │ Route   │ Action                           │
%   ├───────┼───────────┼──────────┼─────────┼──────────────────────────────────┤
%   │ 0     │ No        │ High     │ AUTO    │ No DR. Annual screening.         │
%   │ 0     │ No        │ Low      │ REFER   │ Low-conf normal. Review 4 wks.   │
%   │ 1     │ No        │ High     │ AUTO    │ Mild NPDR. Follow up 6-12 mo.    │
%   │ 1     │ No        │ Low      │ REFER   │ Possible mild. Review 4 wks.     │
%   │ 2     │ Yes       │ High     │ AUTO    │ Moderate NPDR. Refer 2 wks.      │
%   │ 2     │ Yes       │ Low      │ REFER   │ Possible moderate. Review 1 wk.  │
%   │ 3     │ Yes       │ High     │ AUTO    │ Severe NPDR. Urgent 1 wk.        │
%   │ 3     │ Yes       │ Low      │ REFER   │ Possible severe. Review 3 days.  │
%   │ 4     │ Yes       │ Any      │ REFER   │ PDR. EMERGENCY same-day.         │
%   └───────┴───────────┴──────────┴─────────┴──────────────────────────────────┘

    % Initialize output
    action = struct();
    action.requiresReview = false;

    isLowConf = (routingDecision == 2);  % REFER_TO_HUMAN

    switch grade
        case 0
            if ~isLowConf
                action.code     = 'NO_DR_NORMAL';
                action.text     = 'No diabetic retinopathy detected. Routine annual screening recommended.';
                action.urgency  = 'ROUTINE';
                action.timeframe = '12 months';
            else
                action.code     = 'NO_DR_LOW_CONF';
                action.text     = 'Low-confidence normal finding. Recommend specialist review within 4 weeks.';
                action.urgency  = 'SOON';
                action.timeframe = '4 weeks';
                action.requiresReview = true;
            end

        case 1
            if ~isLowConf
                action.code     = 'MILD_NPDR';
                action.text     = 'Mild NPDR detected. Follow up in 6-12 months.';
                action.urgency  = 'ROUTINE';
                action.timeframe = '6-12 months';
            else
                action.code     = 'MILD_NPDR_LOW_CONF';
                action.text     = 'Possible mild NPDR but low confidence. Specialist review within 4 weeks.';
                action.urgency  = 'SOON';
                action.timeframe = '4 weeks';
                action.requiresReview = true;
            end

        case 2
            if ~isLowConf
                action.code     = 'MODERATE_NPDR_REFERABLE';
                action.text     = 'Moderate NPDR - referable DR. Refer to ophthalmologist within 2 weeks.';
                action.urgency  = 'URGENT';
                action.timeframe = '2 weeks';
            else
                action.code     = 'MODERATE_NPDR_LOW_CONF';
                action.text     = 'Possible moderate NPDR. Urgent specialist review within 1 week.';
                action.urgency  = 'URGENT';
                action.timeframe = '1 week';
                action.requiresReview = true;
            end

        case 3
            if ~isLowConf
                action.code     = 'SEVERE_NPDR_REFERABLE';
                action.text     = 'Severe NPDR - referable DR. Urgent ophthalmology referral within 1 week.';
                action.urgency  = 'URGENT';
                action.timeframe = '1 week';
            else
                action.code     = 'SEVERE_NPDR_LOW_CONF';
                action.text     = 'Possible severe NPDR. Urgent specialist review within 3 days.';
                action.urgency  = 'URGENT';
                action.timeframe = '3 days';
                action.requiresReview = true;
            end

        case 4
            % PDR is ALWAYS an emergency, regardless of confidence
            action.code     = 'PDR_EMERGENCY';
            action.text     = 'Proliferative DR suspected. EMERGENCY - same-day ophthalmology referral.';
            action.urgency  = 'EMERGENCY';
            action.timeframe = 'Same day';
            action.requiresReview = true;

        otherwise
            action.code     = 'UNKNOWN';
            action.text     = 'Unable to determine grade. Specialist review required.';
            action.urgency  = 'URGENT';
            action.timeframe = '1 week';
            action.requiresReview = true;
    end

    % Append confidence info to action text
    action.text = sprintf('%s [Confidence: %.0f%%]', action.text, confidence * 100);
end

import React from 'react';
import { DRStage, DR_STAGES } from '../types';

interface DualCodedBadgeProps {
  stage: DRStage;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDetails?: boolean;
  className?: string;
}

export const DualCodedBadge: React.FC<DualCodedBadgeProps> = ({
  stage,
  size = 'md',
  showDetails = false,
  className = '',
}) => {
  const meta = DR_STAGES[stage] || DR_STAGES[0];

  // Size styling maps
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    md: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
    lg: 'text-base px-4 py-2 gap-2.5 font-bold',
    xl: 'text-lg px-5 py-2.5 gap-3 font-bold',
  };

  const iconSizes = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base',
    xl: 'w-7 h-7 text-lg',
  };

  return (
    <div
      className={`inline-flex items-center rounded-lg border shadow-sm transition-all select-none ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: meta.bgLight,
        borderColor: meta.borderColor,
        color: meta.textColor,
      }}
      role="status"
      aria-label={`Diabetic Retinopathy ${meta.name}, Severity level ${stage} of 4`}
    >
      {/* Visual Shape / Icon Coded Container */}
      <span
        className={`inline-flex items-center justify-center rounded-md font-bold text-white shadow-inner shrink-0 ${iconSizes[size]}`}
        style={{ backgroundColor: meta.color }}
        aria-hidden="true"
      >
        {meta.icon}
      </span>

      {/* Text Label + Stage Number */}
      <span className="whitespace-nowrap font-bold tracking-tight">
        {meta.name}
      </span>

      {showDetails && (
        <span className="text-xs opacity-90 font-mono pl-1 border-l border-current">
          Level {stage}/4
        </span>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Eye, Layers, Flame, SunMedium, Move } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalUrl: string;
  vesselUrl: string;
  heatmapUrl: string;
  title: string;
  patientName?: string;
  stageName?: string;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  originalUrl,
  vesselUrl,
  heatmapUrl,
  title,
  patientName,
  stageName,
}) => {
  const [activeTab, setActiveTab] = useState<'original' | 'vessels' | 'heatmap'>('original');
  const [zoom, setZoom] = useState<number>(1);
  const [isInverted, setIsInverted] = useState<boolean>(false);
  const [isHighContrastFilter, setIsHighContrastFilter] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 4));
      if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.75));
      if (e.key === '0') setZoom(1);
      if (e.key === 'i' || e.key === 'I') setIsInverted((v) => !v);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentImageUrl =
    activeTab === 'original' ? originalUrl : activeTab === 'vessels' ? vesselUrl : heatmapUrl;

  const tabLabels = {
    original: 'Original Fundus Scan',
    vessels: 'Vessel Segmentation Map',
    heatmap: 'AI Grad-CAM Heatmap',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
    >
      <div className="relative flex flex-col w-full max-w-6xl h-[90vh] bg-[#0B0F19] border-2 border-[#334155] rounded-2xl shadow-2xl overflow-hidden text-[#F8FAFC]">
        {/* Modal Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 bg-[#131B2E] border-b border-[#334155]">
          <div>
            <h2 id="lightbox-title" className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Eye className="w-6 h-6 text-[#38BDF8]" />
              {title}
            </h2>
            <p className="text-sm text-[#94A3B8]">
              {patientName ? `Patient: ${patientName}` : ''} {stageName ? `• Diagnostic Stage: ${stageName}` : ''}
            </p>
          </div>

          {/* Tab Selector Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-[#0F172A] border border-[#334155] rounded-xl">
            <button
              onClick={() => setActiveTab('original')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'original'
                  ? 'bg-[#38BDF8] text-[#0B0F19] shadow-md'
                  : 'text-[#CBD5E1] hover:bg-[#1E293B]'
              }`}
              aria-pressed={activeTab === 'original'}
            >
              <Eye className="w-4 h-4" />
              Original
            </button>
            <button
              onClick={() => setActiveTab('vessels')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'vessels'
                  ? 'bg-[#38BDF8] text-[#0B0F19] shadow-md'
                  : 'text-[#CBD5E1] hover:bg-[#1E293B]'
              }`}
              aria-pressed={activeTab === 'vessels'}
            >
              <Layers className="w-4 h-4" />
              Vessels
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'heatmap'
                  ? 'bg-[#38BDF8] text-[#0B0F19] shadow-md'
                  : 'text-[#CBD5E1] hover:bg-[#1E293B]'
              }`}
              aria-pressed={activeTab === 'heatmap'}
            >
              <Flame className="w-4 h-4 text-orange-400" />
              Grad-CAM
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white border border-[#475569] transition-all"
            aria-label="Close image inspection viewer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Image Stage Canvas */}
        <div className="relative flex-1 flex items-center justify-center bg-[#050811] overflow-auto p-4 select-none">
          <div
            className="transition-transform duration-150 ease-out origin-center"
            style={{
              transform: `scale(${zoom})`,
              filter: `${isInverted ? 'invert(1) hue-rotate(180deg)' : ''} ${
                isHighContrastFilter ? 'contrast(1.6) brightness(1.1)' : ''
              }`,
            }}
          >
            <img
              src={currentImageUrl}
              alt={`${tabLabels[activeTab]} for ${patientName || 'patient'}`}
              className="max-h-[68vh] max-w-full object-contain rounded-xl border border-[#334155] shadow-2xl pointer-events-none"
            />
          </div>

          {/* Low-Vision Quick Indicator HUD */}
          <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md px-3.5 py-2 rounded-lg border border-[#334155] text-xs sm:text-sm font-mono text-[#38BDF8] flex items-center gap-2">
            <Move className="w-4 h-4" />
            <span>Viewing: {tabLabels[activeTab]}</span>
            <span className="text-[#94A3B8]">| Zoom: {Math.round(zoom * 100)}%</span>
            {isInverted && <span className="text-amber-400 font-bold">[INVERTED]</span>}
          </div>
        </div>

        {/* Modal Control Footer Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#131B2E] border-t border-[#334155]">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-[#94A3B8] hidden sm:inline font-mono">
              Shortcuts: [+] Zoom In, [-] Zoom Out, [0] Reset, [I] Invert
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Invert Filter for Low-Vision Hemorrhage Detection */}
            <button
              onClick={() => setIsInverted((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl border transition-all ${
                isInverted
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                  : 'bg-[#1E293B] text-[#CBD5E1] border-[#475569] hover:bg-[#334155]'
              }`}
              title="Toggle Color Invert for subtle lesion contrast"
            >
              <SunMedium className="w-4 h-4" />
              <span>{isInverted ? 'Normal Colors' : 'Invert (Low-Vision)'}</span>
            </button>

            {/* High Contrast Filter */}
            <button
              onClick={() => setIsHighContrastFilter((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl border transition-all ${
                isHighContrastFilter
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400'
                  : 'bg-[#1E293B] text-[#CBD5E1] border-[#475569] hover:bg-[#334155]'
              }`}
            >
              Boost Contrast
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center bg-[#0F172A] border border-[#334155] rounded-xl p-1 gap-1">
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
                className="p-2 text-[#CBD5E1] hover:bg-[#1E293B] rounded-lg transition-colors"
                aria-label="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono text-white font-bold">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
                className="p-2 text-[#CBD5E1] hover:bg-[#1E293B] rounded-lg transition-colors"
                aria-label="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-2 text-[#94A3B8] hover:text-white hover:bg-[#1E293B] rounded-lg transition-colors"
                aria-label="Reset Zoom to 100%"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

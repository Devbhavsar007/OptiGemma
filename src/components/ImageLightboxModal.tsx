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
      <div className="relative flex flex-col w-full max-w-6xl h-[90vh] bg-white border-4 border-white rounded-[36px] shadow-2xl overflow-hidden text-black">
        {/* Modal Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 bg-white border-b border-gray-200">
          <div>
            <h2 id="lightbox-title" className="text-xl sm:text-2xl font-bold flex items-center gap-2 font-sans text-black">
              <Eye className="w-6 h-6 text-[#1E54B7]" />
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              {patientName ? `Patient: ${patientName}` : ''} {stageName ? `• Diagnostic Stage: ${stageName}` : ''}
            </p>
          </div>

          {/* Tab Selector Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-full border border-gray-200">
            <button
              onClick={() => setActiveTab('original')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-black rounded-full transition-all cursor-pointer ${
                activeTab === 'original'
                  ? 'bg-black text-white shadow-md'
                  : 'text-gray-600 hover:text-black hover:bg-gray-200'
              }`}
              aria-pressed={activeTab === 'original'}
            >
              <Eye className="w-3.5 h-3.5" />
              Original
            </button>
            <button
              onClick={() => setActiveTab('vessels')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-black rounded-full transition-all cursor-pointer ${
                activeTab === 'vessels'
                  ? 'bg-black text-white shadow-md'
                  : 'text-gray-600 hover:text-black hover:bg-gray-200'
              }`}
              aria-pressed={activeTab === 'vessels'}
            >
              <Layers className="w-3.5 h-3.5" />
              Vessels
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-black rounded-full transition-all cursor-pointer ${
                activeTab === 'heatmap'
                  ? 'bg-black text-white shadow-md'
                  : 'text-gray-600 hover:text-black hover:bg-gray-200'
              }`}
              aria-pressed={activeTab === 'heatmap'}
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              Grad-CAM
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-black border border-gray-300 transition-all cursor-pointer"
            aria-label="Close image inspection viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Image Stage Canvas */}
        <div className="relative flex-1 flex items-center justify-center bg-gray-950 overflow-auto p-4 select-none">
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
              className="max-h-[66vh] max-w-full object-contain rounded-2xl border-2 border-white/20 shadow-2xl pointer-events-none"
            />
          </div>

          {/* Low-Vision Quick Indicator HUD */}
          <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-mono text-[#E1FA4A] flex items-center gap-2">
            <Move className="w-3.5 h-3.5" />
            <span>Viewing: {tabLabels[activeTab]}</span>
            <span className="text-gray-300">| Zoom: {Math.round(zoom * 100)}%</span>
            {isInverted && <span className="text-amber-400 font-bold">[INVERTED]</span>}
          </div>
        </div>

        {/* Modal Control Footer Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:inline font-mono">
              Shortcuts: [+] Zoom In, [-] Zoom Out, [0] Reset, [I] Invert
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Invert Filter for Low-Vision Hemorrhage Detection */}
            <button
              onClick={() => setIsInverted((v) => !v)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-full border transition-all cursor-pointer ${
                isInverted
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              }`}
              title="Toggle Color Invert for subtle lesion contrast"
            >
              <SunMedium className="w-4 h-4" />
              <span>{isInverted ? 'Normal Colors' : 'Invert (Low-Vision)'}</span>
            </button>

            {/* High Contrast Filter */}
            <button
              onClick={() => setIsHighContrastFilter((v) => !v)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-full border transition-all cursor-pointer ${
                isHighContrastFilter
                  ? 'bg-sky-100 text-[#1E54B7] border-sky-300'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              }`}
            >
              Boost Contrast
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center bg-gray-100 border border-gray-200 rounded-full p-1 gap-1">
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
                className="p-1.5 text-gray-700 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                aria-label="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono text-black font-bold">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
                className="p-1.5 text-gray-700 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                aria-label="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
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

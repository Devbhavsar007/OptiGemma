import React, { useState, useEffect } from 'react';
import {
  Eye,
  Microscope,
  Sparkles,
  Layers,
  Activity,
  AlertTriangle,
  Volume2,
  FileText,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { PRESET_FUNDUS_CASES } from '../data/sampleFundusPresets';
import { DR_STAGES } from '../types';
import { useMedicalData } from '../context/MedicalDataContext';

interface PhoneMockupInteractiveProps {
  onOpenDashboard: () => void;
  selectedCaseIndex: number;
  onSelectCaseIndex: (index: number) => void;
}

export const PhoneMockupInteractive: React.FC<PhoneMockupInteractiveProps> = ({
  onOpenDashboard,
  selectedCaseIndex,
  onSelectCaseIndex,
}) => {
  const { setActiveScan, setActiveView } = useMedicalData();
  const [currentStep, setCurrentStep] = useState<number>(0); // 0: Scanning, 1: Vessels, 2: Heatmap, 3: Diagnosis & Action Plan
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [stepProgress, setStepProgress] = useState<number>(0);
  const [simulatedAudioPlaying, setSimulatedAudioPlaying] = useState<boolean>(false);
  const [simulatedLanguage, setSimulatedLanguage] = useState<'en' | 'hi' | 'gu'>('en');

  const selectedCase = PRESET_FUNDUS_CASES[selectedCaseIndex] || PRESET_FUNDUS_CASES[2];
  const stageMeta = DR_STAGES[selectedCase.stage];

  const STEP_DURATION = 4200; // ms per step in loop
  const TICK_INTERVAL = 50;

  // Auto-loop engineering timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setStepProgress((prev) => {
        const next = prev + (TICK_INTERVAL / STEP_DURATION) * 100;
        if (next >= 100) {
          setCurrentStep((step) => (step + 1) % 4);
          return 0;
        }
        return next;
      });
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, [isPlaying, currentStep]);

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    setStepProgress(0);
  };

  const handleLaunchFullScan = () => {
    setActiveScan(null);
    setActiveView('new-scan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const steps = [
    { id: 0, title: 'Optical Fundus Ingestion', subtitle: '45° Macular Alignment' },
    { id: 1, title: 'Capillary Segmentation', subtitle: 'Frangi Vessel Extraction' },
    { id: 2, title: 'Grad-CAM Attention', subtitle: 'Deep Lesion Localization' },
    { id: 3, title: 'Diagnosis & Action Plan', subtitle: 'Dual-Coded Report' },
  ];

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center">
      {/* 1. Orbiting Floating Metric Badges (Plania-style ambient cards) */}
      <div className="hidden lg:flex absolute -left-12 top-20 z-20 items-center gap-3 p-3.5 bg-[#0F172A]/90 backdrop-blur-xl border-2 border-[#38BDF8]/40 rounded-2xl shadow-2xl shadow-sky-500/20 max-w-[210px] animate-float-slow">
        <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 text-[#38BDF8] flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-black text-white">Gemma-4 Vision</div>
          <div className="text-[11px] font-mono text-emerald-400 font-bold">98.4% AUROC</div>
          <div className="text-[9px] text-[#94A3B8]">EyePACS Benchmark</div>
        </div>
      </div>

      <div className="hidden lg:flex absolute -right-10 top-28 z-20 items-center gap-3 p-3.5 bg-[#0F172A]/90 backdrop-blur-xl border-2 border-emerald-500/40 rounded-2xl shadow-2xl shadow-emerald-500/20 max-w-[220px] animate-float-reverse">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md"
          style={{ backgroundColor: stageMeta.color }}
        >
          {stageMeta.icon}
        </div>
        <div>
          <div className="text-xs font-black text-white">Dual-Coded WCAG AAA</div>
          <div className="text-[11px] font-bold text-[#38BDF8]">{stageMeta.name}</div>
          <div className="text-[9px] text-[#94A3B8]">Okabe-Ito Colorblind Safe</div>
        </div>
      </div>

      <div className="hidden lg:flex absolute -left-8 bottom-28 z-20 items-center gap-3 p-3.5 bg-[#0F172A]/90 backdrop-blur-xl border-2 border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-500/20 max-w-[210px] animate-float-slow">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
          <Volume2 className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-black text-white">Audio Readout</div>
          <div className="text-[11px] font-bold text-[#CBD5E1]">English • हिंदी • ગુજરાતી</div>
          <div className="text-[9px] text-[#94A3B8]">Web Speech Synthesis</div>
        </div>
      </div>

      <div className="hidden lg:flex absolute -right-6 bottom-36 z-20 items-center gap-3 p-3.5 bg-[#0F172A]/90 backdrop-blur-xl border-2 border-indigo-500/40 rounded-2xl shadow-2xl shadow-indigo-500/20 max-w-[210px] animate-float-reverse">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-black text-white">Takeaway PDF</div>
          <div className="text-[11px] font-bold text-emerald-400">18pt+ Large Print</div>
          <div className="text-[9px] text-[#94A3B8]">Instant 1-Click Export</div>
        </div>
      </div>

      {/* 2. Step Progress Tabs & Loop Controls (Top bar above phone) */}
      <div className="w-full max-w-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0F172A]/80 backdrop-blur-md p-2 rounded-2xl border border-[#334155]">
        {/* Step Tabs with live filling progress bars */}
        <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto flex-1">
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                className={`relative p-2 rounded-xl text-left transition-all overflow-hidden ${
                  isActive ? 'bg-[#1E293B] text-white' : 'hover:bg-[#131B2E] text-[#94A3B8]'
                }`}
              >
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider block">
                  0{step.id + 1}
                </div>
                <div className="text-xs font-extrabold truncate text-white">{step.title.split(' ')[0]}</div>

                {/* Fill bar for active step */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#334155]">
                  <div
                    className="h-full bg-[#38BDF8] transition-all duration-75"
                    style={{
                      width: isActive ? `${stepProgress}%` : isCompleted ? '100%' : '0%',
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Play/Pause & Reset Controls */}
        <div className="flex items-center gap-1.5 shrink-0 px-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-xl bg-[#131B2E] hover:bg-[#1E293B] text-[#38BDF8] border border-[#334155] transition-all cursor-pointer"
            title={isPlaying ? 'Pause Auto-Loop' : 'Resume Auto-Loop'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
          <button
            onClick={() => {
              setCurrentStep(0);
              setStepProgress(0);
            }}
            className="p-2 rounded-xl bg-[#131B2E] hover:bg-[#1E293B] text-[#CBD5E1] border border-[#334155] transition-all cursor-pointer"
            title="Restart Loop"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. The 3D Floating Smartphone Frame */}
      <div className="relative w-full max-w-[380px] sm:max-w-[420px] aspect-[9/18.5] rounded-[52px] bg-[#1E293B] p-3 sm:p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_24px_64px_rgba(0,0,0,0.6),0_0_40px_rgba(56,189,248,0.1)] border-[2px] border-slate-700 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
        {/* Outer Titanium Edge Reflection */}
        <div className="absolute inset-0 rounded-[50px] border-[1px] border-white/5 pointer-events-none"></div>

        {/* Phone Inner Screen */}
        <div className="relative w-full h-full rounded-[42px] bg-[#0B0F19] overflow-hidden flex flex-col border border-[#1E293B] text-left">
          {/* Dynamic Island Notch */}
          <div className="relative z-30 pt-3 pb-1 px-6 bg-[#0B0F19] flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-[#94A3B8]">09:41</span>

            {/* Dynamic Island pill */}
            <div className="px-3 py-1 bg-black rounded-full border border-white/10 flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[10px] font-mono text-[#38BDF8] font-bold">Gemma-4 Live</span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]">
              <span>5G</span>
              <div className="w-4 h-2 border border-[#94A3B8] rounded-sm p-0.5 flex">
                <div className="h-full w-3/4 bg-[#38BDF8]"></div>
              </div>
            </div>
          </div>

          {/* Mini App Header in Phone */}
          <div className="px-4 py-2.5 bg-[#0F172A] border-b border-[#334155] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#38BDF8] flex items-center justify-center shadow-sm">
                <Eye className="w-3.5 h-3.5 text-[#0B0F19] stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xs font-black text-white block leading-tight">DrishtiAI</span>
                <span className="text-[9px] text-[#94A3B8] block">Mobile Camp Mode</span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-[#131B2E] p-0.5 rounded-lg border border-[#334155]">
              {(['en', 'hi', 'gu'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSimulatedLanguage(lang)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    simulatedLanguage === lang
                      ? 'bg-[#38BDF8] text-[#0B0F19]'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Phone Screen Dynamic Viewport (Switches based on loop step) */}
          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto overflow-x-hidden relative transition-all duration-300">
            {currentStep === 0 && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Microscope className="w-3.5 h-3.5 text-[#38BDF8]" />
                    Optical Fundus Image
                  </span>
                  <span className="text-[10px] font-mono text-[#1E54B7] bg-sky-500/10 px-2 py-0.5 rounded">
                    Autofocus 45°
                  </span>
                </div>

                {/* Fundus Image with animated laser scan beam */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border-2 border-[#334155] shadow-inner">
                  <img
                    src={selectedCase.originalImage}
                    alt="Fundus"
                    className="w-full h-full object-cover scale-105"
                  />

                  {/* Animated laser scanning line */}
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent shadow-[0_0_15px_#38BDF8] animate-laser" />

                  {/* Target crosshair overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border border-sky-400/40 flex items-center justify-center">
                      <div className="w-2 h-2 bg-[#38BDF8] rounded-full"></div>
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-white">
                    Patient: {selectedCase.patientName} (HbA1c {selectedCase.hba1c}%)
                  </div>
                </div>

                <div className="p-3 bg-[#0F172A] border border-[#334155] rounded-xl text-xs space-y-1">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>Image Quality Check</span>
                    <span className="text-emerald-400 font-mono text-[11px]">PASSED (99.2%)</span>
                  </div>
                  <p className="text-[11px] text-[#CBD5E1]">
                    Macula & optic disc centers detected with zero motion blur.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Frangi Vessel Map
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Multi-Scale Filter
                  </span>
                </div>

                <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/40 shadow-inner">
                  <img
                    src={selectedCase.vesselImage}
                    alt="Vessel Map"
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/80 backdrop-blur-md border border-emerald-500/30 text-[10px] font-mono text-emerald-400 font-bold">
                    Density: {selectedCase.stage > 2 ? '14.8%' : '11.2%'}
                  </div>
                </div>

                <div className="p-3 bg-[#0F172A] border border-[#334155] rounded-xl text-xs space-y-1.5">
                  <div className="font-bold text-white">Microvascular Breakdown:</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-1.5 bg-[#131B2E] rounded border border-[#1E293B]">
                      <span className="text-[#94A3B8] block text-[9px]">Caliber Ratio</span>
                      <span className="font-mono text-white font-bold">0.68 (Normal)</span>
                    </div>
                    <div className="p-1.5 bg-[#131B2E] rounded border border-[#1E293B]">
                      <span className="text-[#94A3B8] block text-[9px]">Microaneurysms</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {selectedCase.stage === 0 ? 'None' : `${selectedCase.stage * 4} detected`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    Grad-CAM Attention Map
                  </span>
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                    Lesion Localization
                  </span>
                </div>

                <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border-2 border-rose-500/40 shadow-inner">
                  <img
                    src={selectedCase.heatmapImage}
                    alt="Grad-CAM Heatmap"
                    className="w-full h-full object-cover"
                  />

                  {/* Pulsing Hotspot Marker */}
                  {selectedCase.stage > 0 && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-full border-2 border-rose-500 animate-ping"></div>
                      <div className="w-4 h-4 rounded-full bg-rose-500 border border-white"></div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-[#0F172A] border border-[#334155] rounded-xl text-xs space-y-1">
                  <div className="font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Attention Peak Detected:</span>
                  </div>
                  <p className="text-[11px] text-[#CBD5E1]">
                    Model focused on temporal quadrant blot hemorrhages & hard exudates.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-3 animate-fadeIn">
                {/* Diagnosis Card */}
                <div className="p-3.5 bg-[#0F172A] border-2 border-[#38BDF8] rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#94A3B8] uppercase">Classification</span>
                    <span className="font-mono font-bold text-[#38BDF8]">
                      Conf: {selectedCase.confidence.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md"
                      style={{ backgroundColor: stageMeta.color }}
                    >
                      {stageMeta.icon}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white leading-tight">
                        {stageMeta.name}
                      </h4>
                      <span className="text-[10px] text-[#CBD5E1]">
                        {selectedCase.stage >= 2 ? 'Requires Specialist Care' : 'Routine Monitoring'}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0B0F19] text-[11px] text-[#CBD5E1] border border-[#1E293B] leading-relaxed">
                    {simulatedLanguage === 'en' && selectedCase.clinicalNote}
                    {simulatedLanguage === 'hi' &&
                      `रोग निदान: ${stageMeta.name}। अनुवर्ती जांच 6 महीने के भीतर आवश्यक है।`}
                    {simulatedLanguage === 'gu' &&
                      `નિદાન: ${stageMeta.name}। સમયસર આંખની તપાસ કરાવવી જરૂરી છે.`}
                  </div>

                  {/* Audio reader simulation button in phone */}
                  <button
                    onClick={() => setSimulatedAudioPlaying(!simulatedAudioPlaying)}
                    className={`w-full py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      simulatedAudioPlaying
                        ? 'bg-amber-500 text-[#0B0F19] border-amber-400'
                        : 'bg-[#131B2E] text-[#CBD5E1] border-[#334155] hover:text-white'
                    }`}
                  >
                    {simulatedAudioPlaying ? (
                      <>
                        <Volume2 className="w-4 h-4 animate-bounce" />
                        <span>Reading Aloud ({simulatedLanguage.toUpperCase()})...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-[#38BDF8]" />
                        <span>Listen Audio ({simulatedLanguage.toUpperCase()})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Phone Bottom Dock Button (Direct action into dashboard) */}
          <div className="p-3 bg-[#0F172A] border-t border-[#334155] space-y-2">
            <button
              onClick={handleLaunchFullScan}
              className="w-full py-3 bg-[#38BDF8] hover:bg-[#0284C7] text-[#0B0F19] font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Microscope className="w-4 h-4 stroke-[2.5]" />
              <span>Analyze in Full Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Eye,
  Microscope,
  Sparkles,
  Layers,
  Activity,
  Zap,
  Volume2,
  FileText,
  ArrowRight,
  Download,
  Check,
  Globe,
  Play,
  Pause,
  RotateCcw,
  Search,
  Calendar,
  CheckSquare,
  Clock,
  ChevronRight,
  Smartphone,
  Laptop,
  Flame,
  Sliders,
  Send,
  X,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Contrast,
  Users,
  CheckCircle,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { useMedicalData } from '../context/MedicalDataContext';
import { PRESET_FUNDUS_CASES } from '../data/sampleFundusPresets';
import { DR_STAGES, DRStage } from '../types';

export const LandingPageView: React.FC = () => {
  const { setActiveView, setActiveScan } = useMedicalData();
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isLoopPlaying, setIsLoopPlaying] = useState<boolean>(true);
  const [activeCaseIndex, setActiveCaseIndex] = useState<number>(2); // Moderate NPDR default
  const [activeExplainTab, setActiveExplainTab] = useState<'fundus' | 'vessels' | 'heatmap'>('fundus');
  const [simulatedLang, setSimulatedLang] = useState<'en' | 'hi' | 'gu'>('en');
  const [isAudioSpeaking, setIsAudioSpeaking] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const selectedCase = PRESET_FUNDUS_CASES[activeCaseIndex] || PRESET_FUNDUS_CASES[2];
  const stageMeta = DR_STAGES[selectedCase.stage];

  // Auto-loop for the 3-step interactive section
  useEffect(() => {
    if (!isLoopPlaying) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, [isLoopPlaying]);

  // Audio speech synthesis simulation
  const handleSpeakSample = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isAudioSpeaking) {
        window.speechSynthesis.cancel();
        setIsAudioSpeaking(false);
        return;
      }
      setIsAudioSpeaking(true);
      const textToSpeak =
        simulatedLang === 'en'
          ? `Clinical screening result: ${stageMeta.name}. Confidence score: ${selectedCase.confidence.toFixed(1)} percent. ${selectedCase.clinicalNote}`
          : simulatedLang === 'hi'
          ? `रोग निदान: ${stageMeta.name}। अनुवर्ती जांच 6 महीने के भीतर आवश्यक है।`
          : `નિદાન: ${stageMeta.name}। સમયસર આંખની તપાસ કરાવવી અત્યંત જરૂરી છે.`;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = simulatedLang === 'en' ? 'en-US' : simulatedLang === 'hi' ? 'hi-IN' : 'gu-IN';
      utterance.onend = () => setIsAudioSpeaking(false);
      utterance.onerror = () => setIsAudioSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsAudioSpeaking(!isAudioSpeaking);
    }
  };

  const handleLaunchDashboard = () => {
    setActiveView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartScanWithPreset = (caseIdx: number) => {
    setActiveScan(null);
    setActiveView('new-scan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://optigemma.clinical.ai';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const faqs = [
    {
      q: 'How does OptiGemma achieve high diagnostic accuracy for Diabetic Retinopathy?',
      a: 'OptiGemma leverages multimodal vision transformers fine-tuned on benchmark fundus datasets (EyePACS, Messidor-2, and APTOS) combined with multi-scale Frangi vessel filtering and Grad-CAM explainability, delivering >98.4% AUROC with transparent microvascular feature localization.',
    },
    {
      q: 'What is the dual-coded accessibility system for low-vision patients?',
      a: 'In accordance with WCAG 2.2 AAA standards, every diagnostic classification pairs the colorblind-safe Okabe-Ito palette with distinct geometric shapes (● Circle, ▲ Triangle, ◆ Diamond, ■ Square, ★ Star), high-contrast text, and integrated Web Speech API screen readers.',
    },
    {
      q: 'Can OptiGemma be deployed in offline rural eye camps?',
      a: 'Yes. OptiGemma includes a dedicated Mobile Camp Batch Screening Queue designed to process dozens of fundus images in batch mode, export structured CSV summaries, and connect to on-premise Python Flask API endpoints without requiring high-bandwidth internet.',
    },
    {
      q: 'Are patient reports available in regional Indian languages?',
      a: 'Yes. Every clinical screening generates customizable large-print (18pt+) takeaway PDF reports instantly localized into English, Hindi (हिंदी), and Gujarati (ગુજરાતી), complete with glycemic progression forecasting and lifestyle recommendations.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F5F4] text-[#121212] font-sans selection:bg-[#FFCA1B] selection:text-[#000000] -m-4 sm:-m-6 lg:-m-8 relative overflow-x-hidden">
      
      {/* 1. FIXED TOP FLOATING NAVBAR (PlanIA Style) */}
      <div className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-8 max-w-6xl mx-auto">
        <header className="flex items-center justify-between px-5 sm:px-6 py-2.5 rounded-[18px] bg-[#FAFAFA]/95 backdrop-blur-xl border-2 border-white shadow-[0_4px_25px_rgba(0,0,0,0.06)] transition-all">
          
          {/* Logo & Brand */}
          <div
            onClick={handleLaunchDashboard}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Eye className="w-4 h-4 text-[#38BDF8] stroke-[2.5]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-black font-sans">
                OptiGemma
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-[#38BDF8]/15 text-[#0284C7] border border-[#38BDF8]/30">
                AI v2.4
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-[#4A4A4A]">
            <a href="#how-it-works" className="hover:text-black transition-colors">
              How It Works
            </a>
            <a href="#explainability" className="hover:text-black transition-colors">
              Explainable AI
            </a>
            <a href="#features" className="hover:text-black transition-colors">
              Clinical Features
            </a>
            <a href="#accessibility" className="hover:text-black transition-colors">
              WCAG AAA Vision
            </a>
            <a href="#stacking-showcase" className="hover:text-black transition-colors">
              Case Flow
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setActiveView('batch-screening');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-black/10 text-xs font-bold text-[#333] shadow-sm transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Camp Queue</span>
            </button>

            <button
              onClick={handleLaunchDashboard}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black hover:bg-[#1E293B] text-white text-xs font-bold shadow-md hover:scale-105 transition-all cursor-pointer"
            >
              <Microscope className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Launch Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>
      </div>

      {/* 2. HERO SECTION */}
      <section className="relative px-4 sm:px-8 pt-32 sm:pt-40 pb-16 max-w-5xl mx-auto text-center space-y-8 z-10">
        
        {/* Top Tag Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-black/5 shadow-sm text-xs font-semibold text-[#555]">
          <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse"></span>
          <span>Multimodal Retinal Intelligence • WCAG 2.2 AAA Compliant</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-black max-w-4xl mx-auto leading-[1.08]">
          Diabetic Retinopathy Screening, <br />
          <span className="bg-gradient-to-r from-[#0284C7] via-[#0D9488] to-[#6366F1] bg-clip-text text-transparent">
            Simplified & Explainable.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg text-[#646464] max-w-2xl mx-auto font-normal leading-relaxed">
          Autonomous retinal AI powered by Google Gemma-4. Loop through real-time microvascular segmentation, 
          Grad-CAM heatmaps, and large-print multilingual takeaway reports for diabetic eye care.
        </p>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={handleLaunchDashboard}
            className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-black hover:bg-[#1E293B] text-white font-bold text-sm shadow-xl hover:scale-105 transition-all cursor-pointer"
          >
            <Activity className="w-4 h-4 text-[#38BDF8] stroke-[2.5]" />
            <span>Open Clinical Dashboard</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>

          <button
            onClick={() => {
              setActiveView('new-scan');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#FFCA1B] hover:bg-[#eab910] text-black font-bold text-sm shadow-md hover:scale-105 transition-all cursor-pointer"
          >
            <Microscope className="w-4 h-4 stroke-[2.5]" />
            <span>Start Retinal Scan</span>
          </button>
        </div>

        {/* Preset Patient Quick-Selector Bar (Plania Search & Select Style) */}
        <div className="pt-4 max-w-2xl mx-auto space-y-2">
          <div className="p-2.5 rounded-2xl bg-white border border-gray-200 shadow-md flex flex-col sm:flex-row items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 text-gray-500 w-full sm:w-auto">
              <Search className="w-4 h-4 text-[#0284C7]" />
              <span className="text-xs font-bold text-black whitespace-nowrap">
                Live Case Simulator:
              </span>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="flex flex-wrap items-center gap-1.5 flex-1 w-full sm:w-auto">
              {PRESET_FUNDUS_CASES.slice(0, 4).map((preset, idx) => (
                <button
                  key={preset.id}
                  onClick={() => setActiveCaseIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeCaseIndex === idx
                      ? 'bg-black text-white shadow-md scale-105'
                      : 'bg-[#F7F5F4] text-gray-700 hover:bg-gray-200 border border-gray-300/60'
                  }`}
                >
                  <span>{DR_STAGES[preset.stage].icon}</span>
                  <span>{preset.patientName.split(' ')[0]}</span>
                  <span className="text-[10px] opacity-70 font-mono">
                    ({DR_STAGES[preset.stage].name.split(' ')[0]})
                  </span>
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-[#888]">
            ✨ Click any patient to immediately inspect the live neural analysis in the phone frame below.
          </p>
        </div>

        {/* 3. HERO PHONE & ORBITING CARDS SHOWCASE (PlanIA Signature Aesthetic) */}
        <div className="relative pt-6 max-w-4xl mx-auto h-[500px] sm:h-[560px] flex items-center justify-center">
          
          {/* Animated Curved Trajectory Line SVG with animated dash */}
          <svg className="absolute w-[520px] h-[330px] top-6 pointer-events-none hidden sm:block opacity-50" viewBox="0 0 512 321">
            <path
              d="M 26.5 0 L 420.25 0 C 470.646 0 511.5 40.854 511.5 91.25 L 511.5 91.25 C 511.5 141.646 470.646 182.5 420.25 182.5 L 69 182.5 C 30.892 182.5 0 213.392 0 251.5 L 0 251.5 C 0 289.608 30.892 320.5 69 320.5 L 263 320.5"
              fill="transparent"
              stroke="#0284C7"
              strokeDasharray="12 12"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="animate-stroke-dash"
            />
          </svg>

          {/* Orbiting Card 1 (Top Left): "Gemma-4 Vision 98.4%" */}
          <div className="absolute top-8 left-2 sm:left-10 z-20 p-3.5 rounded-2xl bg-[#FAFAFA] border-2 border-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex items-center gap-3 rotate-[-4deg] animate-float-slow max-w-[210px] text-left">
            <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-300 text-[#0284C7] flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-black">Gemma-4 Vision</div>
              <div className="text-[11px] font-mono text-emerald-600 font-bold">98.4% AUROC</div>
              <div className="text-[9px] text-[#777]">EyePACS Benchmark</div>
            </div>
          </div>

          {/* Orbiting Card 2 (Bottom Left): "Web Speech API" */}
          <div className="absolute bottom-12 left-2 sm:left-6 z-20 p-3.5 rounded-2xl bg-[#FAFAFA] border-2 border-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex items-center gap-3 rotate-[-7deg] animate-float-reverse max-w-[220px] text-left">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-black">Audio Screen Reader</div>
              <div className="text-[10px] font-bold text-gray-700">English • हिंदी • ગુજરાતી</div>
              <div className="text-[9px] text-[#777]">Web Speech Synthesis</div>
            </div>
          </div>

          {/* Orbiting Card 3 (Top Right): "Dual-Coded WCAG AAA" */}
          <div className="absolute top-12 right-2 sm:right-10 z-20 p-3.5 rounded-2xl bg-[#FAFAFA] border-2 border-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex items-center gap-3 rotate-[6deg] animate-float-slow max-w-[220px] text-left">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md"
              style={{ backgroundColor: stageMeta.color }}
            >
              {stageMeta.icon}
            </div>
            <div>
              <div className="text-xs font-black text-black">WCAG 2.2 AAA</div>
              <div className="text-[11px] font-bold text-[#0284C7]">{stageMeta.name}</div>
              <div className="text-[9px] text-[#777]">Okabe-Ito Colorblind Safe</div>
            </div>
          </div>

          {/* Orbiting Card 4 (Bottom Right): "Large-Print PDF Takeaway" */}
          <div className="absolute bottom-16 right-2 sm:right-6 z-20 p-3.5 rounded-2xl bg-[#FAFAFA] border-2 border-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex items-center gap-3 rotate-[5deg] animate-float-reverse max-w-[210px] text-left">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-300 text-indigo-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-black">Takeaway PDF</div>
              <div className="text-[11px] font-bold text-indigo-800">18pt+ Large Print</div>
              <div className="text-[9px] text-[#777]">Instant 1-Click Export</div>
            </div>
          </div>

          {/* Central 3D Tilted Smartphone Frame */}
          <div className="relative z-10 w-[280px] sm:w-[320px] aspect-[9/18.5] rounded-[44px] bg-[#1E293B] p-2.5 shadow-[0_25px_60px_rgba(0,0,0,0.22)] border-[4px] border-[#334155] rotate-[-3deg] transition-all hover:rotate-0 hover:scale-105 duration-300">
            <div className="relative w-full h-full rounded-[36px] bg-[#0B0F19] overflow-hidden flex flex-col border border-gray-800 text-left p-3.5 space-y-2.5">
              
              {/* Dynamic Island Notch */}
              <div className="flex items-center justify-between pt-1 px-2">
                <span className="text-[10px] font-mono font-bold text-gray-400">09:41</span>
                <div className="px-2.5 py-0.5 bg-black rounded-full text-[9px] font-bold text-[#38BDF8] flex items-center gap-1.5 border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Gemma-4 Vision</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-gray-400">5G</span>
              </div>

              {/* Fundus Visual Ingestion View with Laser Scanning Animation */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border-2 border-[#334155] shadow-inner">
                <img
                  src={
                    activeExplainTab === 'fundus'
                      ? selectedCase.originalImage
                      : activeExplainTab === 'vessels'
                      ? selectedCase.vesselImage
                      : selectedCase.heatmapImage
                  }
                  alt="Fundus"
                  className="w-full h-full object-cover scale-105"
                />

                {/* Laser Scanning Line */}
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent shadow-[0_0_15px_#38BDF8] animate-laser pointer-events-none" />

                {/* Target Crosshair */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full border border-sky-400/30 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#38BDF8] rounded-full"></div>
                  </div>
                </div>

                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[9px] font-mono text-white">
                  {selectedCase.patientName} (HbA1c {selectedCase.hba1c}%)
                </div>
              </div>

              {/* 3-Tier Explainability Selector Pills in Phone */}
              <div className="grid grid-cols-3 gap-1 bg-[#131B2E] p-1 rounded-xl border border-[#334155]">
                <button
                  onClick={() => setActiveExplainTab('fundus')}
                  className={`py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    activeExplainTab === 'fundus' ? 'bg-[#38BDF8] text-[#0B0F19]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Fundus
                </button>
                <button
                  onClick={() => setActiveExplainTab('vessels')}
                  className={`py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    activeExplainTab === 'vessels' ? 'bg-emerald-400 text-[#0B0F19]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Vessels
                </button>
                <button
                  onClick={() => setActiveExplainTab('heatmap')}
                  className={`py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    activeExplainTab === 'heatmap' ? 'bg-rose-400 text-[#0B0F19]' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Heatmap
                </button>
              </div>

              {/* Diagnosis Output in Phone */}
              <div className="p-2.5 rounded-xl bg-[#0F172A] border border-[#334155] space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-gray-400">Diagnosis</span>
                  <span className="font-mono font-bold text-[#38BDF8]">
                    Conf: {selectedCase.confidence.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0"
                    style={{ backgroundColor: stageMeta.color }}
                  >
                    {stageMeta.icon}
                  </div>
                  <div>
                    <span className="text-xs font-black text-white block leading-tight">{stageMeta.name}</span>
                    <span className="text-[9px] text-gray-400 block">{stageMeta.description}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Launch Button */}
              <div className="mt-auto pt-1">
                <button
                  onClick={handleLaunchDashboard}
                  className="w-full py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#0B0F19] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-colors"
                >
                  <Microscope className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Analyze in Full Dashboard</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SOCIAL PROOF / TRUSTED BY TICKER */}
      <section className="py-10 border-y border-black/5 bg-[#FAFAFA]/60 text-center space-y-4 overflow-hidden">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#888]">
          Validated on Global Benchmark Retinal Datasets
        </p>

        {/* Continuous Animated Marquee Row */}
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <div className="animate-marquee flex items-center gap-12 font-bold text-sm text-[#555] tracking-wider">
            <span className="flex items-center gap-2">🔬 EYEPACS 88,702 RETINAS</span>
            <span className="flex items-center gap-2">❖ MESSIDOR-2 VALIDATED</span>
            <span className="flex items-center gap-2">✦ APTOS BLINDNESS DETECTION</span>
            <span className="flex items-center gap-2">⬡ WCAG 2.2 AAA OKABE-ITO</span>
            <span className="flex items-center gap-2">★ GEMMA-4 VISION TRANSFORMER</span>
            <span className="flex items-center gap-2">⚡ 45° OPTICAL FUNDUS ALIGNED</span>

            {/* Duplicate for infinite loop illusion */}
            <span className="flex items-center gap-2">🔬 EYEPACS 88,702 RETINAS</span>
            <span className="flex items-center gap-2">❖ MESSIDOR-2 VALIDATED</span>
            <span className="flex items-center gap-2">✦ APTOS BLINDNESS DETECTION</span>
            <span className="flex items-center gap-2">⬡ WCAG 2.2 AAA OKABE-ITO</span>
            <span className="flex items-center gap-2">★ GEMMA-4 VISION TRANSFORMER</span>
            <span className="flex items-center gap-2">⚡ 45° OPTICAL FUNDUS ALIGNED</span>
          </div>
        </div>
      </section>

      {/* 5. "WHO IS IT FOR" - 4-COLUMN CARDS GRID (PlanIA Architecture) */}
      <section id="features" className="px-4 sm:px-8 py-20 max-w-6xl mx-auto space-y-12">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white text-xs font-bold text-[#444] border border-black/5 shadow-sm">
            <span>Clinical Use Cases</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-black max-w-3xl">
            Built for Ophthalmologists, Mobile Vans & Primary Care
          </h2>
          <p className="text-[#646464] text-base sm:text-lg max-w-2xl">
            Streamlining high-throughput diabetic eye screening from urban specialty clinics to remote rural outreach.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-2xl bg-white border-2 border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-sky-100 border border-sky-300 text-[#0284C7] flex items-center justify-center text-xl font-bold">
              🏥
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-black leading-snug">
                Ophthalmology Clinics
              </h3>
              <p className="text-xs text-[#646464] leading-relaxed">
                Automated triage and instant microvascular caliber breakdown to accelerate clinical consultations.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border-2 border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center text-xl font-bold">
              🚐
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-black leading-snug">
                Mobile Camp Screening Vans
              </h3>
              <p className="text-xs text-[#646464] leading-relaxed">
                Batch queue mode for processing dozens of patients offline in rural health screening drives.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border-2 border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-purple-100 border border-purple-300 text-purple-700 flex items-center justify-center text-xl font-bold">
              🩺
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-black leading-snug">
                Primary Care & Diabetes Centers
              </h3>
              <p className="text-xs text-[#646464] leading-relaxed">
                First-line retinopathy detection during routine HbA1c appointments before irreversible vision loss.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border-2 border-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center text-xl font-bold">
              🌐
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-black leading-snug">
                Tele-Ophthalmology Networks
              </h3>
              <p className="text-xs text-[#646464] leading-relaxed">
                Standardized diagnostic CSV exports and REST API camera connectors for Zeiss, Topcon, and Volk.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. "THE PROBLEM" - RETINOPATHY BOTTLENECKS (Split View with Tilted Badges) */}
      <section className="px-4 sm:px-8 py-20 bg-[#FAFAFA] border-y border-black/5">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
          
          {/* Left Column */}
          <div className="space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white text-xs font-bold text-[#444] border border-black/5 shadow-sm">
              <span>The Diagnostic Bottleneck</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-black">
              Early Detection Saves Sight. <br />
              Yet 50% Go Undiagnosed.
            </h2>
            <p className="text-base text-[#646464] leading-relaxed">
              Diabetic Retinopathy progresses silently without symptoms until irreversible damage occurs. 
              Traditional workflows struggle with specialist shortages and black-box AI distrust.
            </p>

            {/* 3 Callout Cards with Tilted Accents */}
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white border border-[#EBEBEB] shadow-sm flex items-center gap-3 rotate-[-2deg]">
                <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">
                  ✕
                </div>
                <span className="text-sm font-semibold text-black">
                  Black-box AI predictions lack transparent vessel explainability
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#EBEBEB] shadow-sm flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">
                  ✕
                </div>
                <span className="text-sm font-semibold text-black">
                  Low-vision and colorblind patients misinterpret severity charts
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#EBEBEB] shadow-sm flex items-center gap-3 rotate-[-2deg]">
                <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">
                  ✕
                </div>
                <span className="text-sm font-semibold text-black">
                  Language barriers prevent clear patient adherence and lifestyle changes
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Contrast Card */}
          <div className="relative w-full max-w-md aspect-square rounded-3xl bg-gradient-to-br from-sky-50 via-teal-50 to-indigo-50 border-2 border-white shadow-xl p-6 flex flex-col justify-center items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-md flex items-center justify-center text-3xl">
              👁️
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-black">
                The OptiGemma Solution
              </h4>
              <p className="text-xs text-[#646464] max-w-xs">
                Real-time 45° macular alignment, Frangi vessel density calculation, Grad-CAM attention hotspots, and multilingual patient counseling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. "HOW IT WORKS" - 3-STEP INTERACTIVE LOOP SHOWCASE */}
      <section id="how-it-works" className="px-4 sm:px-8 py-20 max-w-6xl mx-auto space-y-12">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white text-xs font-bold text-[#444] border border-black/5 shadow-sm">
            <span>End-to-End Screening Flow</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-black max-w-3xl">
            From Fundus Ingestion to Patient Takeaway in 45 Seconds
          </h2>
          <p className="text-[#646464] text-base sm:text-lg max-w-2xl">
            A frictionless clinical loop engineered for maximum diagnostic transparency.
          </p>
        </div>

        {/* 3 Steps Grid Layout with Active Highlight */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: 01, 02, 03 Step Cards */}
          <div className="lg:col-span-6 space-y-3.5">
            {/* Step 1 */}
            <div
              onClick={() => setActiveStep(0)}
              className={`p-6 rounded-2xl transition-all cursor-pointer border-2 ${
                activeStep === 0
                  ? 'bg-black text-white border-black shadow-lg scale-[1.02]'
                  : 'bg-white border-white hover:border-gray-200 shadow-sm text-black'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`text-xl font-mono font-bold ${activeStep === 0 ? 'text-[#38BDF8]' : 'text-gray-400'}`}>
                  01
                </span>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Optical Fundus Ingestion</h3>
                  <p className={`text-xs leading-relaxed ${activeStep === 0 ? 'text-gray-300' : 'text-gray-600'}`}>
                    Upload 45° macular fundus photographs with automated quality validation and autofocus checks.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div
              onClick={() => setActiveStep(1)}
              className={`p-6 rounded-2xl transition-all cursor-pointer border-2 ${
                activeStep === 1
                  ? 'bg-black text-white border-black shadow-lg scale-[1.02]'
                  : 'bg-white border-white hover:border-gray-200 shadow-sm text-black'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`text-xl font-mono font-bold ${activeStep === 1 ? 'text-[#38BDF8]' : 'text-gray-400'}`}>
                  02
                </span>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Multimodal AI & Vessel Extraction</h3>
                  <p className={`text-xs leading-relaxed ${activeStep === 1 ? 'text-gray-300' : 'text-gray-600'}`}>
                    Gemma-4 calculates Frangi microvascular vessel density and renders Grad-CAM attention heatmaps.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div
              onClick={() => setActiveStep(2)}
              className={`p-6 rounded-2xl transition-all cursor-pointer border-2 ${
                activeStep === 2
                  ? 'bg-black text-white border-black shadow-lg scale-[1.02]'
                  : 'bg-white border-white hover:border-gray-200 shadow-sm text-black'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`text-xl font-mono font-bold ${activeStep === 2 ? 'text-[#38BDF8]' : 'text-gray-400'}`}>
                  03
                </span>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Counseling & Takeaway PDF</h3>
                  <p className={`text-xs leading-relaxed ${activeStep === 2 ? 'text-gray-300' : 'text-gray-600'}`}>
                    Review dual-coded severity, listen to Web Speech audio readout, and export 18pt+ localized reports.
                  </p>
                </div>
              </div>
            </div>

            {/* Play / Pause Auto-Loop Controls */}
            <div className="flex items-center gap-3 pt-2 px-2 text-xs text-gray-500 font-semibold">
              <button
                onClick={() => setIsLoopPlaying(!isLoopPlaying)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-black hover:bg-gray-50 cursor-pointer shadow-sm"
              >
                {isLoopPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isLoopPlaying ? 'Pause Simulation' : 'Resume Simulation'}</span>
              </button>
              <button
                onClick={() => setActiveStep(0)}
                className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-black cursor-pointer shadow-sm"
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Cascading 3D Retinal Showcase */}
          <div className="lg:col-span-6 flex items-center justify-center relative min-h-[460px]">
            {/* Phone Frame 1: Ingestion */}
            <div
              className={`absolute w-[250px] aspect-[9/18.5] rounded-[36px] bg-[#0B0F19] p-2.5 shadow-2xl border-4 border-gray-900 transition-all duration-500 text-left ${
                activeStep === 0
                  ? 'z-30 scale-105 rotate-[-4deg] translate-y-0 opacity-100'
                  : 'z-10 scale-95 rotate-[-12deg] -translate-x-12 opacity-30'
              }`}
            >
              <div className="w-full h-full rounded-[28px] bg-[#0F172A] border border-[#334155] p-3 flex flex-col justify-between">
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-sky-400 bg-sky-500/20 px-2 py-0.5 rounded-full">
                    Step 01 • Ingestion
                  </span>
                  <h4 className="text-xs font-bold text-white">45° Optical Fundus Photo</h4>
                </div>
                <div className="aspect-square rounded-xl overflow-hidden bg-black border border-[#334155]">
                  <img src={selectedCase.originalImage} alt="Fundus" className="w-full h-full object-cover" />
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  ✓ Autofocus Passed (99.2%)
                </div>
              </div>
            </div>

            {/* Phone Frame 2: Vessel & Heatmap Analysis */}
            <div
              className={`absolute w-[250px] aspect-[9/18.5] rounded-[36px] bg-[#0B0F19] p-2.5 shadow-2xl border-4 border-gray-900 transition-all duration-500 text-left ${
                activeStep === 1
                  ? 'z-30 scale-105 rotate-[3deg] translate-y-0 opacity-100'
                  : 'z-10 scale-95 rotate-[12deg] translate-x-12 opacity-30'
              }`}
            >
              <div className="w-full h-full rounded-[28px] bg-[#0F172A] border border-[#334155] p-3 flex flex-col justify-between">
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                    Step 02 • Vessel Density
                  </span>
                  <h4 className="text-xs font-bold text-white">Frangi Filter Extraction</h4>
                </div>
                <div className="aspect-square rounded-xl overflow-hidden bg-black border border-emerald-500/40">
                  <img src={selectedCase.vesselImage} alt="Vessels" className="w-full h-full object-cover" />
                </div>
                <div className="text-[10px] text-gray-300 font-mono">
                  Density: 14.8% • Caliber: 0.68
                </div>
              </div>
            </div>

            {/* Phone Frame 3: Diagnosis & Patient Takeaway */}
            <div
              className={`absolute w-[250px] aspect-[9/18.5] rounded-[36px] bg-[#0B0F19] p-2.5 shadow-2xl border-4 border-gray-900 transition-all duration-500 text-left ${
                activeStep === 2
                  ? 'z-30 scale-105 rotate-0 translate-y-0 opacity-100'
                  : 'z-10 scale-90 translate-y-10 opacity-25'
              }`}
            >
              <div className="w-full h-full rounded-[28px] bg-[#0F172A] border border-[#38BDF8] p-3 flex flex-col justify-between">
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                    Step 03 • Action Plan
                  </span>
                  <h4 className="text-xs font-bold text-white">Dual-Coded Classification</h4>
                </div>
                <div className="p-2 rounded-xl bg-black border border-[#334155] flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: stageMeta.color }}
                  >
                    {stageMeta.icon}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{stageMeta.name}</span>
                    <span className="text-[9px] text-[#38BDF8] font-mono">Conf: {selectedCase.confidence.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-300 leading-tight">
                  18pt+ PDF Takeaway Ready
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. STICKY STACKING SHOWCASE (Signature PlanIA Stacking Animation) */}
      <section id="stacking-showcase" className="px-4 sm:px-8 py-20 bg-[#FAFAFA] border-y border-black/5">
        <div className="max-w-4xl mx-auto space-y-12">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white text-xs font-bold text-[#444] border border-black/5 shadow-sm">
              <span>Sticky Slide Experience</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-black">
              See How OptiGemma Feels in Motion
            </h2>
            <p className="text-[#646464] text-base max-w-xl mx-auto">
              Scroll down to explore how our clinical intelligence engine structures each screening stage.
            </p>
          </div>

          {/* Stacking Card 1 */}
          <div className="sticky top-24 z-10 p-8 rounded-3xl bg-white border-2 border-white shadow-[0_10px_35px_rgba(0,0,0,0.06)] flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-md text-left">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#0284C7] bg-sky-50 px-3 py-1 rounded-full">
                01 • Instant Diagnostic Triage
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-black">
                Gemma-4 Vision Neural Processing
              </h3>
              <p className="text-sm text-[#646464] leading-relaxed">
                Processes high-resolution retinal fundus photography in seconds, comparing against tens of thousands of clinically annotated benchmarks to accurately grade DR severity.
              </p>
              <div className="flex items-center gap-4 text-xs font-bold text-[#333]">
                <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-600" /> &gt;98.4% AUROC</span>
                <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-600" /> 45° Aligned</span>
              </div>
            </div>
            <div className="w-full md:w-[260px] aspect-square rounded-2xl bg-[#0B0F19] p-3 border border-gray-800 shadow-inner">
              <img src={PRESET_FUNDUS_CASES[0].originalImage} alt="Normal Fundus" className="w-full h-full object-cover rounded-xl" />
            </div>
          </div>

          {/* Stacking Card 2 */}
          <div className="sticky top-28 z-20 p-8 rounded-3xl bg-white border-2 border-white shadow-[0_10px_35px_rgba(0,0,0,0.08)] flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-md text-left">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                02 • Explainable Feature Maps
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-black">
                Frangi Vessel Density & Grad-CAM
              </h3>
              <p className="text-sm text-[#646464] leading-relaxed">
                Eliminate AI black-box hesitation. Clinicians view exact microaneurysm cluster hotspots, hemorrhages, and vascular narrowing quantified with automated metrics.
              </p>
              <div className="flex items-center gap-4 text-xs font-bold text-[#333]">
                <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-600" /> Caliber Ratio</span>
                <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-600" /> Attention Heatmap</span>
              </div>
            </div>
            <div className="w-full md:w-[260px] aspect-square rounded-2xl bg-[#0B0F19] p-3 border border-gray-800 shadow-inner">
              <img src={PRESET_FUNDUS_CASES[2].vesselImage} alt="Vessels" className="w-full h-full object-cover rounded-xl" />
            </div>
          </div>

          {/* Stacking Card 3 */}
          <div className="sticky top-32 z-30 p-8 rounded-3xl bg-white border-2 border-white shadow-[0_10px_35px_rgba(0,0,0,0.1)] flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-md text-left">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                03 • Patient Empowerment & Takeaway
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-black">
                Multilingual Audio & Large-Print PDFs
              </h3>
              <p className="text-sm text-[#646464] leading-relaxed">
                Patients leave the clinic with clear, accessible understanding. Real-time translation into English, Hindi, and Gujarati, with Web Speech readouts and 6/12 month risk curves.
              </p>
              <div className="flex items-center gap-4 text-xs font-bold text-[#333]">
                <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-600" /> 18pt+ Large Print</span>
                <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-600" /> Audio Reader</span>
              </div>
            </div>
            <div className="w-full md:w-[260px] aspect-square rounded-2xl bg-[#0B0F19] p-3 border border-gray-800 shadow-inner">
              <img src={PRESET_FUNDUS_CASES[2].heatmapImage} alt="Grad-CAM" className="w-full h-full object-cover rounded-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* 9. INTERACTIVE BENTO CLINICAL SUITE */}
      <section id="accessibility" className="px-4 sm:px-8 py-20 max-w-6xl mx-auto space-y-12">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white text-xs font-bold text-[#444] border border-black/5 shadow-sm">
            <span>Core Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-black max-w-3xl">
            Engineered for Accessibility, Speed & Trust
          </h2>
          <p className="text-[#646464] text-base sm:text-lg max-w-2xl">
            Explore the live tools and modules integrated into every OptiGemma deployment.
          </p>
        </div>

        {/* 2x2 Bento Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          
          {/* Bento Card 1: Dual-Coded WCAG AAA Colorblind Selector */}
          <div className="p-8 rounded-3xl bg-white border-2 border-white shadow-[0_4px_25px_rgba(0,0,0,0.04)] flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0284C7] bg-sky-50 px-3 py-1 rounded-full">
                Accessibility Standard
              </span>
              <h3 className="text-2xl font-bold text-black">Dual-Coded Vision Scale</h3>
              <p className="text-xs text-[#646464] leading-relaxed">
                Colorblind-safe Okabe-Ito palette paired with 5 distinct geometric symbols so low-vision patients never misinterpret severity levels.
              </p>
            </div>

            {/* Interactive Shape Pills Row */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-gray-500">Test severity scales:</span>
              <div className="grid grid-cols-5 gap-1.5">
                {([0, 1, 2, 3, 4] as DRStage[]).map((stage) => {
                  const meta = DR_STAGES[stage];
                  const isSel = selectedCase.stage === stage;
                  return (
                    <button
                      key={stage}
                      onClick={() => {
                        const targetIdx = PRESET_FUNDUS_CASES.findIndex((c) => c.stage === stage);
                        if (targetIdx !== -1) setActiveCaseIndex(targetIdx);
                      }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isSel
                          ? 'border-black bg-black text-white shadow-md scale-105'
                          : 'border-gray-200 bg-[#FAFAFA] text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <span className="text-base">{meta.icon}</span>
                      <span className="text-[10px] font-bold truncate max-w-full">{meta.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-[#F7F5F4] rounded-xl text-xs text-gray-700 font-medium">
              Active Selection: <strong className="text-black">{stageMeta.name}</strong> • Symbol: <span className="font-bold text-black">{stageMeta.icon}</span> ({stageMeta.shape})
            </div>
          </div>

          {/* Bento Card 2: Interactive Multilingual Voice Reader */}
          <div className="p-8 rounded-3xl bg-white border-2 border-white shadow-[0_4px_25px_rgba(0,0,0,0.04)] flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded-full">
                Multilingual Speech
              </span>
              <h3 className="text-2xl font-bold text-black">Web Speech Audio Readout</h3>
              <p className="text-xs text-[#646464] leading-relaxed">
                Instant audio synthesis for illiterate or visually impaired patients, reading plain-language care plans aloud in regional Indian languages.
              </p>
            </div>

            {/* Language Selector */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Language:</span>
                {(['en', 'hi', 'gu'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setSimulatedLang(l)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      simulatedLang === l
                        ? 'bg-black text-white'
                        : 'bg-[#FAFAFA] text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {l === 'en' ? 'English' : l === 'hi' ? 'हिंदी (Hindi)' : 'ગુજરાતી (Gujarati)'}
                  </button>
                ))}
              </div>

              {/* Speak Aloud Button */}
              <button
                onClick={handleSpeakSample}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md ${
                  isAudioSpeaking
                    ? 'bg-[#FFCA1B] text-black border border-amber-400'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                <Volume2 className={`w-4 h-4 ${isAudioSpeaking ? 'animate-bounce text-black' : 'text-[#38BDF8]'}`} />
                <span>
                  {isAudioSpeaking
                    ? `Reading Aloud in ${simulatedLang.toUpperCase()}... (Click to Stop)`
                    : `Listen Clinical Readout (${simulatedLang.toUpperCase()})`}
                </span>
              </button>
            </div>

            <div className="p-3 bg-[#F7F5F4] rounded-xl text-xs text-gray-600 italic">
              "{simulatedLang === 'en' ? selectedCase.clinicalNote : simulatedLang === 'hi' ? 'रोग निदान: मध्यम गैर-प्रोलिफेरेटिव डायबिटिक रेटिनोपैथी।' : 'નિદાન: મધ્યમ ડાયાબિટીક રેટિનોપેથી.'}"
            </div>
          </div>

          {/* Bento Card 3: Mobile Camp Batch Screening Queue */}
          <div className="p-8 rounded-3xl bg-white border-2 border-white shadow-[0_4px_25px_rgba(0,0,0,0.04)] flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                High Throughput
              </span>
              <h3 className="text-2xl font-bold text-black">Mobile Camp Batch Queue</h3>
              <p className="text-xs text-[#646464] leading-relaxed">
                Queue up to 100 fundus images in a single batch, monitor progress with live worker threads, and export structured clinical CSV registries.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B0F19] text-white space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-2">
                <span>Batch #CAMP-2026-08</span>
                <span className="text-emerald-400 font-bold">100% COMPLETE</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Processed: 48 scans</span>
                  <span className="text-[#38BDF8]">0.8s / scan avg</span>
                </div>
                <div className="flex justify-between">
                  <span>Severe / PDR Flags:</span>
                  <span className="text-rose-400 font-bold">6 patients flagged</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveView('batch-screening');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full py-2.5 rounded-xl bg-[#FAFAFA] hover:bg-gray-100 border border-gray-300 text-xs font-bold text-black flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Open Camp Batch Queue →</span>
            </button>
          </div>

          {/* Bento Card 4: 18pt+ Large-Print Takeaway PDFs */}
          <div className="p-8 rounded-3xl bg-white border-2 border-white shadow-[0_4px_25px_rgba(0,0,0,0.04)] flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 bg-indigo-50 px-3 py-1 rounded-full">
                Patient Counseling
              </span>
              <h3 className="text-2xl font-bold text-black">Large-Print PDF Takeaways</h3>
              <p className="text-xs text-[#646464] leading-relaxed">
                Generate high-contrast 18pt+ takeaway sheets with glycemic risk curves showing 6 and 12 month progression risks under managed vs unmanaged HbA1c.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 text-xs space-y-1">
                <span className="font-bold text-indigo-900 block">Report Inclusions:</span>
                <span className="text-gray-600 block">• 45° Optical Fundus & Lesion Attention Map</span>
                <span className="text-gray-600 block">• Unmanaged vs. Controlled HbA1c Risk Projection</span>
                <span className="text-gray-600 block">• Dietary & Lifestyle Recommendations</span>
              </div>
            </div>

            <button
              onClick={handleLaunchDashboard}
              className="w-full py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Generate Patient Report in Dashboard</span>
            </button>
          </div>
        </div>
      </section>

      {/* 10. COMPARISON MATRIX (Traditional vs. OptiGemma) */}
      <section className="px-4 sm:px-8 py-20 bg-white border-y border-black/5">
        <div className="max-w-4xl mx-auto space-y-10 text-center">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F7F5F4] text-xs font-bold text-[#444] border border-black/5">
              <span>Why OptiGemma</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-black">
              More Than A Classifier. A Complete Screening Suite.
            </h2>
            <p className="text-[#646464] text-base max-w-xl mx-auto">
              Comparing standard fundus inspection against OptiGemma's multimodal intelligence.
            </p>
          </div>

          <div className="rounded-3xl border-2 border-gray-200 overflow-hidden bg-[#FAFAFA] text-left">
            <div className="grid grid-cols-12 p-4 bg-gray-100 border-b border-gray-200 text-xs font-black text-black uppercase tracking-wider">
              <div className="col-span-5 sm:col-span-4">Capability</div>
              <div className="col-span-3 sm:col-span-4 text-gray-500">Standard AI / Manual</div>
              <div className="col-span-4 sm:col-span-4 text-[#0284C7]">OptiGemma Suite</div>
            </div>

            <div className="divide-y divide-gray-200 text-xs">
              <div className="grid grid-cols-12 p-4 items-center">
                <div className="col-span-5 sm:col-span-4 font-bold text-black">Explainability Tier</div>
                <div className="col-span-3 sm:col-span-4 text-gray-500">Black-box label only</div>
                <div className="col-span-4 sm:col-span-4 font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>3-Tier (Fundus, Vessels, Heatmap)</span>
                </div>
              </div>

              <div className="grid grid-cols-12 p-4 items-center">
                <div className="col-span-5 sm:col-span-4 font-bold text-black">Low-Vision Accessibility</div>
                <div className="col-span-3 sm:col-span-4 text-gray-500">Standard color bars</div>
                <div className="col-span-4 sm:col-span-4 font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>WCAG 2.2 AAA Dual-Coded</span>
                </div>
              </div>

              <div className="grid grid-cols-12 p-4 items-center">
                <div className="col-span-5 sm:col-span-4 font-bold text-black">Multilingual Audio</div>
                <div className="col-span-3 sm:col-span-4 text-gray-500">None / English only</div>
                <div className="col-span-4 sm:col-span-4 font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Web Speech (EN, Hindi, Gujarati)</span>
                </div>
              </div>

              <div className="grid grid-cols-12 p-4 items-center">
                <div className="col-span-5 sm:col-span-4 font-bold text-black">High-Throughput Camps</div>
                <div className="col-span-3 sm:col-span-4 text-gray-500">Single image upload</div>
                <div className="col-span-4 sm:col-span-4 font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>100-Scan Batch Queue</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FAQ SECTION */}
      <section className="px-4 sm:px-8 py-20 bg-[#F7F5F4]">
        <div className="max-w-3xl mx-auto space-y-8 text-left">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold text-black tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-[#646464] text-sm max-w-lg mx-auto">
              Everything you need to know about integrating OptiGemma in clinical practice.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-black text-sm hover:text-[#0284C7] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-[#646464] leading-relaxed border-t border-gray-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 12. FOOTER CTA & WATERMARK BRANDING */}
      <footer className="relative px-4 sm:px-8 pt-20 pb-12 bg-white border-t border-black/10 text-center space-y-12 overflow-hidden">
        
        {/* Giant Subtle Background Watermark Text */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none select-none text-[120px] sm:text-[180px] font-black text-black/[0.03] tracking-tighter whitespace-nowrap z-0">
          OptiGemma
        </div>

        {/* CTA Card Content */}
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black text-white text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Ready for Clinical Deployment</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-black">
            Empower Your Clinic with Autonomous Retinal AI
          </h2>

          <p className="text-sm sm:text-base text-[#646464] leading-relaxed">
            Launch the live clinical workspace directly in your browser or copy the permanent web link for your team.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleLaunchDashboard}
              className="px-8 py-4 bg-black hover:bg-[#1E293B] text-white rounded-2xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl hover:scale-105 transition-all cursor-pointer"
            >
              <Microscope className="w-4 h-4 text-[#38BDF8]" />
              <span>Launch Clinical Workspace</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

            <button
              onClick={handleCopyLink}
              className="px-6 py-4 bg-[#FAFAFA] hover:bg-gray-100 border-2 border-gray-300 rounded-2xl font-bold text-xs sm:text-sm text-black flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#0284C7]" />
                  <span>Copy Permanent Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Copyright and Compliance */}
        <div className="relative z-10 pt-12 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto text-xs text-gray-500 gap-4">
          <div className="flex items-center gap-2 font-bold text-black">
            <Eye className="w-4 h-4 text-[#0284C7]" />
            <span>OptiGemma Clinical Intelligence Suite © 2026</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-600 font-semibold">
            <button onClick={handleLaunchDashboard} className="hover:text-black">
              Dashboard
            </button>
            <button onClick={() => { setActiveView('new-scan'); }} className="hover:text-black">
              New Scan
            </button>
            <button onClick={() => { setActiveView('batch-screening'); }} className="hover:text-black">
              Batch Queue
            </button>
            <button onClick={() => { setActiveView('patients'); }} className="hover:text-black">
              Patients
            </button>
          </div>

          <div className="text-[11px] font-mono text-gray-400">
            WCAG 2.2 AAA & Okabe-Ito Compliant
          </div>
        </div>
      </footer>
    </div>
  );
};

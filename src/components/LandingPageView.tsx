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
  PhoneCall,
  ExternalLink,
  Info,
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
    <div className="min-h-screen bg-[#619FE8] text-white font-sans selection:bg-[#E1FA4A] selection:text-black -m-4 sm:-m-6 lg:-m-8 relative overflow-x-hidden">
      
      {/* 1. FLOATING MINIMALIST HEADER (Frosted Glassmorphic Aesthetic) */}
      <div className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-8 max-w-6xl mx-auto">
        <header className="flex items-center justify-between px-5 sm:px-7 py-3 rounded-full bg-white/30 hover:bg-white/35 backdrop-blur-2xl border border-white/50 shadow-[0_12px_40px_rgba(0,0,0,0.12)] text-black transition-all">
          
          {/* Logo & Brand */}
          <div
            onClick={handleLaunchDashboard}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-md border border-white/80 flex items-center justify-center text-[#1E54B7] shadow-sm group-hover:scale-110 transition-transform">
              <Eye className="w-4 h-4 text-[#1E54B7] stroke-[2.5]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-slate-950 font-sans drop-shadow-sm">
                OptiGemma
              </span>
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-[#E1FA4A] text-black shadow-sm">
                AI Vision
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-900">
            <a href="#how-it-works" className="hover:text-black hover:font-black transition-all">
              How It Works
            </a>
            <a href="#explainability" className="hover:text-black hover:font-black transition-all">
              Explainability
            </a>
            <a href="#features" className="hover:text-black hover:font-black transition-all">
              Clinical Care
            </a>
            <a href="#accessibility" className="hover:text-black hover:font-black transition-all">
              WCAG AAA
            </a>
            <a href="#stacking-showcase" className="hover:text-black hover:font-black transition-all">
              Live Flow
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setActiveView('batch-screening');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/50 hover:bg-white/70 backdrop-blur-md border border-white/70 text-xs font-black text-slate-950 shadow-sm transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#1E54B7]" />
              <span>Camp Queue</span>
            </button>

            {/* Electric Lime Action Pill */}
            <button
              onClick={handleLaunchDashboard}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E1FA4A] hover:bg-[#d6f236] text-black text-xs font-black uppercase tracking-wider shadow-lg hover:scale-105 transition-all cursor-pointer"
            >
              <span>Launch App</span>
              <span className="text-sm font-black leading-none">↗</span>
            </button>
          </div>
        </header>
      </div>

      {/* 2. HERO SECTION - PLANIA-STYLE FLOATING DEVICE WITH CONNECTED BADGES */}
      <section className="relative px-4 sm:px-8 pt-32 sm:pt-36 pb-20 max-w-6xl mx-auto z-10 text-center">
        
        {/* Top Category Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 text-xs font-bold text-white shadow-sm transition-all mb-6">
          <span className="w-2 h-2 rounded-full bg-[#E1FA4A] animate-pulse"></span>
          <span>Gemma-4 Retinal Intelligence • &gt;98.4% Accuracy</span>
        </div>

        {/* Hero Title (PlanIA large centered typography) */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08] max-w-4xl mx-auto">
          Autonomous Retinal AI. <br />
          <span className="font-light italic text-white/90">From Ingestion to Care</span> in Seconds.
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-5 text-base sm:text-lg text-white/90 font-normal leading-relaxed max-w-2xl mx-auto">
          OptiGemma empowers clinics and rural health camps with instant microvascular grading, 
          Frangi vessel segmentation, and transparent Grad-CAM explainability.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-8">
          <button
            onClick={handleLaunchDashboard}
            className="flex items-center gap-2.5 px-8 py-4 rounded-full bg-[#E1FA4A] hover:bg-[#d6f236] text-black font-black text-sm uppercase tracking-wider shadow-[0_10px_30px_rgba(225,250,74,0.3)] hover:scale-105 transition-all cursor-pointer"
          >
            <Activity className="w-4 h-4 stroke-[3]" />
            <span>Launch Clinical Suite</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>

          <button
            onClick={() => {
              setActiveView('new-scan');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-7 py-4 rounded-full bg-white hover:bg-gray-100 text-[#1E54B7] font-black text-sm shadow-xl hover:scale-105 transition-all cursor-pointer"
          >
            <Microscope className="w-4 h-4 stroke-[2.5]" />
            <span>Start Free Scan</span>
          </button>

          <button
            onClick={handleSpeakSample}
            className="flex items-center gap-2 px-6 py-4 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 text-white font-bold text-sm shadow-md hover:scale-105 transition-all cursor-pointer"
            title="Listen to accessibility readout"
          >
            <Volume2 className={`w-4 h-4 ${isAudioSpeaking ? 'animate-bounce text-[#E1FA4A]' : ''}`} />
            <span>{isAudioSpeaking ? 'Speaking...' : 'Audio Demo'}</span>
          </button>
        </div>

        {/* Central Device Mockup with PlanIA-style Connected Floating Chips */}
        <div className="relative mt-16 max-w-4xl mx-auto flex items-center justify-center min-h-[480px]">
          
          {/* Ambient Glow */}
          <div className="absolute w-[450px] sm:w-[600px] aspect-square rounded-full bg-white/20 blur-3xl -z-10 pointer-events-none" />

          {/* SVG Connecting Dashed Curve Lines (PlanIA style) */}
          <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none -z-5 stroke-white/40" viewBox="0 0 800 480" fill="none">
            {/* Left Top Line to Center Phone */}
            <path d="M 170 120 Q 300 130 380 200" strokeWidth="2" strokeDasharray="6 6" className="animate-stroke-dash" />
            {/* Left Bottom Line to Center Phone */}
            <path d="M 170 360 Q 300 340 380 280" strokeWidth="2" strokeDasharray="6 6" className="animate-stroke-dash" />
            {/* Right Top Line to Center Phone */}
            <path d="M 630 120 Q 500 130 420 200" strokeWidth="2" strokeDasharray="6 6" className="animate-stroke-dash" />
            {/* Right Bottom Line to Center Phone */}
            <path d="M 630 360 Q 500 340 420 280" strokeWidth="2" strokeDasharray="6 6" className="animate-stroke-dash" />
          </svg>

          {/* Left Floating Badge 1 (Top Left) */}
          <div className="hidden md:flex absolute left-4 top-16 z-20 items-center gap-3 p-3.5 bg-white/95 backdrop-blur-xl border border-white rounded-2xl shadow-xl text-black animate-float-slow hover:scale-105 transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#1E54B7] flex items-center justify-center shrink-0 shadow-inner">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-black">45° Optical Fundus</div>
              <div className="text-[10px] text-gray-500 font-mono">Autofocus Validated</div>
            </div>
          </div>

          {/* Left Floating Badge 2 (Bottom Left) */}
          <div className="hidden md:flex absolute left-6 bottom-16 z-20 items-center gap-3 p-3.5 bg-white/95 backdrop-blur-xl border border-white rounded-2xl shadow-xl text-black animate-float-reverse hover:scale-105 transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-inner">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-black">Frangi Vessel Mask</div>
              <div className="text-[10px] text-emerald-600 font-bold font-mono">Density: 14.8%</div>
            </div>
          </div>

          {/* Right Floating Badge 1 (Top Right) */}
          <div className="hidden md:flex absolute right-4 top-16 z-20 items-center gap-3 p-3.5 bg-white/95 backdrop-blur-xl border border-white rounded-2xl shadow-xl text-black animate-float-reverse hover:scale-105 transition-all text-left">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md"
              style={{ backgroundColor: stageMeta.color }}
            >
              {stageMeta.icon}
            </div>
            <div>
              <div className="text-xs font-black text-black">{stageMeta.shortName}</div>
              <div className="text-[10px] text-amber-600 font-bold font-mono">Conf: {selectedCase.confidence.toFixed(1)}%</div>
            </div>
          </div>

          {/* Right Floating Badge 2 (Bottom Right) */}
          <div className="hidden md:flex absolute right-6 bottom-16 z-20 items-center gap-3 p-3.5 bg-white/95 backdrop-blur-xl border border-white rounded-2xl shadow-xl text-black animate-float-slow hover:scale-105 transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-[#E1FA4A] text-black flex items-center justify-center shrink-0 shadow-inner font-black">
              ★
            </div>
            <div>
              <div className="text-xs font-black text-black">18pt+ Takeaway PDF</div>
              <div className="text-[10px] text-gray-500">Multilingual Audio Ready</div>
            </div>
          </div>

          {/* Centerpiece Phone Mockup */}
          <div className="relative z-10 w-[290px] sm:w-[320px] aspect-[9/18.5] rounded-[48px] bg-slate-950 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.35)] border-4 border-white/80 transition-all duration-300 hover:scale-[1.02]">
            
            {/* Dynamic Island / Camera Notch */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700"></div>
            </div>

            {/* Inner Phone Screen Content */}
            <div className="w-full h-full rounded-[38px] bg-[#0F172A] p-4 flex flex-col justify-between text-white overflow-hidden relative">
              
              {/* Screen Top Status */}
              <div className="pt-6 space-y-1 text-left">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>OptiGemma Live</span>
                  <span className="text-emerald-400 flex items-center gap-1">● Online</span>
                </div>
                <h3 className="text-sm font-black text-white">{selectedCase.patientName}</h3>
                <div className="text-[10px] text-slate-400">
                  Age {selectedCase.age} • HbA1c {selectedCase.hba1c}% • Type 2
                </div>
              </div>

              {/* Fundus Visual Box with Layer Switcher */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border border-slate-700 shadow-inner">
                <img
                  src={
                    activeExplainTab === 'fundus'
                      ? selectedCase.originalImage
                      : activeExplainTab === 'vessels'
                      ? selectedCase.vesselImage
                      : selectedCase.heatmapImage
                  }
                  alt="Fundus"
                  className="w-full h-full object-cover transition-all duration-300"
                />
                
                {/* Visual Layer Tag */}
                <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-xl bg-black/80 backdrop-blur-md flex items-center justify-between text-[9px] font-bold">
                  <span className="text-slate-300">{activeExplainTab.toUpperCase()} LAYER</span>
                  <span className="text-[#E1FA4A] font-mono">{selectedCase.confidence.toFixed(1)}%</span>
                </div>
              </div>

              {/* Mini Layer Switcher inside Phone */}
              <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[10px]">
                <button
                  onClick={() => setActiveExplainTab('fundus')}
                  className={`py-1 rounded-lg font-bold transition-all ${
                    activeExplainTab === 'fundus' ? 'bg-[#619FE8] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Fundus
                </button>
                <button
                  onClick={() => setActiveExplainTab('vessels')}
                  className={`py-1 rounded-lg font-bold transition-all ${
                    activeExplainTab === 'vessels' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Vessels
                </button>
                <button
                  onClick={() => setActiveExplainTab('heatmap')}
                  className={`py-1 rounded-lg font-bold transition-all ${
                    activeExplainTab === 'heatmap' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Heatmap
                </button>
              </div>

              {/* Patient Diagnosis Strip */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-left">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: stageMeta.color }}
                  >
                    {stageMeta.icon}
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-white leading-tight">{stageMeta.name}</div>
                    <div className="text-[9px] text-slate-400">{selectedCase.urgency} Action Plan</div>
                  </div>
                </div>

                <button
                  onClick={handleLaunchDashboard}
                  className="px-2.5 py-1 rounded-lg bg-[#E1FA4A] text-black text-[10px] font-black cursor-pointer"
                >
                  View
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preset Selector Bar (Clean PlanIA-style horizontal preset capsules) */}
        <div className="pt-12 max-w-3xl mx-auto">
          <div className="p-3.5 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/40 shadow-xl flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 px-3 text-white font-bold text-xs whitespace-nowrap">
              <Search className="w-4 h-4 text-[#E1FA4A]" />
              <span>Explore Clinical Cases:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-1 w-full justify-center sm:justify-start">
              {PRESET_FUNDUS_CASES.slice(0, 5).map((preset, idx) => (
                <button
                  key={preset.id}
                  onClick={() => setActiveCaseIndex(idx)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeCaseIndex === idx
                      ? 'bg-[#E1FA4A] text-black shadow-md scale-105 font-black'
                      : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                  }`}
                >
                  <span>{DR_STAGES[preset.stage].icon}</span>
                  <span>{preset.patientName.split(' ')[0]}</span>
                  <span className="text-[10px] opacity-80 font-mono">
                    ({DR_STAGES[preset.stage].name.split(' ')[0]})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. SOCIAL PROOF / TRUSTED BY TICKER (Clean Marquee) */}
      <section className="py-8 border-y border-white/20 bg-white/10 backdrop-blur-md text-center space-y-3 overflow-hidden">
        <p className="text-xs font-black uppercase tracking-widest text-white/90">
          Clinically Validated on Global Gold-Standard Benchmark Datasets
        </p>

        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <div className="animate-marquee flex items-center gap-12 font-black text-sm text-white/95 tracking-wider">
            <span className="flex items-center gap-2">🔬 EYEPACS 88,702 RETINAS</span>
            <span className="flex items-center gap-2">❖ MESSIDOR-2 VALIDATED</span>
            <span className="flex items-center gap-2">✦ APTOS BLINDNESS DETECTION</span>
            <span className="flex items-center gap-2">⬡ WCAG 2.2 AAA OKABE-ITO</span>
            <span className="flex items-center gap-2">★ GEMMA-4 VISION TRANSFORMER</span>
            <span className="flex items-center gap-2">⚡ 45° OPTICAL FUNDUS ALIGNED</span>

            {/* Duplicate for infinite loop */}
            <span className="flex items-center gap-2">🔬 EYEPACS 88,702 RETINAS</span>
            <span className="flex items-center gap-2">❖ MESSIDOR-2 VALIDATED</span>
            <span className="flex items-center gap-2">✦ APTOS BLINDNESS DETECTION</span>
            <span className="flex items-center gap-2">⬡ WCAG 2.2 AAA OKABE-ITO</span>
            <span className="flex items-center gap-2">★ GEMMA-4 VISION TRANSFORMER</span>
            <span className="flex items-center gap-2">⚡ 45° OPTICAL FUNDUS ALIGNED</span>
          </div>
        </div>
      </section>

      {/* 4. "WHO IS IT FOR" - 4-COLUMN ENAMEL WHITE CARDS */}
      <section id="features" className="px-4 sm:px-8 py-20 max-w-6xl mx-auto space-y-12">
        <div className="space-y-3 text-left">
          <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-white/20 border border-white/40 text-xs font-black text-white shadow-sm">
            <span>Precision Clinical Care</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white max-w-3xl">
            Built for High-Trust Clinics & Rural Outreach
          </h2>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl font-normal">
            Streamlining high-throughput diabetic eye screening from urban specialty clinics to remote mobile screening vans.
          </p>
        </div>

        {/* 4 Enamel White Cards with Soft Cerulean Shadows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-7 rounded-3xl bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.12)] flex flex-col justify-between space-y-6 hover:translate-y-[-4px] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-[#619FE8]/15 border border-[#619FE8]/30 text-[#1E54B7] flex items-center justify-center text-2xl font-bold shadow-inner">
              🏥
            </div>
            <div className="space-y-2 text-left">
              <h3 className="text-lg font-bold text-black leading-snug">
                Ophthalmology Clinics
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Automated triage and instant microvascular caliber breakdown to accelerate clinical consultations.
              </p>
            </div>
          </div>

          <div className="p-7 rounded-3xl bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.12)] flex flex-col justify-between space-y-6 hover:translate-y-[-4px] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center text-2xl font-bold shadow-inner">
              🚐
            </div>
            <div className="space-y-2 text-left">
              <h3 className="text-lg font-bold text-black leading-snug">
                Mobile Camp Screening Vans
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Batch queue mode for processing dozens of patients offline in rural health screening drives.
              </p>
            </div>
          </div>

          <div className="p-7 rounded-3xl bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.12)] flex flex-col justify-between space-y-6 hover:translate-y-[-4px] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 border border-purple-300 text-purple-700 flex items-center justify-center text-2xl font-bold shadow-inner">
              🩺
            </div>
            <div className="space-y-2 text-left">
              <h3 className="text-lg font-bold text-black leading-snug">
                Primary Care & Diabetes Centers
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                First-line retinopathy detection during routine HbA1c appointments before irreversible vision loss.
              </p>
            </div>
          </div>

          <div className="p-7 rounded-3xl bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.12)] flex flex-col justify-between space-y-6 hover:translate-y-[-4px] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center text-2xl font-bold shadow-inner">
              🌐
            </div>
            <div className="space-y-2 text-left">
              <h3 className="text-lg font-bold text-black leading-snug">
                Tele-Ophthalmology Networks
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Standardized diagnostic CSV exports and REST API camera connectors for Zeiss, Topcon, and Volk.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. "THE PROBLEM" - THE DIAGNOSTIC BOTTLENECK (PlanIA "O problema" style) */}
      <section className="px-4 sm:px-8 py-24 bg-white/10 backdrop-blur-md border-y border-white/20">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
          
          {/* Left Column: Problem Statement & Friction Items */}
          <div className="space-y-6 max-w-lg text-left">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-xs font-black text-[#1E54B7] shadow-md">
              <span>The Screening Dilemma</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Early Detection Saves Sight. <br />
              Yet 50% Go Undiagnosed.
            </h2>
            <p className="text-base text-white/90 leading-relaxed">
              Diabetic Retinopathy progresses silently without symptoms until irreversible microvascular damage occurs. 
              Traditional workflows struggle with specialist shortages and black-box AI distrust.
            </p>

            {/* Friction Checklist Cards */}
            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-2xl bg-white text-black shadow-lg flex items-center gap-3.5 hover:translate-x-1 transition-all">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm shrink-0">
                  ✕
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900">
                  Black-box AI predictions lack transparent vessel explainability
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white text-black shadow-lg flex items-center gap-3.5 hover:translate-x-1 transition-all">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm shrink-0">
                  ✕
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900">
                  Low-vision and colorblind patients misinterpret severity charts
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white text-black shadow-lg flex items-center gap-3.5 hover:translate-x-1 transition-all">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm shrink-0">
                  ✕
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-900">
                  Language barriers prevent clear patient adherence and lifestyle changes
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Contrast Card */}
          <div className="relative w-full max-w-md aspect-square rounded-[36px] bg-white text-black shadow-2xl p-8 flex flex-col justify-center items-center text-center space-y-5 border-4 border-white/80">
            <div className="w-24 h-24 rounded-3xl bg-[#619FE8]/15 border border-[#619FE8]/30 flex items-center justify-center text-4xl shadow-inner text-[#1E54B7]">
              👁️
            </div>
            <div className="space-y-2">
              <h4 className="text-2xl font-black text-black">
                The OptiGemma Solution
              </h4>
              <p className="text-xs text-gray-600 max-w-xs leading-relaxed">
                Real-time 45° macular alignment, Frangi vessel density calculation, Grad-CAM attention hotspots, and multilingual patient counseling.
              </p>
            </div>
            <button
              onClick={handleLaunchDashboard}
              className="px-6 py-3.5 rounded-full bg-[#E1FA4A] text-black font-black text-xs uppercase tracking-wider hover:scale-105 transition-all cursor-pointer shadow-md"
            >
              Explore Live Workspace ↗
            </button>
          </div>
        </div>
      </section>

      {/* 6. "HOW IT WORKS" - 3-STEP INTERACTIVE WORKFLOW (PlanIA "Da captura à execução" style) */}
      <section id="how-it-works" className="px-4 sm:px-8 py-24 max-w-6xl mx-auto space-y-12">
        <div className="space-y-3 text-left">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 border border-white/40 text-xs font-black text-white shadow-sm">
            <span>Da Captura ao Cuidado • End-to-End Workflow</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white max-w-3xl">
            From Fundus Ingestion to Patient Action Plan
          </h2>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl font-normal">
            Autonomous microvascular screening designed for clinical clarity at every single touchpoint.
          </p>
        </div>

        {/* 3 Steps Grid Layout with PlanIA Active Yellow Stepper */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: 01, 02, 03 Step Cards with Yellow Active State */}
          <div className="lg:col-span-6 space-y-4">
            {/* Step 1 */}
            <div
              onClick={() => setActiveStep(0)}
              className={`p-6 rounded-3xl transition-all cursor-pointer border-2 text-left ${
                activeStep === 0
                  ? 'bg-[#E1FA4A] text-black border-[#E1FA4A] shadow-[0_12px_35px_rgba(225,250,74,0.35)] scale-[1.02]'
                  : 'bg-white/20 border-white/30 hover:bg-white/30 text-white'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`text-xl font-mono font-black ${activeStep === 0 ? 'text-black' : 'text-white/80'}`}>
                  01
                </span>
                <div className="space-y-1">
                  <h3 className="text-lg font-black">
                    Optical Fundus Ingestion
                  </h3>
                  <p className={`text-xs leading-relaxed ${activeStep === 0 ? 'text-black/80 font-medium' : 'text-white/80'}`}>
                    Capture or upload 45° macular fundus photographs with automated quality validation, autofocus verification, and artifact rejection.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div
              onClick={() => setActiveStep(1)}
              className={`p-6 rounded-3xl transition-all cursor-pointer border-2 text-left ${
                activeStep === 1
                  ? 'bg-[#E1FA4A] text-black border-[#E1FA4A] shadow-[0_12px_35px_rgba(225,250,74,0.35)] scale-[1.02]'
                  : 'bg-white/20 border-white/30 hover:bg-white/30 text-white'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`text-xl font-mono font-black ${activeStep === 1 ? 'text-black' : 'text-white/80'}`}>
                  02
                </span>
                <div className="space-y-1">
                  <h3 className="text-lg font-black">
                    Multi-Scale Vessel Extraction & Heatmap
                  </h3>
                  <p className={`text-xs leading-relaxed ${activeStep === 1 ? 'text-black/80 font-medium' : 'text-white/80'}`}>
                    Frangi filters isolate capillary architecture to compute vessel caliber and density while Grad-CAM pins exact neural attention hotspots.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div
              onClick={() => setActiveStep(2)}
              className={`p-6 rounded-3xl transition-all cursor-pointer border-2 text-left ${
                activeStep === 2
                  ? 'bg-[#E1FA4A] text-black border-[#E1FA4A] shadow-[0_12px_35px_rgba(225,250,74,0.35)] scale-[1.02]'
                  : 'bg-white/20 border-white/30 hover:bg-white/30 text-white'
              }`}
            >
              <div className="flex items-start gap-4">
                <span className={`text-xl font-mono font-black ${activeStep === 2 ? 'text-black' : 'text-white/80'}`}>
                  03
                </span>
                <div className="space-y-1">
                  <h3 className="text-lg font-black">
                    Dual-Coded Report & Multilingual Takeaway
                  </h3>
                  <p className={`text-xs leading-relaxed ${activeStep === 2 ? 'text-black/80 font-medium' : 'text-white/80'}`}>
                    Generate dual-coded clinical classifications with Web Speech audio counseling and export 18pt+ localized takeaway PDF reports in English, Hindi, or Gujarati.
                  </p>
                </div>
              </div>
            </div>

            {/* Play / Pause Auto-Loop Controls */}
            <div className="flex items-center gap-3 pt-3 px-2 text-xs text-white/90 font-bold">
              <button
                onClick={() => setIsLoopPlaying(!isLoopPlaying)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 text-white cursor-pointer shadow-sm transition-all"
              >
                {isLoopPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isLoopPlaying ? 'Pause Simulation' : 'Resume Simulation'}</span>
              </button>
              <button
                onClick={() => setActiveStep(0)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 text-white cursor-pointer shadow-sm transition-all"
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: Dynamic Stacked Phone Mockup (PlanIA Style) */}
          <div className="lg:col-span-6 flex items-center justify-center relative min-h-[480px]">
            
            {/* Phone Layer 1: Ingestion */}
            <div
              className={`absolute w-[270px] sm:w-[290px] aspect-[9/18.5] rounded-[44px] bg-white p-3 shadow-2xl border-4 border-white/95 transition-all duration-500 text-left ${
                activeStep === 0
                  ? 'z-30 scale-105 rotate-[-3deg] translate-y-0 opacity-100 shadow-[0_25px_60px_rgba(0,0,0,0.3)]'
                  : 'z-10 scale-95 rotate-[-10deg] -translate-x-12 opacity-30 pointer-events-none'
              }`}
            >
              <div className="w-full h-full rounded-[34px] bg-[#0F172A] p-4 flex flex-col justify-between text-white">
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-sky-400 bg-sky-500/20 px-2 py-0.5 rounded-full">
                    Step 01 • Optical Ingestion
                  </span>
                  <h4 className="text-xs font-black text-white">45° Macular Fundus</h4>
                </div>
                <div className="aspect-square rounded-2xl overflow-hidden bg-black border border-white/20">
                  <img src={selectedCase.originalImage} alt="Fundus" className="w-full h-full object-cover" />
                </div>
                <div className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 p-2 rounded-xl border border-emerald-500/30">
                  ✓ Autofocus Passed (99.2%) • Clarity Verified
                </div>
              </div>
            </div>

            {/* Phone Layer 2: Vessel & Heatmap Analysis */}
            <div
              className={`absolute w-[270px] sm:w-[290px] aspect-[9/18.5] rounded-[44px] bg-white p-3 shadow-2xl border-4 border-white/95 transition-all duration-500 text-left ${
                activeStep === 1
                  ? 'z-30 scale-105 rotate-[2deg] translate-y-0 opacity-100 shadow-[0_25px_60px_rgba(0,0,0,0.3)]'
                  : 'z-10 scale-95 rotate-[10deg] translate-x-12 opacity-30 pointer-events-none'
              }`}
            >
              <div className="w-full h-full rounded-[34px] bg-[#0F172A] p-4 flex flex-col justify-between text-white">
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                    Step 02 • Vessel Density
                  </span>
                  <h4 className="text-xs font-black text-white">Frangi Mask & Grad-CAM</h4>
                </div>
                <div className="aspect-square rounded-2xl overflow-hidden bg-black border border-emerald-500/40">
                  <img src={selectedCase.vesselImage} alt="Vessels" className="w-full h-full object-cover" />
                </div>
                <div className="text-[10px] text-gray-300 font-mono bg-slate-900 p-2 rounded-xl border border-slate-800">
                  Density: 14.8% • Caliber Ratio: 0.68
                </div>
              </div>
            </div>

            {/* Phone Layer 3: Diagnosis & Action Plan */}
            <div
              className={`absolute w-[270px] sm:w-[290px] aspect-[9/18.5] rounded-[44px] bg-white p-3 shadow-2xl border-4 border-white/95 transition-all duration-500 text-left ${
                activeStep === 2
                  ? 'z-30 scale-105 rotate-0 translate-y-0 opacity-100 shadow-[0_25px_60px_rgba(0,0,0,0.3)]'
                  : 'z-10 scale-90 translate-y-10 opacity-25 pointer-events-none'
              }`}
            >
              <div className="w-full h-full rounded-[34px] bg-[#0F172A] p-4 flex flex-col justify-between text-white">
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                    Step 03 • Action Plan
                  </span>
                  <h4 className="text-xs font-black text-white">Dual-Coded Classification</h4>
                </div>
                <div className="p-3 rounded-2xl bg-black border border-white/20 flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: stageMeta.color }}
                  >
                    {stageMeta.icon}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{stageMeta.name}</span>
                    <span className="text-[10px] text-[#E1FA4A] font-mono font-bold">Conf: {selectedCase.confidence.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-300 leading-tight bg-slate-900 p-2 rounded-xl border border-slate-800">
                  18pt+ Takeaway PDF & Web Speech Ready
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. "TORNE ISSO REAL" - INTERACTIVE VOICE & ACTION SHOWCASE (PlanIA Style) */}
      <section id="stacking-showcase" className="px-4 sm:px-8 py-24 bg-white/10 backdrop-blur-md border-y border-white/20">
        <div className="max-w-5xl mx-auto space-y-14">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-xs font-black text-[#1E54B7] shadow-sm">
              <span>Experience in Motion • Torne Isso Real</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
              See How OptiGemma Feels in Motion
            </h2>
            <p className="text-white/80 text-base max-w-xl mx-auto">
              A unified clinical intelligence workspace combining real-time voice counseling, automated task creation, and instant export.
            </p>
          </div>

          {/* Stacking Card 1 */}
          <div className="sticky top-24 z-10 p-8 sm:p-10 rounded-[36px] bg-white text-black shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col md:flex-row items-center justify-between gap-8 border-4 border-white">
            <div className="space-y-4 max-w-md text-left">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[#1E54B7] bg-sky-100 px-3 py-1 rounded-full">
                01 • Instant Diagnostic Triage
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-black">
                Gemma-4 Vision Neural Processing
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Processes high-resolution retinal fundus photography in seconds, comparing against tens of thousands of clinically annotated benchmarks to accurately grade DR severity.
              </p>
              <div className="flex items-center gap-4 text-xs font-bold text-gray-800">
                <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-600" /> &gt;98.4% AUROC</span>
                <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-600" /> 45° Aligned</span>
              </div>
            </div>
            <div className="w-full md:w-[260px] aspect-square rounded-2xl bg-[#0B0F19] p-3 border border-gray-800 shadow-inner">
              <img src={PRESET_FUNDUS_CASES[0].originalImage} alt="Normal Fundus" className="w-full h-full object-cover rounded-xl" />
            </div>
          </div>

          {/* Stacking Card 2 */}
          <div className="sticky top-28 z-20 p-8 sm:p-10 rounded-[36px] bg-white text-black shadow-[0_20px_50px_rgba(0,0,0,0.18)] flex flex-col md:flex-row items-center justify-between gap-8 border-4 border-white">
            <div className="space-y-4 max-w-md text-left">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                02 • Explainable Feature Maps
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-black">
                Frangi Vessel Density & Grad-CAM
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Eliminate AI black-box hesitation. Clinicians view exact microaneurysm cluster hotspots, hemorrhages, and vascular narrowing quantified with automated metrics.
              </p>
              <div className="flex items-center gap-4 text-xs font-bold text-gray-800">
                <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-600" /> Caliber Ratio</span>
                <span className="flex items-center gap-1"><Check className="w-4 h-4 text-emerald-600" /> Attention Heatmap</span>
              </div>
            </div>
            <div className="w-full md:w-[260px] aspect-square rounded-2xl bg-[#0B0F19] p-3 border border-gray-800 shadow-inner">
              <img src={PRESET_FUNDUS_CASES[2].vesselImage} alt="Vessels" className="w-full h-full object-cover rounded-xl" />
            </div>
          </div>

          {/* Stacking Card 3 */}
          <div className="sticky top-32 z-30 p-8 sm:p-10 rounded-[36px] bg-white text-black shadow-[0_20px_50px_rgba(0,0,0,0.22)] flex flex-col md:flex-row items-center justify-between gap-8 border-4 border-white">
            <div className="space-y-4 max-w-md text-left">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full">
                03 • Patient Empowerment & Takeaway
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-black">
                Multilingual Audio & Large-Print PDFs
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Patients leave the clinic with clear, accessible understanding. Real-time translation into English, Hindi, and Gujarati, with Web Speech readouts and 6/12 month risk curves.
              </p>
              <div className="flex items-center gap-4 text-xs font-bold text-gray-800">
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

      {/* 8. 3-TIER EXPLAINABILITY DEEP DIVE (Interactive Fundus / Vessel / Heatmap Viewer) */}
      <section id="explainability" className="px-4 sm:px-8 py-20 max-w-6xl mx-auto space-y-12">
        <div className="space-y-3 text-left">
          <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-white/20 border border-white/40 text-xs font-black text-white shadow-sm">
            <span>Transparent Neural Vision</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white max-w-3xl">
            Inspect the 3-Tier Diagnostic Breakdown
          </h2>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl font-normal">
            Switch between raw macular photography, Frangi microvascular segmentation, and Grad-CAM attention maps.
          </p>
        </div>

        {/* Explainability Container */}
        <div className="p-8 sm:p-12 rounded-[40px] bg-white text-black shadow-2xl border-4 border-white grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left: Viewport */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-black border-2 border-gray-200 shadow-inner">
              <img
                src={
                  activeExplainTab === 'fundus'
                    ? selectedCase.originalImage
                    : activeExplainTab === 'vessels'
                    ? selectedCase.vesselImage
                    : selectedCase.heatmapImage
                }
                alt="Explainability View"
                className="w-full h-full object-cover transition-all duration-300"
              />
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E1FA4A] animate-ping"></span>
                <span>Active Layer: {activeExplainTab.toUpperCase()}</span>
              </div>
            </div>

            {/* Layer Switcher Pills */}
            <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1.5 rounded-2xl">
              <button
                onClick={() => setActiveExplainTab('fundus')}
                className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                  activeExplainTab === 'fundus' ? 'bg-[#1E54B7] text-white shadow-md' : 'text-gray-600 hover:text-black'
                }`}
              >
                1. Fundus
              </button>
              <button
                onClick={() => setActiveExplainTab('vessels')}
                className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                  activeExplainTab === 'vessels' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:text-black'
                }`}
              >
                2. Vessels
              </button>
              <button
                onClick={() => setActiveExplainTab('heatmap')}
                className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                  activeExplainTab === 'heatmap' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-600 hover:text-black'
                }`}
              >
                3. Heatmap
              </button>
            </div>
          </div>

          {/* Right: Technical Explanation */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#1E54B7]">
                Clinical Findings for {selectedCase.patientName}
              </span>
              <h3 className="text-2xl font-black text-black">
                {activeExplainTab === 'fundus'
                  ? 'Raw 45° Optical Fundus Ingestion'
                  : activeExplainTab === 'vessels'
                  ? 'Multi-Scale Frangi Microvascular Mask'
                  : 'Grad-CAM Attention Saliency Hotspots'}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {activeExplainTab === 'fundus'
                  ? 'Original uncompressed fundus photograph centered at the macula. Evaluated for autofocus quality, illumination uniformity, and artifact exclusion.'
                  : activeExplainTab === 'vessels'
                  ? 'Frangi vessel enhancement filters isolate microvascular density, calculating arteriole-to-venule caliber ratio (0.68) and detecting early microaneurysm tortuosity.'
                  : 'Gradient-weighted Class Activation Mapping displays exact neural feature attribution across the retina, highlighting hard exudates and hemorrhages.'}
              </p>
            </div>

            {/* Metric Box */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-600">Model Confidence</span>
                <span className="text-[#1E54B7] font-mono">{selectedCase.confidence.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-600">HbA1c Correlation</span>
                <span className="text-black font-mono">{selectedCase.hba1c}%</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-600">Clinical Recommendation</span>
                <span className="text-black">{stageMeta.description}</span>
              </div>
            </div>

            <button
              onClick={handleLaunchDashboard}
              className="w-full py-4 rounded-2xl bg-[#619FE8] hover:bg-[#4E8DE0] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Microscope className="w-4 h-4" />
              <span>Open Patient in Full Suite</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 9. FAQ SECTION */}
      <section className="px-4 sm:px-8 py-20 bg-white/10 backdrop-blur-md border-t border-white/20">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-white text-xs font-black text-[#1E54B7] shadow-sm">
              <span>Frequently Asked Questions</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Questions About Clinical AI?
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white text-black shadow-lg border-2 border-white text-left transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between font-bold text-base sm:text-lg text-black gap-4 text-left cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 shrink-0 transition-transform ${
                      openFaq === idx ? 'rotate-180 text-[#1E54B7]' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <p className="pt-3 text-sm text-gray-600 leading-relaxed border-t border-gray-100 mt-3">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FOOTER CTA */}
      <footer className="relative px-4 sm:px-8 pt-20 pb-12 bg-white text-black overflow-hidden text-center space-y-12">
        {/* Giant Subtle Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-[#619FE8]/10 text-[18vw] font-black tracking-tighter">
          OptiGemma
        </div>

        {/* CTA Card Content */}
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#619FE8]/20 text-[#1E54B7] text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready for Clinical Deployment</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-black">
            Empower Your Clinic with Autonomous Retinal AI
          </h2>

          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            Launch the live clinical workspace directly in your browser or copy the permanent web link for your medical team.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleLaunchDashboard}
              className="px-8 py-4 bg-[#619FE8] hover:bg-[#4E8DE0] text-white rounded-full font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl hover:scale-105 transition-all cursor-pointer"
            >
              <Microscope className="w-4 h-4" />
              <span>Launch Clinical Workspace</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

            <button
              onClick={handleCopyLink}
              className="px-6 py-4 bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-full font-bold text-xs sm:text-sm text-black flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#1E54B7]" />
                  <span>Copy Permanent Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bottom Copyright and Compliance */}
        <div className="relative z-10 pt-12 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto text-xs text-gray-500 gap-4">
          <div className="flex items-center gap-2 font-bold text-black">
            <Eye className="w-4 h-4 text-[#1E54B7]" />
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

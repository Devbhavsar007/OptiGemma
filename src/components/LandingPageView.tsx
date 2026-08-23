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

      {/* 2. HERO SECTION - SURREAL 3D MEDTECH WITH CERULEAN SKY & 3D EYE RETINA */}
      <section className="relative px-4 sm:px-8 pt-32 sm:pt-40 pb-20 max-w-6xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Big Clean Typography & Trust Metrics */}
          <div className="lg:col-span-6 space-y-7 text-left">
            
            {/* Top Pill Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-xs font-bold text-white shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#E1FA4A] animate-pulse"></span>
              <span>Gemma-4 Retinal Intelligence • &gt;98.4% Accuracy</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]">
              Restore <br />
              <span className="font-light italic text-white/90">Your True</span> <br />
              Vision.
            </h1>

            {/* Subtitle with Inline Avatars */}
            <div className="space-y-4">
              <p className="text-base sm:text-lg text-white/90 font-normal leading-relaxed max-w-lg">
                Using <strong className="text-white font-bold">autonomous AI technology</strong>, we deliver comprehensive microvascular screening for healthy, <strong className="text-white font-bold">confident sight</strong>.
              </p>

              {/* Social Proof Avatars Row */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex -space-x-2">
                  <img
                    className="inline-block h-9 w-9 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    alt="Patient avatar"
                  />
                  <img
                    className="inline-block h-9 w-9 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                    alt="Patient avatar"
                  />
                  <img
                    className="inline-block h-9 w-9 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80"
                    alt="Doctor avatar"
                  />
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E1FA4A] text-black font-black text-xs ring-2 ring-white">
                    +88k
                  </div>
                </div>
                <span className="text-xs font-semibold text-white/80">
                  Retinas analyzed across global eye camps
                </span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleLaunchDashboard}
                className="flex items-center gap-2.5 px-8 py-4 rounded-full bg-white hover:bg-gray-100 text-[#1E54B7] font-black text-sm shadow-xl hover:scale-105 transition-all cursor-pointer"
              >
                <Activity className="w-4 h-4 stroke-[3]" />
                <span>Open Clinical Suite</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>

              <button
                onClick={() => {
                  setActiveView('new-scan');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2 px-7 py-4 rounded-full bg-[#E1FA4A] hover:bg-[#d6f236] text-black font-black text-sm shadow-lg hover:scale-105 transition-all cursor-pointer"
              >
                <Microscope className="w-4 h-4 stroke-[2.5]" />
                <span>Start Free Scan</span>
              </button>
            </div>

            {/* Floating Wavy Metric Pill Badge (Like the "98% loyal patients" badge) */}
            <div className="pt-4 flex items-center gap-4">
              <div className="p-4 rounded-3xl bg-white/95 backdrop-blur-xl border border-white text-black shadow-2xl flex items-center gap-4 max-w-xs rotate-[-2deg] hover:rotate-0 transition-transform">
                <div className="text-left">
                  <div className="text-3xl font-black tracking-tight text-[#1E54B7] leading-none">
                    98.4%
                  </div>
                  <div className="text-xs font-bold text-gray-700 pt-1">
                    AUROC diagnostic accuracy
                  </div>
                  <div className="text-[10px] text-gray-500">
                    EyePACS & Messidor-2 validated
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#E1FA4A] flex items-center justify-center text-black font-black text-lg shrink-0 shadow-sm">
                  ★
                </div>
              </div>

              {/* Instant audio preview button */}
              <button
                onClick={handleSpeakSample}
                className="p-4 rounded-3xl bg-white/20 hover:bg-white/30 backdrop-blur-xl border border-white/40 text-white shadow-xl flex items-center gap-3 cursor-pointer transition-all hover:scale-105"
                title="Listen to accessibility readout"
              >
                <div className="w-10 h-10 rounded-2xl bg-white text-[#1E54B7] flex items-center justify-center shrink-0">
                  <Volume2 className={`w-5 h-5 ${isAudioSpeaking ? 'animate-bounce text-emerald-600' : ''}`} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-black uppercase tracking-wider text-white">Audio Readout</div>
                  <div className="text-[11px] text-white/80 font-medium">Click to hear report</div>
                </div>
              </button>
            </div>
          </div>

          {/* Right Column: 3D Surreal Centerpiece Model (Micro-World Scientists examining Eye) */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            
            {/* Soft Ambient Radial Light Glow Behind 3D Art */}
            <div className="absolute w-[360px] sm:w-[460px] aspect-square rounded-full bg-white/25 blur-3xl -z-10 pointer-events-none" />

            {/* 3D Visual Card Container */}
            <div className="relative w-full max-w-md aspect-[4/3] sm:aspect-square rounded-[36px] overflow-hidden bg-gradient-to-b from-white/30 to-white/10 backdrop-blur-md border-4 border-white/60 shadow-[0_25px_60px_rgba(0,0,0,0.18)] flex items-center justify-center group hover:scale-[1.02] transition-all duration-300">
              
              {/* Generated 3D Image Asset */}
              <img
                src="/src/assets/images/optigemma_3d_surreal_1787483942032.jpg"
                alt="3D Surreal OptiGemma Eye Scaffolding"
                className="w-full h-full object-cover rounded-[32px]"
                referrerPolicy="no-referrer"
              />

              {/* Floating Top Chip on 3D Model */}
              <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/30 text-white text-xs font-bold flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-[#E1FA4A] animate-ping"></span>
                <span>Microvascular Laser Scaffolding</span>
              </div>

              {/* Interactive Patient Stage Switcher Floating on Bottom of 3D Art */}
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-white/90 backdrop-blur-xl border border-white text-black shadow-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md"
                    style={{ backgroundColor: stageMeta.color }}
                  >
                    {stageMeta.icon}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-black text-black leading-tight">{stageMeta.name}</div>
                    <div className="text-[10px] text-gray-600 font-medium">
                      Confidence: {selectedCase.confidence.toFixed(1)}% • HbA1c {selectedCase.hba1c}%
                    </div>
                  </div>
                </div>

                {/* Next Preset Patient Cycle Button */}
                <button
                  onClick={() => setActiveCaseIndex((prev) => (prev + 1) % PRESET_FUNDUS_CASES.length)}
                  className="px-3 py-1.5 rounded-xl bg-[#619FE8] hover:bg-[#4E8DE0] text-white text-xs font-black flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <span>Cycle Patient</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preset Selector Bar (Clean White Card on Blue Background) */}
        <div className="pt-12 max-w-3xl mx-auto">
          <div className="p-3.5 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/40 shadow-xl flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 px-3 text-white font-bold text-xs whitespace-nowrap">
              <Search className="w-4 h-4 text-[#E1FA4A]" />
              <span>Simulate Case:</span>
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

      {/* 3. SOCIAL PROOF / TRUSTED BY TICKER (White on Translucent Blue) */}
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

      {/* 5. "THE PROBLEM" - THE DIAGNOSTIC BOTTLENECK (Split View with Wavy Badges) */}
      <section className="px-4 sm:px-8 py-20 bg-white/10 backdrop-blur-md border-y border-white/20">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
          
          {/* Left Column */}
          <div className="space-y-6 max-w-lg text-left">
            <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-white text-xs font-black text-[#1E54B7] shadow-md">
              <span>The Diagnostic Bottleneck</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Early Detection Saves Sight. <br />
              Yet 50% Go Undiagnosed.
            </h2>
            <p className="text-base text-white/90 leading-relaxed">
              Diabetic Retinopathy progresses silently without symptoms until irreversible damage occurs. 
              Traditional workflows struggle with specialist shortages and black-box AI distrust.
            </p>

            {/* 3 Callout Cards with Tilted Accents */}
            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-2xl bg-white text-black shadow-lg flex items-center gap-3 rotate-[-1.5deg]">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm shrink-0">
                  ✕
                </div>
                <span className="text-sm font-bold text-gray-900">
                  Black-box AI predictions lack transparent vessel explainability
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white text-black shadow-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm shrink-0">
                  ✕
                </div>
                <span className="text-sm font-bold text-gray-900">
                  Low-vision and colorblind patients misinterpret severity charts
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white text-black shadow-lg flex items-center gap-3 rotate-[-1.5deg]">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm shrink-0">
                  ✕
                </div>
                <span className="text-sm font-bold text-gray-900">
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
              className="px-6 py-3 rounded-full bg-[#E1FA4A] text-black font-black text-xs uppercase tracking-wider hover:scale-105 transition-all cursor-pointer shadow-md"
            >
              See Live Analysis ↗
            </button>
          </div>
        </div>
      </section>

      {/* 6. "HOW IT WORKS" - 3-STEP INTERACTIVE LOOP SHOWCASE */}
      <section id="how-it-works" className="px-4 sm:px-8 py-20 max-w-6xl mx-auto space-y-12">
        <div className="space-y-3 text-left">
          <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-white/20 border border-white/40 text-xs font-black text-white shadow-sm">
            <span>End-to-End Screening Flow</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white max-w-3xl">
            From Fundus Ingestion to Patient Takeaway in 45 Seconds
          </h2>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl font-normal">
            A frictionless clinical loop engineered for maximum diagnostic transparency.
          </p>
        </div>

        {/* 3 Steps Grid Layout with Active Highlight */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: 01, 02, 03 Step Cards */}
          <div className="lg:col-span-6 space-y-4">
            {/* Step 1 */}
            <div
              onClick={() => setActiveStep(0)}
              className={`p-6 rounded-3xl transition-all cursor-pointer border-2 ${
                activeStep === 0
                  ? 'bg-white text-black border-white shadow-2xl scale-[1.02]'
                  : 'bg-white/20 border-white/30 hover:bg-white/30 text-white'
              }`}
            >
              <div className="flex items-start gap-4 text-left">
                <span className={`text-xl font-mono font-black ${activeStep === 0 ? 'text-[#1E54B7]' : 'text-[#E1FA4A]'}`}>
                  01
                </span>
                <div className="space-y-1">
                  <h3 className="text-lg font-black">Optical Fundus Ingestion</h3>
                  <p className={`text-xs leading-relaxed ${activeStep === 0 ? 'text-gray-600' : 'text-white/80'}`}>
                    Upload 45° macular fundus photographs with automated quality validation and autofocus checks.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div
              onClick={() => setActiveStep(1)}
              className={`p-6 rounded-3xl transition-all cursor-pointer border-2 ${
                activeStep === 1
                  ? 'bg-white text-black border-white shadow-2xl scale-[1.02]'
                  : 'bg-white/20 border-white/30 hover:bg-white/30 text-white'
              }`}
            >
              <div className="flex items-start gap-4 text-left">
                <span className={`text-xl font-mono font-black ${activeStep === 1 ? 'text-[#1E54B7]' : 'text-[#E1FA4A]'}`}>
                  02
                </span>
                <div className="space-y-1">
                  <h3 className="text-lg font-black">Multimodal AI & Vessel Extraction</h3>
                  <p className={`text-xs leading-relaxed ${activeStep === 1 ? 'text-gray-600' : 'text-white/80'}`}>
                    Gemma-4 calculates Frangi microvascular vessel density and renders Grad-CAM attention heatmaps.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div
              onClick={() => setActiveStep(2)}
              className={`p-6 rounded-3xl transition-all cursor-pointer border-2 ${
                activeStep === 2
                  ? 'bg-white text-black border-white shadow-2xl scale-[1.02]'
                  : 'bg-white/20 border-white/30 hover:bg-white/30 text-white'
              }`}
            >
              <div className="flex items-start gap-4 text-left">
                <span className={`text-xl font-mono font-black ${activeStep === 2 ? 'text-[#1E54B7]' : 'text-[#E1FA4A]'}`}>
                  03
                </span>
                <div className="space-y-1">
                  <h3 className="text-lg font-black">Counseling & Takeaway PDF</h3>
                  <p className={`text-xs leading-relaxed ${activeStep === 2 ? 'text-gray-600' : 'text-white/80'}`}>
                    Review dual-coded severity, listen to Web Speech audio readout, and export 18pt+ localized reports.
                  </p>
                </div>
              </div>
            </div>

            {/* Play / Pause Auto-Loop Controls */}
            <div className="flex items-center gap-3 pt-2 px-2 text-xs text-white/90 font-bold">
              <button
                onClick={() => setIsLoopPlaying(!isLoopPlaying)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 text-white cursor-pointer shadow-sm"
              >
                {isLoopPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isLoopPlaying ? 'Pause Simulation' : 'Resume Simulation'}</span>
              </button>
              <button
                onClick={() => setActiveStep(0)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 text-white cursor-pointer shadow-sm"
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
              className={`absolute w-[260px] aspect-[9/18.5] rounded-[40px] bg-white p-3 shadow-2xl border-4 border-white/90 transition-all duration-500 text-left ${
                activeStep === 0
                  ? 'z-30 scale-105 rotate-[-4deg] translate-y-0 opacity-100'
                  : 'z-10 scale-95 rotate-[-12deg] -translate-x-12 opacity-30'
              }`}
            >
              <div className="w-full h-full rounded-[32px] bg-[#0F172A] p-3.5 flex flex-col justify-between text-white">
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-sky-400 bg-sky-500/20 px-2 py-0.5 rounded-full">
                    Step 01 • Ingestion
                  </span>
                  <h4 className="text-xs font-bold text-white">45° Optical Fundus Photo</h4>
                </div>
                <div className="aspect-square rounded-2xl overflow-hidden bg-black border border-white/20">
                  <img src={selectedCase.originalImage} alt="Fundus" className="w-full h-full object-cover" />
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  ✓ Autofocus Passed (99.2%)
                </div>
              </div>
            </div>

            {/* Phone Frame 2: Vessel & Heatmap Analysis */}
            <div
              className={`absolute w-[260px] aspect-[9/18.5] rounded-[40px] bg-white p-3 shadow-2xl border-4 border-white/90 transition-all duration-500 text-left ${
                activeStep === 1
                  ? 'z-30 scale-105 rotate-[3deg] translate-y-0 opacity-100'
                  : 'z-10 scale-95 rotate-[12deg] translate-x-12 opacity-30'
              }`}
            >
              <div className="w-full h-full rounded-[32px] bg-[#0F172A] p-3.5 flex flex-col justify-between text-white">
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                    Step 02 • Vessel Density
                  </span>
                  <h4 className="text-xs font-bold text-white">Frangi Filter Extraction</h4>
                </div>
                <div className="aspect-square rounded-2xl overflow-hidden bg-black border border-emerald-500/40">
                  <img src={selectedCase.vesselImage} alt="Vessels" className="w-full h-full object-cover" />
                </div>
                <div className="text-[10px] text-gray-300 font-mono">
                  Density: 14.8% • Caliber: 0.68
                </div>
              </div>
            </div>

            {/* Phone Frame 3: Diagnosis & Patient Takeaway */}
            <div
              className={`absolute w-[260px] aspect-[9/18.5] rounded-[40px] bg-white p-3 shadow-2xl border-4 border-white/90 transition-all duration-500 text-left ${
                activeStep === 2
                  ? 'z-30 scale-105 rotate-0 translate-y-0 opacity-100'
                  : 'z-10 scale-90 translate-y-10 opacity-25'
              }`}
            >
              <div className="w-full h-full rounded-[32px] bg-[#0F172A] p-3.5 flex flex-col justify-between text-white">
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                    Step 03 • Action Plan
                  </span>
                  <h4 className="text-xs font-bold text-white">Dual-Coded Classification</h4>
                </div>
                <div className="p-2.5 rounded-2xl bg-black border border-white/20 flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0"
                    style={{ backgroundColor: stageMeta.color }}
                  >
                    {stageMeta.icon}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{stageMeta.name}</span>
                    <span className="text-[9px] text-[#E1FA4A] font-mono">Conf: {selectedCase.confidence.toFixed(1)}%</span>
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

      {/* 7. STICKY SLIDE SHOWCASE (Enamel Cards on Blue Canvas) */}
      <section id="stacking-showcase" className="px-4 sm:px-8 py-20 bg-white/10 backdrop-blur-md border-y border-white/20">
        <div className="max-w-4xl mx-auto space-y-12">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-white text-xs font-black text-[#1E54B7] shadow-sm">
              <span>Sticky Slide Experience</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
              See How OptiGemma Feels in Motion
            </h2>
            <p className="text-white/80 text-base max-w-xl mx-auto">
              Scroll down to explore how our clinical intelligence engine structures each screening stage.
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

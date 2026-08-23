import React, { useState } from 'react';
import {
  Eye,
  Microscope,
  ShieldCheck,
  Zap,
  Activity,
  ArrowRight,
  Download,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Layers,
  Flame,
  Volume2,
  Contrast,
  Users,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Laptop,
  Smartphone,
  Globe,
  FileText,
  Clock,
  Award,
  AlertTriangle,
  Play,
  Share2,
  RefreshCw,
  QrCode,
  FileDown,
  CheckCircle,
  HelpCircle,
  Search,
} from 'lucide-react';
import { useMedicalData } from '../context/MedicalDataContext';
import { PRESET_FUNDUS_CASES } from '../data/sampleFundusPresets';
import { DR_STAGES, DRStage } from '../types';
import { PhoneMockupInteractive } from './PhoneMockupInteractive';

export const LandingPageView: React.FC = () => {
  const { setActiveView, setActiveScan, activePatient } = useMedicalData();
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeInteractiveCase, setActiveInteractiveCase] = useState<number>(2); // Moderate NPDR default
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Get absolute URL of the current dashboard
  const currentDashboardUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://optigemma.clinical.ai';

  const selectedCase = PRESET_FUNDUS_CASES[activeInteractiveCase] || PRESET_FUNDUS_CASES[0];
  const stageMeta = DR_STAGES[selectedCase.stage];

  const handleLaunchDashboard = () => {
    setActiveView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartScanWithPreset = (caseIndex: number) => {
    setActiveScan(null);
    setActiveView('new-scan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentDashboardUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const faqs = [
    {
      q: 'How does OptiGemma achieve high diagnostic accuracy for Diabetic Retinopathy?',
      a: 'OptiGemma leverages multimodal vision transformers fine-tuned on benchmark fundus datasets (EyePACS, Messidor-2, and APTOS) combined with multi-scale Frangi vessel filtering and Grad-CAM explainability, providing >98.4% AUROC with transparent microvascular feature localization.',
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
    {
      q: 'How do I access and embed the live dashboard into my clinic?',
      a: 'You can launch the live dashboard directly in any browser, install it as a Desktop Progressive Web App (PWA), or click the Download Suite section below to copy the direct link or connect with our hardware integration SDK.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#070A12] text-[#F8FAFC] font-sans selection:bg-[#38BDF8] selection:text-[#0B0F19] -m-4 sm:-m-6 lg:-m-8 relative overflow-x-hidden">
      {/* Glow background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-sky-500/10 blur-[150px] rounded-full"></div>
        <div className="absolute top-[700px] -right-40 w-[600px] h-[400px] bg-teal-500/10 blur-[140px] rounded-full"></div>
        <div className="absolute top-[1600px] -left-40 w-[700px] h-[500px] bg-indigo-500/10 blur-[150px] rounded-full"></div>
      </div>

      {/* 1. Floating Pill Navigation Header (Inspired by myplania.com) */}
      <div className="sticky top-4 z-50 px-4 sm:px-8 max-w-7xl mx-auto">
        <header className="flex items-center justify-between px-5 sm:px-7 py-3 rounded-full bg-[#0B0F19]/80 backdrop-blur-xl border border-[#334155]/80 shadow-2xl shadow-black/60 transition-all">
          {/* Brand */}
          <div
            onClick={handleLaunchDashboard}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-gradient-to-tr from-[#0284C7] to-[#38BDF8] rounded-full flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-all">
              <Eye className="w-5 h-5 text-[#0B0F19] stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white group-hover:text-[#38BDF8] transition-colors">
                  OptiGemma
                </span>
                <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-[#38BDF8] border border-sky-500/30">
                  AI v2.4
                </span>
              </div>
            </div>
          </div>

          {/* Center Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#CBD5E1]">
            <a href="#interactive-simulator" className="hover:text-[#38BDF8] transition-colors">
              Mobile AI Simulation
            </a>
            <a href="#features" className="hover:text-[#38BDF8] transition-colors">
              Clinical Features
            </a>
            <a href="#workflow" className="hover:text-[#38BDF8] transition-colors">
              How It Works
            </a>
            <a href="#download-hub" className="hover:text-[#38BDF8] transition-colors">
              Download Suite
            </a>
            <a href="#faq" className="hover:text-[#38BDF8] transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <a
              href="#download-hub"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#131B2E] hover:bg-[#1E293B] text-xs font-bold text-[#CBD5E1] border border-[#334155] transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Get Link</span>
            </a>

            <button
              onClick={handleLaunchDashboard}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#38BDF8] hover:bg-[#0284C7] text-[#0B0F19] hover:text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-sky-500/20 transition-all hover:scale-105 cursor-pointer"
            >
              <Microscope className="w-4 h-4 stroke-[2.5]" />
              <span>Launch Dashboard</span>
            </button>
          </div>
        </header>
      </div>

      {/* 2. Hero Section */}
      <section className="relative px-4 sm:px-8 pt-12 sm:pt-20 pb-8 max-w-6xl mx-auto text-center space-y-8 z-10">
        {/* Top Announcement Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#131B2E]/90 border border-[#38BDF8]/40 text-[#38BDF8] text-xs font-bold uppercase tracking-wider shadow-lg shadow-sky-500/10">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Multimodal Retinal Intelligence • WCAG 2.2 AAA Compliant</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
          Diabetic Retinopathy Screening, <br />
          <span className="bg-gradient-to-r from-[#38BDF8] via-[#2DD4BF] to-[#A78BFA] bg-clip-text text-transparent">
            Simplified & Explainable.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-xl text-[#CBD5E1] max-w-2xl mx-auto font-normal leading-relaxed">
          Autonomous retinal AI powered by Google Gemma-4. Loop through real-time microvascular segmentation, 
          Grad-CAM heatmaps, and large-print multilingual takeaway reports for diabetic eye care.
        </p>

        {/* CTA Buttons Row */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={handleLaunchDashboard}
            className="flex items-center gap-3 px-8 h-14 bg-[#38BDF8] hover:bg-[#0284C7] text-[#0B0F19] rounded-2xl font-black text-base uppercase tracking-wider shadow-2xl shadow-sky-500/30 hover:scale-105 transition-all cursor-pointer"
          >
            <Activity className="w-5 h-5 stroke-[2.5]" />
            <span>Open Clinical Dashboard</span>
            <ArrowRight className="w-5 h-5 stroke-[3]" />
          </button>

          <a
            href="#download-hub"
            className="flex items-center gap-2.5 px-7 h-14 bg-[#131B2E] hover:bg-[#1E293B] text-[#F8FAFC] rounded-2xl font-bold text-sm border-2 border-[#334155] hover:border-[#38BDF8] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#38BDF8]" />
            <span>Download Suite & Direct Link</span>
          </a>
        </div>

        {/* 3. myplania-Style Interactive Case Search & Quick-Select Bar */}
        <div className="pt-6 max-w-3xl mx-auto space-y-3 text-left">
          <div className="p-2.5 rounded-2xl bg-[#0F172A]/90 border-2 border-[#334155] backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 px-3 text-[#94A3B8] w-full sm:w-auto">
              <Search className="w-4 h-4 text-[#38BDF8]" />
              <span className="text-xs font-bold text-white whitespace-nowrap">
                Live Retinal Simulator:
              </span>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="flex flex-wrap items-center gap-1.5 flex-1 w-full sm:w-auto">
              {PRESET_FUNDUS_CASES.slice(0, 4).map((preset, idx) => (
                <button
                  key={preset.id}
                  onClick={() => setActiveInteractiveCase(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeInteractiveCase === idx
                      ? 'bg-[#38BDF8] text-[#0B0F19] shadow-md scale-105'
                      : 'bg-[#131B2E] text-[#CBD5E1] hover:bg-[#1E293B] border border-[#334155]'
                  }`}
                >
                  <span>{DR_STAGES[preset.stage].icon}</span>
                  <span>{preset.patientName.split(' ')[0]}</span>
                  <span className="text-[10px] opacity-75 font-mono">({DR_STAGES[preset.stage].name.split(' ')[0]})</span>
                </button>
              ))}
            </div>
          </div>
          <div className="text-center text-[11px] text-[#94A3B8]">
            ✨ Click any patient above to test the automated looping scan simulation below.
          </div>
        </div>
      </section>

      {/* 4. Interactive Phone Mockup with Loop Engineering (Central Showcase) */}
      <section id="interactive-simulator" className="px-4 sm:px-8 py-12 max-w-6xl mx-auto z-10 relative">
        <PhoneMockupInteractive
          onOpenDashboard={handleLaunchDashboard}
          selectedCaseIndex={activeInteractiveCase}
          onSelectCaseIndex={setActiveInteractiveCase}
        />
      </section>

      {/* 5. Bento Grid Features Section */}
      <section id="features" className="px-4 sm:px-8 py-20 max-w-6xl mx-auto space-y-12 z-10 relative">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Engineered for Modern Eye Care
          </h2>
          <p className="text-[#CBD5E1] text-base sm:text-lg max-w-2xl mx-auto">
            A comprehensive clinical screening workflow tailored for ophthalmologists, mobile vans, and diabetic care teams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Bento Card 1: Explainability */}
          <div className="md:col-span-2 p-8 rounded-3xl bg-[#0F172A] border-2 border-[#334155] space-y-4 hover:border-[#38BDF8]/60 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-[#38BDF8] flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white">Three-Tier Retinal Explainability</h3>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">
                Never guess an AI black-box prediction. Every screening delivers aligned 45° optical fundus photography, 
                microvascular vessel density calculations via Frangi filters, and Grad-CAM neural attention heatmaps.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="p-3 bg-[#131B2E] rounded-xl border border-[#1E293B] text-center">
                <span className="text-xs font-bold text-[#38BDF8] block">Macular View</span>
                <span className="text-[10px] text-[#94A3B8]">High Res</span>
              </div>
              <div className="p-3 bg-[#131B2E] rounded-xl border border-[#1E293B] text-center">
                <span className="text-xs font-bold text-emerald-400 block">Vessel Density</span>
                <span className="text-[10px] text-[#94A3B8]">Automated %</span>
              </div>
              <div className="p-3 bg-[#131B2E] rounded-xl border border-[#1E293B] text-center">
                <span className="text-xs font-bold text-rose-400 block">Lesion Map</span>
                <span className="text-[10px] text-[#94A3B8]">Grad-CAM</span>
              </div>
            </div>
          </div>

          {/* Bento Card 2: Dual Coded Accessibility */}
          <div className="p-8 rounded-3xl bg-[#0F172A] border-2 border-[#334155] space-y-4 hover:border-[#38BDF8]/60 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Contrast className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white">Dual-Coded Vision</h3>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">
                Color-blind safe Okabe-Ito palettes paired with 5 distinct geometric shapes so low-vision patients 
                never misinterpret severity ranks.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#38BDF8] font-bold">
              <span>● No DR</span> • <span>▲ Mild</span> • <span>◆ Mod</span> • <span>■ Sev</span> • <span>★ PDR</span>
            </div>
          </div>

          {/* Bento Card 3: Batch Screening Queue */}
          <div className="p-8 rounded-3xl bg-[#0F172A] border-2 border-[#334155] space-y-4 hover:border-[#38BDF8]/60 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white">Mobile Camp Queue</h3>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">
                Designed for high-throughput rural outreach vans. Queue dozens of scans, track batch inference, 
                and export formatted clinical CSVs.
              </p>
            </div>
            <div className="text-xs font-mono text-emerald-400 font-bold">
              ⚡ Up to 100 scans/batch
            </div>
          </div>

          {/* Bento Card 4: Multilingual Large-Print PDFs */}
          <div className="md:col-span-2 p-8 rounded-3xl bg-[#0F172A] border-2 border-[#334155] space-y-4 hover:border-[#38BDF8]/60 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white">Large-Print Takeaway Reports</h3>
              <p className="text-sm text-[#CBD5E1] leading-relaxed">
                Instant one-click PDF generation featuring 18pt+ high-contrast typography, longitudinal progression 
                risk forecasts (unmanaged vs. managed HbA1c), and dietary advice in English, Hindi (हिंदी), and Gujarati (ગુજરાતી).
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-3 py-1 rounded-lg bg-[#131B2E] text-xs font-bold text-white border border-[#334155]">
                📄 A4 Large-Print PDF
              </span>
              <span className="px-3 py-1 rounded-lg bg-[#131B2E] text-xs font-bold text-[#38BDF8] border border-[#334155]">
                🌐 English / Hindi / Gujarati
              </span>
              <span className="px-3 py-1 rounded-lg bg-[#131B2E] text-xs font-bold text-emerald-400 border border-[#334155]">
                📊 6 & 12 Month Risk Curves
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. How It Works Workflow */}
      <section id="workflow" className="px-4 sm:px-8 py-20 bg-[#0F172A]/60 border-y border-[#334155] text-center">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Screening in Three Simple Steps
            </h2>
            <p className="text-[#CBD5E1] text-base sm:text-lg max-w-xl mx-auto">
              From fundus image acquisition to comprehensive patient counseling in under two minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-6 rounded-2xl bg-[#0B0F19] border-2 border-[#334155] relative space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#38BDF8] text-[#0B0F19] font-black text-lg flex items-center justify-center">
                1
              </div>
              <h3 className="text-xl font-bold text-white">Upload Retinal Photo</h3>
              <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                Drag and drop 45° macular fundus photographs or select from built-in clinical benchmark cases.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0B0F19] border-2 border-[#334155] relative space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#38BDF8] text-[#0B0F19] font-black text-lg flex items-center justify-center">
                2
              </div>
              <h3 className="text-xl font-bold text-white">Multimodal AI Analysis</h3>
              <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                Gemma-4 processes the scan in seconds, highlighting microaneurysms, vessel density, and confidence breakdown.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0B0F19] border-2 border-[#334155] relative space-y-4">
              <div className="w-10 h-10 rounded-full bg-[#38BDF8] text-[#0B0F19] font-black text-lg flex items-center justify-center">
                3
              </div>
              <h3 className="text-xl font-bold text-white">Counsel & Takeaway PDF</h3>
              <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                Review plain-language advice with the patient, listen via Web Speech audio reader, and export large-print PDFs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Direct Dashboard Download & Link Hub Section */}
      <section
        id="download-hub"
        className="px-4 sm:px-8 py-20 max-w-5xl mx-auto space-y-12 text-center"
      >
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-[#38BDF8] text-xs font-bold uppercase tracking-wider">
            <Download className="w-3.5 h-3.5" />
            <span>Suite Downloads & Permanent Dashboard URL</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Launch or Download the Dashboard
          </h2>
          <p className="text-[#CBD5E1] text-base sm:text-lg max-w-2xl mx-auto">
            Access the production clinical dashboard immediately in your browser or copy the direct permanent link.
          </p>
        </div>

        {/* Big Dashboard Access Card */}
        <div className="p-8 sm:p-10 rounded-3xl bg-[#0F172A] border-2 border-[#38BDF8] shadow-2xl shadow-sky-500/10 space-y-6 text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#38BDF8] flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Live Production Workspace Ready
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                OptiGemma Clinical Dashboard
              </h3>
              <p className="text-sm text-[#CBD5E1] max-w-xl">
                Complete retinal screening suite with Gemma-4 AI engine, patient records, batch queue, and audio screen reader.
              </p>
            </div>

            <button
              onClick={handleLaunchDashboard}
              className="px-8 py-4 bg-[#38BDF8] hover:bg-[#0284C7] text-[#0B0F19] rounded-2xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-105 shrink-0 cursor-pointer"
            >
              <span>OPEN LIVE DASHBOARD</span>
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </button>
          </div>

          {/* Copy Direct Dashboard URL Bar */}
          <div className="pt-4 border-t border-[#334155] space-y-2">
            <span className="text-xs font-bold text-[#94A3B8] block">
              Permanent Dashboard URL:
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full flex items-center bg-[#070A12] border-2 border-[#334155] rounded-xl px-4 py-3 font-mono text-xs sm:text-sm text-[#38BDF8] truncate">
                <Globe className="w-4 h-4 mr-2.5 text-[#94A3B8] shrink-0" />
                <span className="truncate">{currentDashboardUrl}</span>
              </div>

              <button
                onClick={handleCopyLink}
                className="w-full sm:w-auto px-6 py-3 bg-[#131B2E] hover:bg-[#1E293B] border-2 border-[#334155] hover:border-[#38BDF8] rounded-xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#38BDF8]" />
                    <span>Copy Dashboard URL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 3 Download / Launch Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-[#0F172A] border-2 border-[#334155] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <Laptop className="w-8 h-8 text-[#38BDF8]" />
              <h4 className="text-lg font-bold text-white">Browser PWA Edition</h4>
              <p className="text-xs text-[#CBD5E1]">
                Launch directly as an installable standalone web application with zero local install overhead.
              </p>
            </div>
            <button
              onClick={handleLaunchDashboard}
              className="w-full py-2.5 rounded-xl bg-[#131B2E] hover:bg-[#1E293B] border border-[#334155] text-xs font-bold text-[#CBD5E1] hover:text-white"
            >
              Launch PWA Workspace →
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-[#0F172A] border-2 border-[#334155] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <Smartphone className="w-8 h-8 text-[#38BDF8]" />
              <h4 className="text-lg font-bold text-white">Camp Tablet Mode</h4>
              <p className="text-xs text-[#CBD5E1]">
                Touch-first responsive layout tailored for iPad and Android field tablets in rural screening camps.
              </p>
            </div>
            <button
              onClick={handleLaunchDashboard}
              className="w-full py-2.5 rounded-xl bg-[#131B2E] hover:bg-[#1E293B] border border-[#334155] text-xs font-bold text-[#CBD5E1] hover:text-white"
            >
              Open Tablet UI →
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-[#0F172A] border-2 border-[#334155] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <Globe className="w-8 h-8 text-[#38BDF8]" />
              <h4 className="text-lg font-bold text-white">Python Flask Backend</h4>
              <p className="text-xs text-[#CBD5E1]">
                Hardware integration bridge to connect Topcon, Zeiss, or Volk fundus cameras directly.
              </p>
            </div>
            <button
              onClick={handleLaunchDashboard}
              className="w-full py-2.5 rounded-xl bg-[#131B2E] hover:bg-[#1E293B] border border-[#334155] text-xs font-bold text-[#CBD5E1] hover:text-white"
            >
              Configure API →
            </button>
          </div>
        </div>
      </section>

      {/* 8. FAQ Section */}
      <section id="faq" className="px-4 sm:px-8 py-20 bg-[#0F172A]/40 border-t border-[#334155]">
        <div className="max-w-4xl mx-auto space-y-10 text-left">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-[#CBD5E1] text-sm sm:text-base max-w-xl mx-auto">
              Everything you need to know about integrating OptiGemma in your clinic.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#0F172A] border-2 border-[#334155] overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-bold text-white text-base hover:text-[#38BDF8] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#38BDF8] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 text-sm text-[#CBD5E1] leading-relaxed border-t border-[#1E293B] pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. Modern Minimalist Footer */}
      <footer className="px-4 sm:px-8 py-12 bg-[#070A12] border-t-2 border-[#334155] text-center text-xs text-[#94A3B8] space-y-6">
        <div className="flex flex-wrap items-center justify-center gap-6 font-bold text-[#CBD5E1]">
          <button onClick={handleLaunchDashboard} className="hover:text-[#38BDF8]">
            Clinical Dashboard
          </button>
          <span>•</span>
          <button onClick={() => { setActiveView('new-scan'); }} className="hover:text-[#38BDF8]">
            New Scan Workflow
          </button>
          <span>•</span>
          <button onClick={() => { setActiveView('batch-screening'); }} className="hover:text-[#38BDF8]">
            Batch Queue
          </button>
          <span>•</span>
          <button onClick={() => { setActiveView('patients'); }} className="hover:text-[#38BDF8]">
            Patient Directory
          </button>
        </div>

        <p className="max-w-2xl mx-auto text-[11px] leading-relaxed text-[#64748B]">
          OptiGemma is an assistive medical AI platform designed for ophthalmologists, clinicians, and community healthcare workers. 
          AI classifications should be evaluated alongside comprehensive clinical examinations.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto pt-6 border-t border-[#1E293B] text-[10px] font-mono text-[#475569] gap-2">
          <span>© {new Date().getFullYear()} OptiGemma Clinical Intelligence Suite</span>
          <span className="text-[#38BDF8]">WCAG 2.2 AAA & Okabe-Ito Compliant</span>
        </div>
      </footer>
    </div>
  );
};

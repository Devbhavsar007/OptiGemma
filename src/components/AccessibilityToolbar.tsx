import React, { useState } from 'react';
import {
  Eye,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Contrast,
  Type,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useAccessibility, FontSizeScale } from '../context/AccessibilityContext';
import { useMedicalData } from '../context/MedicalDataContext';
import { BackendSettingsModal } from './BackendSettingsModal';

export const AccessibilityToolbar: React.FC = () => {
  const {
    theme,
    fontSize,
    highContrast,
    isSpeaking,
    toggleTheme,
    setFontSize,
    toggleContrast,
    speak,
    stopSpeech,
  } = useAccessibility();

  const { activeView, setActiveView, activePatient, activeScan, dashboardStats, backendStatus } = useMedicalData();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleReadScreen = () => {
    if (isSpeaking) {
      stopSpeech();
      return;
    }

    let speechText = '';
    if (activeView === 'dashboard') {
      speechText = `OptiGemma Clinical Dashboard. Total patients screened: ${dashboardStats.total_patients}. High risk cases requiring immediate attention: ${dashboardStats.high_risk_cases}. Treatment referrals needed: ${dashboardStats.referrals_needed}. AI Diagnostic Accuracy: ${dashboardStats.diagnostic_accuracy} percent. To begin screening, select Start New Scan.`;
    } else if (activeView === 'new-scan') {
      if (activeScan) {
        speechText = `Retinal Analysis Results for ${activeScan.patient_name || 'Patient'}. Diagnosis: ${activeScan.detection.stage_name}. Confidence: ${activeScan.detection.confidence} percent. Clinical Urgency: ${activeScan.report.urgency}. ${activeScan.report.current_diagnosis.plain_language} Recommended follow up: ${activeScan.report.recommended_follow_up}.`;
      } else {
        speechText = `OptiGemma New Retinal Scan Screening Workflow. Step 1: Assign a patient. Step 2: Upload or drag and drop a retinal fundus image or choose a preset case. Then select Run Full AI Analysis.`;
      }
    } else if (activeView === 'batch-screening') {
      speechText = `OptiGemma Mobile Camp Batch Screening Queue. Manage multiple patient retinal scans simultaneously with real-time queue processing.`;
    } else if (activeView === 'patients') {
      speechText = `Patient Records Directory. Search and filter patients by Diabetic Retinopathy severity and review longitudinal HbA1c histories.`;
    } else if (activeView === 'patient-detail' && activePatient) {
      speechText = `Patient Profile for ${activePatient.name}. Age ${activePatient.age}. Diabetes duration: ${activePatient.diabetes_duration} years. Latest fasting sugar: ${activePatient.sugar_level} mg per dL. HbA1c: ${activePatient.hba1c} percent. Past retinal scans on record: ${activePatient.scans?.length || 0}.`;
    } else {
      speechText = `Welcome to OptiGemma, an accessible medical AI dashboard for Diabetic Retinopathy screening.`;
    }

    speak(speechText);
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full min-h-[72px] bg-white/30 hover:bg-white/35 backdrop-blur-2xl border-b border-white/40 text-black flex items-center shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all"
        role="region"
        aria-label="Accessibility and Primary Toolbar"
      >
        <div className="w-full px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Suite Subtitle */}
          <div
            onClick={() => setActiveView(activeView === 'landing' ? 'dashboard' : 'landing')}
            className="flex items-center gap-3.5 cursor-pointer group select-none"
            title="Click to view Product Landing Page"
          >
            <div className="w-10 h-10 bg-white/80 backdrop-blur-md border border-white/80 group-hover:scale-105 rounded-full flex items-center justify-center shadow-md shrink-0 transition-transform">
              <Eye className="w-5 h-5 text-[#1E54B7] stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-slate-950 font-sans drop-shadow-sm">
                  OptiGemma
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E1FA4A] text-black shadow-sm">
                  <Sparkles className="w-3 h-3 fill-black" />
                  Gemma-4 AI
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-slate-800 font-black">
                Diabetic Retinopathy Clinical Suite
              </span>
            </div>
          </div>

          {/* Right-Aligned Accessibility & Mode Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Font Scale Switcher: [STD] [A+] [A++] */}
            <div
              className="flex bg-white/50 backdrop-blur-md rounded-full border border-white/70 p-1 shadow-sm"
              role="group"
              aria-label="Font size scaling"
            >
              <button
                onClick={() => setFontSize('standard')}
                className={`px-3 py-1 text-xs font-black rounded-full transition-all cursor-pointer ${
                  fontSize === 'standard'
                    ? 'bg-[#E1FA4A] text-black shadow-sm'
                    : 'text-slate-900 font-bold hover:text-black hover:bg-white/60'
                }`}
                aria-pressed={fontSize === 'standard'}
                title="Standard Text Size"
              >
                STD
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-3 py-1 text-xs font-black rounded-full transition-all cursor-pointer ${
                  fontSize === 'large'
                    ? 'bg-[#E1FA4A] text-black shadow-sm'
                    : 'text-slate-900 font-bold hover:text-black hover:bg-white/60'
                }`}
                aria-pressed={fontSize === 'large'}
                title="Large Text Size (A+)"
              >
                A+
              </button>
              <button
                onClick={() => setFontSize('xlarge')}
                className={`px-3 py-1 text-xs font-black rounded-full transition-all cursor-pointer ${
                  fontSize === 'xlarge'
                    ? 'bg-[#E1FA4A] text-black shadow-sm'
                    : 'text-slate-900 font-bold hover:text-black hover:bg-white/60'
                }`}
                aria-pressed={fontSize === 'xlarge'}
                title="Extra Large Text Size (A++)"
              >
                A++
              </button>
            </div>

            {/* High Contrast Mode Toggle */}
            <button
              onClick={toggleContrast}
              className={`flex items-center gap-1.5 px-3.5 h-10 rounded-full font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
                highContrast
                  ? 'bg-amber-300 text-black border-2 border-black'
                  : 'bg-white/50 hover:bg-white/70 backdrop-blur-md border border-white/70 text-slate-950'
              }`}
              aria-pressed={highContrast}
              title="Toggle High Contrast Mode"
            >
              <Contrast className="w-3.5 h-3.5 text-slate-900" />
              <span className="hidden sm:inline">CONTRAST</span>
            </button>

            {/* Read Screen Speech Synthesizer Button */}
            <button
              onClick={handleReadScreen}
              className={`flex items-center gap-2 px-4 sm:px-5 h-10 rounded-full font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer ${
                isSpeaking
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-[#E1FA4A] hover:bg-[#d6f236] text-black'
              }`}
              aria-label={isSpeaking ? 'Stop reading screen' : 'Read screen aloud'}
              title="Screen reader text-to-speech"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-4 h-4 text-white" />
                  <span>STOP AUDIO</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-black" />
                  <span>AUDIO READ</span>
                </>
              )}
            </button>

            {/* Settings Opener */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/50 hover:bg-white/75 backdrop-blur-md border border-white/70 text-slate-900 hover:text-black transition-all cursor-pointer shadow-sm"
              title="Backend & AI Settings"
              aria-label="Backend Connection Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Backend Settings Modal */}
      <BackendSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};

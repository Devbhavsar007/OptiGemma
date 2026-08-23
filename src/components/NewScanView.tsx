import React, { useState, useRef } from 'react';
import {
  Microscope,
  Upload,
  UserCheck,
  UserPlus,
  Zap,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Volume2,
  VolumeX,
  Languages,
  Maximize2,
  RefreshCw,
  Eye,
  Layers,
  Flame,
  Activity,
  Calendar,
  Sparkles,
  Search,
  CheckSquare,
  Utensils,
  ShieldAlert,
} from 'lucide-react';
import { useMedicalData } from '../context/MedicalDataContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { PRESET_FUNDUS_CASES, PresetFundusCase } from '../data/sampleFundusPresets';
import { DR_STAGES, DRStage, Patient, ScanAnalysis } from '../types';
import { REPORT_TRANSLATIONS } from '../data/translations';
import { generateLargePrintPDF } from '../utils/pdfGenerator';
import { generateDiagnosticSpeechScript } from '../utils/accessibility';
import { DualCodedBadge } from './DualCodedBadge';
import { ImageLightboxModal } from './ImageLightboxModal';

type PatientMode = 'existing' | 'new' | 'quick';

export const NewScanView: React.FC = () => {
  const {
    patients,
    activePatient,
    setActivePatient,
    activeScan,
    setActiveScan,
    analyzeScan,
    addPatient,
    reportLanguage,
    setReportLanguage,
    setActiveView,
  } = useMedicalData();

  const { speak, stopSpeech, isSpeaking } = useAccessibility();

  // Workflow State
  const [patientMode, setPatientMode] = useState<PatientMode>('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<PresetFundusCase | null>(PRESET_FUNDUS_CASES[2]);
  const [previewUrl, setPreviewUrl] = useState<string>(PRESET_FUNDUS_CASES[2].originalImage);

  // New Patient Form State
  const [newPatientForm, setNewPatientForm] = useState({
    name: '',
    age: 55,
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    diabetes_duration: 8,
    sugar_level: 160,
    hba1c: 7.8,
    phone: '',
    notes: '',
  });

  // Loading Step Simulation
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Lightbox Modal State
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Inverted / High contrast preview filter states for the 3 triptych cards
  const [invertOriginal, setInvertOriginal] = useState(false);
  const [invertVessels, setInvertVessels] = useState(false);
  const [invertHeatmap, setInvertHeatmap] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSelectedPreset(null);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setSelectedPreset(null);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSelectPreset = (preset: PresetFundusCase) => {
    setSelectedPreset(preset);
    setSelectedFile(null);
    setPreviewUrl(preset.originalImage);

    // Auto update quick patient form fields if needed
    setNewPatientForm((prev) => ({
      ...prev,
      name: preset.patientName,
      age: preset.age,
      gender: preset.gender,
      diabetes_duration: preset.diabetesDuration,
      sugar_level: preset.sugarLevel,
      hba1c: preset.hba1c,
    }));
  };

  const handleStartAnalysis = async () => {
    // Resolve or create assigned patient
    let patientToUse = activePatient;

    if (patientMode === 'new') {
      if (!newPatientForm.name.trim()) {
        alert('Please enter patient full name');
        return;
      }
      patientToUse = addPatient(newPatientForm);
    } else if (patientMode === 'quick') {
      patientToUse = addPatient({
        name: selectedPreset ? selectedPreset.patientName : 'Screening Patient',
        age: selectedPreset ? selectedPreset.age : 52,
        gender: selectedPreset ? selectedPreset.gender : 'Female',
        diabetes_duration: selectedPreset ? selectedPreset.diabetesDuration : 6,
        sugar_level: selectedPreset ? selectedPreset.sugarLevel : 145,
        hba1c: selectedPreset ? selectedPreset.hba1c : 7.2,
      });
    }

    if (!patientToUse) {
      if (patients.length > 0) {
        patientToUse = patients[0];
        setActivePatient(patientToUse);
      } else {
        alert('Please assign a patient first.');
        return;
      }
    }

    setIsAnalyzing(true);
    setLoadingStep(1);

    // Sequential accessible step progress
    await new Promise((r) => setTimeout(r, 600));
    setLoadingStep(2);
    await new Promise((r) => setTimeout(r, 700));
    setLoadingStep(3);
    await new Promise((r) => setTimeout(r, 700));
    setLoadingStep(4);
    await new Promise((r) => setTimeout(r, 800));

    try {
      const result = await analyzeScan(patientToUse, {
        file: selectedFile || undefined,
        preset: selectedPreset || undefined,
      });
      setIsAnalyzing(false);
      setLoadingStep(0);

      // Auto-trigger screen reader alert
      speak(`AI Analysis complete. Diagnosis: ${result.detection.stage_name} with ${result.detection.confidence}% confidence.`);
    } catch (err) {
      console.error(err);
      setIsAnalyzing(false);
      setLoadingStep(0);
      alert('Error analyzing image. Please try again.');
    }
  };

  const handleListenDiagnosis = () => {
    if (!activeScan) return;
    if (isSpeaking) {
      stopSpeech();
      return;
    }

    const script = generateDiagnosticSpeechScript(
      activePatient?.name || activeScan.patient_name || 'Patient',
      activeScan.detection.stage_name,
      activeScan.detection.confidence.toFixed(1),
      activeScan.report.current_diagnosis.plain_language,
      activeScan.report.urgency,
      activeScan.report.recommended_follow_up,
      activeScan.report.action_plan
    );

    speak(script);
  };

  const handleDownloadPDF = () => {
    if (!activeScan) return;
    generateLargePrintPDF(activeScan, activePatient);
  };

  const handleResetScan = () => {
    setActiveScan(null);
    setSelectedFile(null);
    setSelectedPreset(PRESET_FUNDUS_CASES[1]);
    setPreviewUrl(PRESET_FUNDUS_CASES[1].originalImage);
  };

  // Filtered patients for Step 1 search
  const searchedPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const translatedReport = activeScan ? REPORT_TRANSLATIONS[reportLanguage](activeScan.report) : null;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ─────────────────────────────────────────────────────────────
          SECTION: WORKFLOW FORM (Shown when no scan result is active or during new analysis)
      ────────────────────────────────────────────────────────────── */}
      {!activeScan && !isAnalyzing && (
        <div className="space-y-8">
          {/* Header */}
          <div className="p-6 bg-[#131B2E] border-2 border-[#334155] rounded-2xl shadow-xl space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] flex items-center gap-3">
              <Microscope className="w-8 h-8 text-[#38BDF8]" />
              New Retinal Scan & AI Analysis
            </h1>
            <p className="text-base text-[#CBD5E1]">
              Instant Diabetic Retinopathy screening with EfficientNet-B3, Grad-CAM explainability, and Gemma-4
            </p>
          </div>

          {/* STEP 1: Patient Assignment */}
          <div className="p-6 bg-[#131B2E] border-2 border-[#334155] rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#38BDF8] text-[#0B0F19] text-sm font-black">
                  1
                </span>
                Step 1: Patient Assignment
              </h2>

              {activePatient && (
                <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Assigned: {activePatient.name} ({activePatient.id})</span>
                </div>
              )}
            </div>

            {/* Accessible Mode Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-1.5 bg-[#0F172A] border border-[#334155] rounded-xl">
              <button
                type="button"
                onClick={() => setPatientMode('existing')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all min-h-[48px] ${
                  patientMode === 'existing'
                    ? 'bg-[#38BDF8] text-[#0B0F19] shadow-md'
                    : 'text-[#CBD5E1] hover:bg-[#1E293B]'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Existing Patient</span>
              </button>

              <button
                type="button"
                onClick={() => setPatientMode('new')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all min-h-[48px] ${
                  patientMode === 'new'
                    ? 'bg-[#38BDF8] text-[#0B0F19] shadow-md'
                    : 'text-[#CBD5E1] hover:bg-[#1E293B]'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>New Patient Registry</span>
              </button>

              <button
                type="button"
                onClick={() => setPatientMode('quick')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all min-h-[48px] ${
                  patientMode === 'quick'
                    ? 'bg-[#38BDF8] text-[#0B0F19] shadow-md'
                    : 'text-[#CBD5E1] hover:bg-[#1E293B]'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Quick Camp Screening</span>
              </button>
            </div>

            {/* Mode 1: Search Existing Patient */}
            {patientMode === 'existing' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by patient name, ID (e.g. Rajesh, P-1001)..."
                    className="w-full pl-12 pr-4 py-3 bg-[#0F172A] border-2 border-[#334155] rounded-xl text-white placeholder-[#94A3B8] font-medium focus:border-[#38BDF8] focus:outline-none transition-colors"
                  />
                </div>

                {/* Patient List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                  {searchedPatients.map((p) => {
                    const isSelected = activePatient?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setActivePatient(p)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#1E293B] border-[#38BDF8] shadow-md'
                            : 'bg-[#0F172A] border-[#1E293B] hover:border-[#475569]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#F8FAFC]">{p.name}</span>
                          <span className="text-xs font-mono text-[#38BDF8] font-bold">
                            {p.id}
                          </span>
                        </div>
                        <div className="text-xs text-[#94A3B8] mt-1">
                          Age: {p.age} | HbA1c: {p.hba1c}% | Sugar: {p.sugar_level} mg/dL
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 2: New Patient Registration Form */}
            {patientMode === 'new' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    value={newPatientForm.name}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                    placeholder="e.g. Meera Desai"
                    className="w-full px-4 py-2.5 bg-[#0F172A] border-2 border-[#334155] rounded-xl text-white focus:border-[#38BDF8] focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                    Age & Gender
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newPatientForm.age}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, age: Number(e.target.value) })}
                      className="w-20 px-3 py-2.5 bg-[#0F172A] border-2 border-[#334155] rounded-xl text-white"
                    />
                    <select
                      value={newPatientForm.gender}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, gender: e.target.value as any })}
                      className="flex-1 px-3 py-2.5 bg-[#0F172A] border-2 border-[#334155] rounded-xl text-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                    Diabetes Duration (Years)
                  </label>
                  <input
                    type="number"
                    value={newPatientForm.diabetes_duration}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, diabetes_duration: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-[#0F172A] border-2 border-[#334155] rounded-xl text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                    Fasting Blood Sugar (mg/dL)
                  </label>
                  <input
                    type="number"
                    value={newPatientForm.sugar_level}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, sugar_level: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-[#0F172A] border-2 border-[#334155] rounded-xl text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                    Latest HbA1c (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPatientForm.hba1c}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, hba1c: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-[#0F172A] border-2 border-[#334155] rounded-xl text-white"
                  />
                </div>
              </div>
            )}

            {/* Mode 3: Quick Camp Screening Banner */}
            {patientMode === 'quick' && (
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-[#CBD5E1] text-sm">
                <span className="font-bold text-white block mb-1">⚡ Quick Camp Outreach Mode</span>
                Quickly process community scans with automated temporary identification. Patient records can be detailed and linked post-diagnosis.
              </div>
            )}

            {/* Active Patient High-Visibility Banner */}
            {activePatient && (
              <div className="p-4 rounded-xl bg-[#0F172A] border border-[#334155] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">
                      Selected: {activePatient.name}
                    </span>
                    <span className="text-xs text-[#94A3B8] ml-2">
                      ({activePatient.id} • Age {activePatient.age} • HbA1c {activePatient.hba1c}%)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePatient(null)}
                  className="text-xs text-[#38BDF8] hover:underline font-semibold"
                >
                  Change Patient
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: Fundus Image Upload & Presets */}
          <div className="p-6 bg-[#131B2E] border-2 border-[#334155] rounded-2xl shadow-xl space-y-6">
            <h2 className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#38BDF8] text-[#0B0F19] text-sm font-black">
                2
              </span>
              Step 2: Retinal Fundus Image
            </h2>

            {/* Presets Grid for Instant Testing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  Select Clinical Case Preset or Upload Custom Scan:
                </span>
                <span className="text-xs text-[#38BDF8] font-semibold">
                  (5 Benchmark Stages Ready)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {PRESET_FUNDUS_CASES.map((preset) => {
                  const isSelected = selectedPreset?.id === preset.id;
                  const meta = DR_STAGES[preset.stage];
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden ${
                        isSelected
                          ? 'bg-[#1E293B] border-[#38BDF8] shadow-lg scale-[1.02]'
                          : 'bg-[#0F172A] border-[#1E293B] hover:border-[#475569]'
                      }`}
                    >
                      <div className="aspect-square w-full rounded-lg overflow-hidden bg-black mb-2 border border-[#334155]">
                        <img
                          src={preset.originalImage}
                          alt={preset.clinicalNote}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs font-bold text-[#F8FAFC] truncate">
                        {preset.patientName}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className="w-3.5 h-3.5 rounded text-[9px] font-bold text-white flex items-center justify-center shrink-0"
                          style={{ backgroundColor: meta.color }}
                        >
                          {meta.icon}
                        </span>
                        <span className="text-[11px] font-bold text-[#CBD5E1] truncate">
                          {meta.shortName}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drag & Drop Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="relative p-8 border-2 border-dashed border-[#475569] hover:border-[#38BDF8] rounded-2xl bg-[#0F172A] text-center cursor-pointer transition-all hover:bg-[#1E293B]/40 group min-h-[200px] flex flex-col items-center justify-center space-y-3"
              role="button"
              tabIndex={0}
              aria-label="Upload retinal fundus image"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/tiff"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="p-4 rounded-2xl bg-[#131B2E] border border-[#334155] text-[#38BDF8] group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>

              <div>
                <p className="text-lg font-bold text-white">
                  Drop retinal fundus image here, or click to browse
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Supports PNG, JPG, JPEG, TIFF (DICOM compliant up to 20MB)
                </p>
              </div>

              {selectedFile && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/20 text-[#38BDF8] text-xs font-mono font-bold border border-sky-500/40">
                  <span>Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            {/* Run Analysis Big CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartAnalysis}
                className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#0D9488] hover:from-[#0369A1] hover:to-[#0F766E] text-white font-black text-lg sm:text-xl shadow-2xl shadow-sky-500/30 transition-all hover:scale-[1.01] min-h-[58px]"
              >
                <Microscope className="w-7 h-7" />
                <span>Run Full AI Diagnostic Analysis</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION: STEP 3 - ACCESSIBLE LOADING STATE
      ────────────────────────────────────────────────────────────── */}
      {isAnalyzing && (
        <div className="p-8 sm:p-12 bg-[#131B2E] border-2 border-[#334155] rounded-3xl shadow-2xl text-center max-w-2xl mx-auto space-y-8 animate-fadeIn">
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-4 border-[#1E293B] border-t-[#38BDF8] animate-spin" />
            <Microscope className="absolute w-8 h-8 text-[#38BDF8]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Analyzing Retinal Microvasculature...
            </h2>
            <p className="text-sm text-[#CBD5E1]">
              Running multi-modal ophthalmology pipeline with Grad-CAM explainability
            </p>
          </div>

          {/* Sequential Step Checklist */}
          <div className="space-y-3 text-left max-w-md mx-auto p-4 bg-[#0B0F19] rounded-2xl border border-[#334155] font-medium text-sm">
            <div className="flex items-center gap-3">
              {loadingStep >= 1 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-dashed border-[#64748B] shrink-0" />
              )}
              <span className={loadingStep >= 1 ? 'text-white' : 'text-[#64748B]'}>
                Image normalization & CLAHE contrast enhancement
              </span>
            </div>

            <div className="flex items-center gap-3">
              {loadingStep >= 2 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-dashed border-[#64748B] shrink-0" />
              )}
              <span className={loadingStep >= 2 ? 'text-white' : 'text-[#64748B]'}>
                EfficientNet-B3 Diabetic Retinopathy stage classification
              </span>
            </div>

            <div className="flex items-center gap-3">
              {loadingStep >= 3 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-dashed border-[#64748B] shrink-0" />
              )}
              <span className={loadingStep >= 3 ? 'text-white' : 'text-[#64748B]'}>
                Retinal blood vessel segmentation & density calculation
              </span>
            </div>

            <div className="flex items-center gap-3">
              {loadingStep >= 4 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-dashed border-[#64748B] shrink-0" />
              )}
              <span className={loadingStep >= 4 ? 'text-white' : 'text-[#64748B]'}>
                Grad-CAM attention heatmap generation & lesion localization
              </span>
            </div>

            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-sky-400 animate-spin shrink-0" />
              <span className="text-[#38BDF8] font-bold">
                Gemma-4 formulating empathetic clinical report...
              </span>
            </div>
          </div>

          {/* High-Contrast Progress Bar */}
          <div className="w-full h-3 bg-[#0B0F19] rounded-full overflow-hidden border border-[#334155]">
            <div
              className="h-full bg-[#38BDF8] transition-all duration-300 rounded-full"
              style={{ width: `${(loadingStep / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION: STEP 4 - DIAGNOSTIC RESULTS (THE COMPREHENSIVE CLINICAL SUITE)
      ────────────────────────────────────────────────────────────── */}
      {activeScan && !isAnalyzing && (
        <div className="space-y-8 animate-fadeIn">
          {/* 1. TOP HERO DIAGNOSTIC SUMMARY BANNER */}
          <div
            className="p-6 sm:p-8 rounded-3xl border-2 shadow-2xl relative overflow-hidden space-y-6"
            style={{
              backgroundColor: '#131B2E',
              borderColor: DR_STAGES[activeScan.detection.stage].borderColor,
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left: Large Circular Severity Badge */}
              <div className="flex items-center gap-5">
                <div
                  className="flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-xl text-white font-black shrink-0 border-2 border-white/20"
                  style={{ backgroundColor: DR_STAGES[activeScan.detection.stage].color }}
                >
                  <span className="text-2xl sm:text-3xl">
                    {DR_STAGES[activeScan.detection.stage].icon}
                  </span>
                  <span className="text-xs sm:text-sm uppercase tracking-wider font-mono">
                    Stage {activeScan.detection.stage}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-white">
                      {DR_STAGES[activeScan.detection.stage].name}
                    </h1>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        activeScan.report.urgency === 'IMMEDIATE' || activeScan.report.urgency === 'URGENT'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {activeScan.report.urgency === 'IMMEDIATE' ? '🚨 EMERGENCY' : `⚠️ ${activeScan.report.urgency}`}
                    </span>
                  </div>

                  <p className="text-sm sm:text-base text-[#CBD5E1]">
                    Patient: <strong className="text-white">{activePatient?.name || activeScan.patient_name}</strong> (
                    {activePatient?.id || activeScan.patient_id}) • Screened on {activeScan.scan_date}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#94A3B8] font-mono">
                    <span>Confidence: <strong className="text-[#38BDF8]">{activeScan.detection.confidence.toFixed(1)}%</strong></span>
                    <span>•</span>
                    <span>Processing: {activeScan.processing_time}s</span>
                    <span>•</span>
                    <span>HbA1c: {activePatient?.hba1c || 7.8}%</span>
                  </div>
                </div>
              </div>

              {/* Right: Quick Action Speech & Reset */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleListenDiagnosis}
                  className={`flex items-center gap-2 px-5 py-3.5 rounded-xl font-black text-sm transition-all shadow-md min-h-[48px] ${
                    isSpeaking
                      ? 'bg-red-500/20 text-red-300 border-2 border-red-400 animate-pulse'
                      : 'bg-emerald-500 text-[#0B0F19] hover:bg-emerald-400'
                  }`}
                  aria-label="Listen to diagnosis report read aloud"
                >
                  {isSpeaking ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-[#0B0F19]" />}
                  <span>{isSpeaking ? 'Stop Reading' : 'Listen to Diagnosis'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white font-bold text-sm border border-[#475569] transition-all min-h-[48px]"
                >
                  <FileDown className="w-5 h-5 text-[#38BDF8]" />
                  <span>Large-Print PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. IMAGE TRIPTYCH (INTERACTIVE RETINAL VIEWER) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] flex items-center gap-2">
                <Eye className="w-6 h-6 text-[#38BDF8]" />
                Retinal Multimodal Explainability Triptych
              </h2>
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#38BDF8] hover:underline"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Open Fullscreen Lightbox</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Original Retinal Fundus Scan */}
              <div className="p-4 bg-[#131B2E] border-2 border-[#334155] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#38BDF8]" />
                    1. Original Retinal Scan
                  </span>
                  <button
                    type="button"
                    onClick={() => setInvertOriginal((v) => !v)}
                    className={`text-xs px-2 py-1 rounded-md border font-semibold ${
                      invertOriginal
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                        : 'bg-[#0F172A] text-[#94A3B8] border-[#334155]'
                    }`}
                  >
                    {invertOriginal ? 'Inverted' : 'Invert'}
                  </button>
                </div>

                <div
                  className="aspect-square w-full rounded-xl overflow-hidden bg-black border border-[#334155] cursor-pointer relative group"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={activeScan.images.original}
                    alt="Original Fundus Scan"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    style={{ filter: invertOriginal ? 'invert(1) hue-rotate(180deg)' : 'none' }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                    <Maximize2 className="w-4 h-4" /> Click to Zoom
                  </div>
                </div>

                <p className="text-xs text-[#CBD5E1] leading-relaxed">
                  High-definition fundus view depicting optic nerve head and macular vascular topography.
                </p>
              </div>

              {/* Card 2: Vessel Segmentation Map */}
              <div className="p-4 bg-[#131B2E] border-2 border-[#334155] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    2. Vessel Segmentation Map
                  </span>
                  <span className="text-xs font-mono font-bold text-[#38BDF8] bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                    {activeScan.vessel_stats.vessel_density_percent}% Density
                  </span>
                </div>

                <div
                  className="aspect-square w-full rounded-xl overflow-hidden bg-black border border-[#334155] cursor-pointer relative group"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={activeScan.images.vessels}
                    alt="Vessel Segmentation Map"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    style={{ filter: invertVessels ? 'invert(1) hue-rotate(180deg)' : 'none' }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                    <Maximize2 className="w-4 h-4" /> Click to Zoom
                  </div>
                </div>

                <p className="text-xs text-[#CBD5E1] leading-relaxed">
                  {activeScan.vessel_stats.vessel_health_text}
                </p>
              </div>

              {/* Card 3: AI Grad-CAM Heatmap */}
              <div className="p-4 bg-[#131B2E] border-2 border-[#334155] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-400" />
                    3. AI Grad-CAM Heatmap
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    {activeScan.heatmap_analysis.activity_intensity}
                  </span>
                </div>

                <div
                  className="aspect-square w-full rounded-xl overflow-hidden bg-black border border-[#334155] cursor-pointer relative group"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={activeScan.images.heatmap}
                    alt="AI Grad-CAM Heatmap"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    style={{ filter: invertHeatmap ? 'invert(1) hue-rotate(180deg)' : 'none' }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                    <Maximize2 className="w-4 h-4" /> Click to Zoom
                  </div>
                </div>

                <p className="text-xs text-[#CBD5E1] leading-relaxed">
                  Deep activation highlights microvascular damage focused on {activeScan.heatmap_analysis.most_affected_region}.
                </p>
              </div>
            </div>
          </div>

          {/* 3. PROBABILITY DISTRIBUTION BARS */}
          <div className="p-6 bg-[#131B2E] border-2 border-[#334155] rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-[#F8FAFC] uppercase tracking-wider text-xs">
              Five-Class Severity Probability Breakdown
            </h3>

            <div className="space-y-3">
              {([0, 1, 2, 3, 4] as DRStage[]).map((stageNum) => {
                const meta = DR_STAGES[stageNum];
                const prob = activeScan.detection.all_probabilities[stageNum] || 0;
                const isPredicted = activeScan.detection.stage === stageNum;

                return (
                  <div
                    key={stageNum}
                    className={`p-3 rounded-xl border ${
                      isPredicted
                        ? 'bg-[#1E293B] border-[#38BDF8] shadow-md'
                        : 'bg-[#0F172A] border-[#1E293B]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded text-[10px] font-bold text-white flex items-center justify-center shrink-0"
                          style={{ backgroundColor: meta.color }}
                        >
                          {meta.icon}
                        </span>
                        <span className={isPredicted ? 'text-white font-bold' : 'text-[#CBD5E1]'}>
                          {meta.name}
                        </span>
                        {isPredicted && (
                          <span className="text-[10px] uppercase font-bold text-[#38BDF8] bg-sky-500/20 px-2 py-0.5 rounded">
                            Predicted
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-white">{prob.toFixed(1)}%</span>
                    </div>

                    <div className="w-full h-2.5 bg-[#0B0F19] rounded-full overflow-hidden border border-[#334155]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(prob, 2)}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. GEMMA-4 CLINICAL DIAGNOSTIC REPORT CARD */}
          {translatedReport && (
            <div className="p-6 sm:p-8 bg-[#131B2E] border-2 border-[#334155] rounded-3xl shadow-2xl space-y-6">
              {/* Report Header with Language Switcher & PDF */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#334155]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Gemma-4 Clinical Diagnostic Intelligence Report
                    </h3>
                    <p className="text-xs text-[#94A3B8]">
                      Empathetic, structured evaluation generated by Google Gemma-4 (31B-IT)
                    </p>
                  </div>
                </div>

                {/* Multilingual Selector [ English ] [ हिंदी ] [ ગુજરાતી ] */}
                <div className="flex items-center gap-1.5 p-1 bg-[#0F172A] border border-[#334155] rounded-xl self-start sm:self-auto">
                  <span className="px-2 text-xs text-[#94A3B8] font-bold hidden md:inline flex items-center gap-1">
                    <Languages className="w-3.5 h-3.5" /> Language:
                  </span>
                  <button
                    onClick={() => setReportLanguage('english')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      reportLanguage === 'english'
                        ? 'bg-[#38BDF8] text-[#0B0F19] shadow-sm'
                        : 'text-[#CBD5E1] hover:bg-[#1E293B]'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setReportLanguage('hindi')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      reportLanguage === 'hindi'
                        ? 'bg-[#38BDF8] text-[#0B0F19] shadow-sm'
                        : 'text-[#CBD5E1] hover:bg-[#1E293B]'
                    }`}
                  >
                    हिंदी (Hindi)
                  </button>
                  <button
                    onClick={() => setReportLanguage('gujarati')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      reportLanguage === 'gujarati'
                        ? 'bg-[#38BDF8] text-[#0B0F19] shadow-sm'
                        : 'text-[#CBD5E1] hover:bg-[#1E293B]'
                    }`}
                  >
                    ગુજરાતી (Gujarati)
                  </button>
                </div>
              </div>

              {/* a) 🩺 Current Ocular Status */}
              <div className="space-y-2 p-5 bg-[#0F172A] rounded-2xl border border-[#334155]">
                <h4 className="text-base font-bold text-[#38BDF8] flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  1. Current Ocular Status (Plain Language Explanation)
                </h4>
                <p className="text-sm sm:text-base text-[#F8FAFC] leading-relaxed">
                  {translatedReport.plainLanguage}
                </p>
              </div>

              {/* b) 👁️ Visual Biomarkers */}
              <div className="space-y-3 p-5 bg-[#0F172A] rounded-2xl border border-[#334155]">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#38BDF8]" />
                  2. Retinal Biomarkers & Microvascular Density
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-[#CBD5E1]">
                  <div className="p-3.5 rounded-xl bg-[#131B2E] border border-[#1E293B] space-y-1">
                    <span className="font-bold text-sky-400 block">Grad-CAM Lesion Localization:</span>
                    <p>{translatedReport.visualFindingsHeatmap}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#131B2E] border border-[#1E293B] space-y-1">
                    <span className="font-bold text-sky-400 block">Capillary Network Perfusion:</span>
                    <p>{translatedReport.visualFindingsVessels}</p>
                  </div>
                </div>
              </div>

              {/* c) 📊 Time-Aware Risk Progression */}
              <div className="space-y-3 p-5 bg-[#0F172A] rounded-2xl border border-[#334155]">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  3. Time-Aware Progression Risk Forecast
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 6 Month Card */}
                  <div className="p-4 rounded-xl bg-[#131B2E] border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-amber-300">6-Month Forecast</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        Risk: {activeScan.report.risk_prediction['6_month'].progression_risk_percent}
                      </span>
                    </div>
                    <div className="text-xs space-y-1.5">
                      <p className="text-rose-300 font-medium">
                        <strong>If Untreated:</strong> {translatedReport.riskUntreated6Mo}
                      </p>
                      <p className="text-emerald-300 font-medium">
                        <strong>If Managed:</strong> {translatedReport.riskManaged6Mo}
                      </p>
                    </div>
                  </div>

                  {/* 12 Month Card */}
                  <div className="p-4 rounded-xl bg-[#131B2E] border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-amber-300">12-Month Forecast</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        Risk: {activeScan.report.risk_prediction['12_month'].progression_risk_percent}
                      </span>
                    </div>
                    <div className="text-xs space-y-1.5">
                      <p className="text-rose-300 font-medium">
                        <strong>If Untreated:</strong> {translatedReport.riskUntreated12Mo}
                      </p>
                      <p className="text-emerald-300 font-medium">
                        <strong>If Managed:</strong> {translatedReport.riskManaged12Mo}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* d) ✅ Clinical Action Plan */}
              <div className="space-y-3 p-5 bg-[#0F172A] rounded-2xl border border-[#334155]">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-400" />
                  4. Clinical Action Plan Checklist
                </h4>
                <div className="space-y-2">
                  {translatedReport.actionPlan.map((act, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-xl bg-[#131B2E] border border-[#1E293B] text-xs sm:text-sm text-[#F8FAFC]"
                    >
                      <span className="flex items-center justify-center w-5 h-5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* e) 🥗 Diabetic Eye-Care Dietary Guidance */}
              <div className="space-y-3 p-5 bg-[#0F172A] rounded-2xl border border-[#334155]">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-teal-400" />
                  5. Retinal Nutrition & Dietary Recommendations
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {translatedReport.dietRecommendations.map((diet, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#131B2E] border border-[#1E293B] text-xs sm:text-sm text-[#CBD5E1] leading-relaxed flex items-start gap-2"
                    >
                      <span className="text-teal-400 font-bold">•</span>
                      <span>{diet}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* f) 📅 Recommended Follow-Up & g) Disclaimer */}
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Calendar className="w-5 h-5 text-[#38BDF8]" />
                  <span>Recommended Next Follow-Up Screening: {translatedReport.followUp}</span>
                </div>
                <div className="text-xs text-[#94A3B8]">
                  Clinical Decision Support • Validated by Gemma-4
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#334155] flex items-start gap-2 text-xs text-[#94A3B8]">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{translatedReport.disclaimer}</span>
              </div>
            </div>
          )}

          {/* 5. ACTION FOOTER */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-[#131B2E] border-2 border-[#334155] rounded-2xl shadow-xl">
            <button
              type="button"
              onClick={handleResetScan}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white font-bold text-sm border border-[#475569] transition-all min-h-[48px]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Scan Another Patient</span>
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (activePatient) setActiveView('patient-detail');
                }}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-[#38BDF8] font-bold text-sm border border-[#38BDF8]/40 transition-all min-h-[48px]"
              >
                <span>View Longitudinal Profile →</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#0B0F19] font-black text-sm shadow-md transition-all min-h-[48px]"
              >
                <FileDown className="w-4 h-4" />
                <span>Save & Print Clinical Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {activeScan && (
        <ImageLightboxModal
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          originalUrl={activeScan.images.original}
          vesselUrl={activeScan.images.vessels}
          heatmapUrl={activeScan.images.heatmap}
          title="Multimodal Retinal Fundus Inspection"
          patientName={activePatient?.name || activeScan.patient_name}
          stageName={activeScan.detection.stage_name}
        />
      )}
    </div>
  );
};

import { DRStage, DR_STAGES, ScanAnalysis } from '../types';

// Helper to generate SVG fundus data URIs with realistic retinal features
export function createFundusDataUrl(stage: DRStage, type: 'original' | 'vessels' | 'heatmap'): string {
  const size = 500;
  
  if (type === 'vessels') {
    // White / cyan vessel tree on black background
    const density = stage === 0 ? 'high (18.4%)' : stage === 1 ? 'normal (16.8%)' : stage === 2 ? 'moderate attenuation (14.2%)' : stage === 3 ? 'severe narrowing (10.9%)' : 'neovascular tortuosity (8.5% capillary loss)';
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="%23050811"/>
      <circle cx="${size/2}" cy="${size/2}" r="235" fill="%23090e1a" stroke="%231e293b" stroke-width="3"/>
      
      <!-- Optic Disc -->
      <circle cx="160" cy="250" r="38" fill="%231e293b" stroke="%2338bdf8" stroke-width="2" stroke-dasharray="4,4"/>
      
      <!-- Vessel Tree Network -->
      <g stroke="%23e2e8f0" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Superior Temporal Arcade -->
        <path d="M 160 250 Q 190 140 290 100 T 420 80" stroke="%2338bdf8" stroke-width="6"/>
        <path d="M 230 120 Q 280 90 350 70" stroke="%23e2e8f0" stroke-width="3.5"/>
        <path d="M 290 100 Q 320 60 380 50" stroke="%23cbd5e1" stroke-width="2.5"/>
        
        <!-- Inferior Temporal Arcade -->
        <path d="M 160 250 Q 200 360 300 400 T 430 420" stroke="%2338bdf8" stroke-width="6"/>
        <path d="M 240 380 Q 300 420 370 435" stroke="%23e2e8f0" stroke-width="3.5"/>
        <path d="M 300 400 Q 340 440 400 455" stroke="%23cbd5e1" stroke-width="2"/>
        
        <!-- Superior Nasal -->
        <path d="M 160 250 Q 130 150 70 110" stroke="%23e2e8f0" stroke-width="4.5"/>
        <path d="M 110 170 Q 70 145 40 140" stroke="%2394a3b8" stroke-width="2.5"/>
        
        <!-- Inferior Nasal -->
        <path d="M 160 250 Q 120 350 65 390" stroke="%23e2e8f0" stroke-width="4.5"/>
        <path d="M 105 330 Q 60 360 35 370" stroke="%2394a3b8" stroke-width="2.5"/>
        
        <!-- Macular Branches -->
        <path d="M 210 210 Q 270 230 310 245" stroke="%2394a3b8" stroke-width="2"/>
        <path d="M 220 290 Q 280 270 310 255" stroke="%2394a3b8" stroke-width="2"/>
      </g>
      
      <!-- Neovascularization for Stage 4 -->
      ${stage === 4 ? `
        <g stroke="%23c084fc" stroke-width="2" fill="none" opacity="0.85">
          <path d="M 160 250 Q 140 210 130 230 T 150 200" />
          <path d="M 290 100 Q 300 120 320 110 T 330 130" />
          <path d="M 300 400 Q 320 380 340 400 T 360 390" />
          <circle cx="160" cy="250" r="45" fill="none" stroke="%23e879f9" stroke-width="1.5" stroke-dasharray="2,2"/>
        </g>
      ` : ''}
      
      <!-- Avascular Macular Zone -->
      <circle cx="330" cy="250" r="28" fill="none" stroke="%2364748b" stroke-width="1.5" stroke-dasharray="3,3"/>
      
      <text x="20" y="475" fill="%2338bdf8" font-family="monospace" font-size="14" font-weight="bold">VESSEL SEGMENTATION MAP: ${density}</text>
    </svg>`;
  }

  if (type === 'heatmap') {
    // Grad-CAM Activation Heatmap Overlay
    const hotMacula = stage >= 2;
    const hotTemporal = stage >= 1;
    const hotDisc = stage === 4 || stage === 3;
    
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="gradCentral" cx="66%" cy="50%" r="35%">
          <stop offset="0%" stop-color="%23ff0055" stop-opacity="${stage === 0 ? '0.05' : stage === 1 ? '0.35' : stage === 2 ? '0.75' : '0.95'}"/>
          <stop offset="40%" stop-color="%23ffaa00" stop-opacity="${stage === 0 ? '0.03' : '0.6'}"/>
          <stop offset="75%" stop-color="%2300ffaa" stop-opacity="${stage === 0 ? '0.02' : '0.3'}"/>
          <stop offset="100%" stop-color="%230044ff" stop-opacity="0"/>
        </radialGradient>
        
        <radialGradient id="gradArcade" cx="58%" cy="24%" r="30%">
          <stop offset="0%" stop-color="%23ff3300" stop-opacity="${stage >= 2 ? '0.85' : stage === 1 ? '0.4' : '0.05'}"/>
          <stop offset="50%" stop-color="%23ffff00" stop-opacity="${stage >= 1 ? '0.4' : '0.02'}"/>
          <stop offset="100%" stop-color="%230000ff" stop-opacity="0"/>
        </radialGradient>

        <radialGradient id="gradDisc" cx="32%" cy="50%" r="20%">
          <stop offset="0%" stop-color="%239900ff" stop-opacity="${hotDisc ? '0.8' : '0.1'}"/>
          <stop offset="60%" stop-color="%2300ccff" stop-opacity="${hotDisc ? '0.4' : '0.05'}"/>
          <stop offset="100%" stop-color="%23000000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      
      <rect width="${size}" height="${size}" fill="%230B0F19"/>
      <circle cx="${size/2}" cy="${size/2}" r="235" fill="%231a0b05" stroke="%23334155" stroke-width="2"/>
      
      <!-- Base Retinal Background Dimmed -->
      <circle cx="160" cy="250" r="38" fill="%23ffccaa" opacity="0.25"/>
      <circle cx="330" cy="250" r="28" fill="%23441100" opacity="0.4"/>
      
      <!-- Grad-CAM Activation Layers -->
      <circle cx="${size/2}" cy="${size/2}" r="235" fill="url(%23gradCentral)"/>
      ${hotTemporal ? `<circle cx="${size/2}" cy="${size/2}" r="235" fill="url(%23gradArcade)"/>` : ''}
      ${hotDisc ? `<circle cx="${size/2}" cy="${size/2}" r="235" fill="url(%23gradDisc)"/>` : ''}
      
      <!-- AI Activation Contour rings -->
      ${stage >= 1 ? `
        <ellipse cx="330" cy="250" rx="${40 + stage * 20}" ry="${30 + stage * 15}" fill="none" stroke="%23ff0055" stroke-width="2" stroke-dasharray="6,4" opacity="0.8"/>
        <text x="330" y="220" fill="%23ffffff" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Activation Peak: ${(0.65 + stage * 0.08).toFixed(2)}</text>
      ` : `
        <text x="330" y="255" fill="%232dd4bf" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">No High Activation (Normal)</text>
      `}
      
      <text x="20" y="475" fill="%23f8fafc" font-family="monospace" font-size="14" font-weight="bold">AI GRAD-CAM EXPLAINABILITY HEATMAP</text>
    </svg>`;
  }

  // Original Retinal Fundus Scan
  const retinaColor = stage === 0 ? '%23b4431e' : stage === 1 ? '%23a33917' : stage === 2 ? '%23943013' : stage === 3 ? '%2378240c' : '%235c1a07';
  
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <radialGradient id="retinaShade" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${retinaColor}"/>
        <stop offset="70%" stop-color="%2378240c"/>
        <stop offset="95%" stop-color="%233a0d03"/>
        <stop offset="100%" stop-color="%23050100"/>
      </radialGradient>
      <radialGradient id="opticDiscGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%23fff1c2"/>
        <stop offset="80%" stop-color="%23f9a03f"/>
        <stop offset="100%" stop-color="%23b84318"/>
      </radialGradient>
      <radialGradient id="maculaShade" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%23450a00"/>
        <stop offset="85%" stop-color="%23851b03"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
    </defs>
    
    <rect width="${size}" height="${size}" fill="%23050811"/>
    
    <!-- Retinal Fundus Circle -->
    <circle cx="${size/2}" cy="${size/2}" r="235" fill="url(%23retinaShade)" stroke="%23334155" stroke-width="2"/>
    
    <!-- Optic Disc (Nasal side) -->
    <circle cx="160" cy="250" r="38" fill="url(%23opticDiscGlow)"/>
    <ellipse cx="155" cy="250" rx="16" ry="22" fill="%23ffffff" opacity="0.6"/>
    
    <!-- Macula & Fovea (Temporal side) -->
    <circle cx="330" cy="250" r="32" fill="url(%23maculaShade)"/>
    <circle cx="330" cy="250" r="4" fill="%23220400"/>
    <circle cx="331" cy="249" r="1.5" fill="%23ffffff" opacity="0.75"/> <!-- Foveal light reflex -->
    
    <!-- Retinal Blood Vessels (Arteries & Veins) -->
    <g stroke="%235a0f03" stroke-width="6" fill="none" stroke-linecap="round">
      <!-- Venous arcades (darker, wider) -->
      <path d="M 160 250 Q 185 130 290 95 T 425 75" stroke="%23420800" stroke-width="7"/>
      <path d="M 160 250 Q 195 370 295 405 T 430 425" stroke="%23420800" stroke-width="7"/>
      <path d="M 160 250 Q 120 145 65 105" stroke="%23420800" stroke-width="5"/>
      <path d="M 160 250 Q 115 355 60 395" stroke="%23420800" stroke-width="5"/>
    </g>
    <g stroke="%23a82208" stroke-width="4" fill="none" stroke-linecap="round">
      <!-- Arterial arcades (brighter red, narrower) -->
      <path d="M 160 250 Q 195 145 295 105 T 430 85" stroke="%23b8270b" stroke-width="4.5"/>
      <path d="M 160 250 Q 205 355 305 395 T 435 415" stroke="%23b8270b" stroke-width="4.5"/>
      <path d="M 160 250 Q 125 160 75 120" stroke="%23b8270b" stroke-width="3.5"/>
      <path d="M 160 250 Q 120 340 70 380" stroke="%23b8270b" stroke-width="3.5"/>
      
      <!-- Macular capillaries -->
      <path d="M 215 210 Q 275 230 310 240" stroke="%239e2208" stroke-width="2"/>
      <path d="M 225 290 Q 285 270 310 260" stroke="%239e2208" stroke-width="2"/>
    </g>
    
    <!-- PATHOLOGY LESIONS BY STAGE -->
    ${stage >= 1 ? `
      <!-- Microaneurysms (Red dots) -->
      <circle cx="310" cy="210" r="3" fill="%23400500"/>
      <circle cx="280" cy="270" r="3.5" fill="%23400500"/>
      <circle cx="360" cy="235" r="2.5" fill="%23400500"/>
      <circle cx="295" cy="180" r="3" fill="%23400500"/>
    ` : ''}

    ${stage >= 2 ? `
      <!-- Dot & Blot Hemorrhages -->
      <ellipse cx="270" cy="230" rx="8" ry="6" fill="%233a0400"/>
      <ellipse cx="360" cy="280" rx="7" ry="5" fill="%233a0400"/>
      <circle cx="340" cy="190" r="6" fill="%233a0400"/>
      
      <!-- Hard Exudates (Yellow waxy deposits) -->
      <g fill="%23fff59d" stroke="%23fbc02d" stroke-width="0.5">
        <circle cx="350" cy="260" r="3"/>
        <circle cx="356" cy="263" r="2.5"/>
        <circle cx="352" cy="268" r="3.5"/>
        <circle cx="362" cy="265" r="2"/>
        <circle cx="320" cy="290" r="2.5"/>
      </g>
      
      <!-- Cotton Wool Spots (Soft exudates / nerve fiber infarcts) -->
      <ellipse cx="250" cy="160" rx="12" ry="8" fill="%23ffffff" opacity="0.65"/>
    ` : ''}

    ${stage >= 3 ? `
      <!-- Severe NPDR: Extensive flame hemorrhages & venous beading -->
      <path d="M 280 100 Q 285 105 295 102 T 310 106" stroke="%23280200" stroke-width="12" fill="none"/>
      <ellipse cx="380" cy="330" rx="16" ry="10" fill="%232b0300"/>
      <ellipse cx="210" cy="330" rx="14" ry="9" fill="%232b0300"/>
      <ellipse cx="230" cy="120" rx="18" ry="11" fill="%23ffffff" opacity="0.75"/>
      <ellipse cx="380" cy="200" rx="15" ry="9" fill="%23ffffff" opacity="0.7"/>
    ` : ''}

    ${stage === 4 ? `
      <!-- Proliferative DR: Neovascularization (NVD / NVE) & Vitreous haze -->
      <g stroke="%23e11d48" stroke-width="2" fill="none">
        <path d="M 160 250 C 140 220 180 200 165 180 C 150 160 170 140 160 250"/>
        <path d="M 290 95 C 310 80 325 110 340 90"/>
        <path d="M 295 405 C 320 420 335 390 350 410"/>
      </g>
      <!-- Pre-retinal / Vitreous Hemorrhage boat-shaped pooling -->
      <path d="M 240 330 C 290 330 350 340 370 370 C 350 400 260 400 240 370 Z" fill="%23240200" opacity="0.95"/>
    ` : ''}

    <text x="20" y="475" fill="%23cbd5e1" font-family="sans-serif" font-size="13" font-weight="bold">FUNDUS PHOTOGRAPH — ${DR_STAGES[stage].name.toUpperCase()}</text>
  </svg>`;
}

export interface PresetFundusCase {
  id: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  diabetesDuration: number;
  sugarLevel: number;
  hba1c: number;
  stage: DRStage;
  confidence: number;
  clinicalNote: string;
  originalImage: string;
  vesselImage: string;
  heatmapImage: string;
}

export const PRESET_FUNDUS_CASES: PresetFundusCase[] = [
  {
    id: 'case-0',
    patientName: 'Ananya Sharma',
    age: 44,
    gender: 'Female',
    diabetesDuration: 3,
    sugarLevel: 118,
    hba1c: 6.2,
    stage: 0,
    confidence: 97.8,
    clinicalNote: 'Clear optic disc margin, healthy avascular foveal zone, no microaneurysms detected.',
    originalImage: createFundusDataUrl(0, 'original'),
    vesselImage: createFundusDataUrl(0, 'vessels'),
    heatmapImage: createFundusDataUrl(0, 'heatmap'),
  },
  {
    id: 'case-1',
    patientName: 'Rajesh Kumar',
    age: 56,
    gender: 'Male',
    diabetesDuration: 7,
    sugarLevel: 146,
    hba1c: 7.1,
    stage: 1,
    confidence: 92.4,
    clinicalNote: 'Isolated microaneurysms in paramacular quadrant. Early NPDR detected.',
    originalImage: createFundusDataUrl(1, 'original'),
    vesselImage: createFundusDataUrl(1, 'vessels'),
    heatmapImage: createFundusDataUrl(1, 'heatmap'),
  },
  {
    id: 'case-2',
    patientName: 'Meenakshi Patel',
    age: 62,
    gender: 'Female',
    diabetesDuration: 12,
    sugarLevel: 182,
    hba1c: 8.4,
    stage: 2,
    confidence: 89.6,
    clinicalNote: 'Multiple blot hemorrhages, hard exudate clusters near macula, 1 cotton wool spot.',
    originalImage: createFundusDataUrl(2, 'original'),
    vesselImage: createFundusDataUrl(2, 'vessels'),
    heatmapImage: createFundusDataUrl(2, 'heatmap'),
  },
  {
    id: 'case-3',
    patientName: 'Vikramjit Singh',
    age: 68,
    gender: 'Male',
    diabetesDuration: 16,
    sugarLevel: 215,
    hba1c: 9.6,
    stage: 3,
    confidence: 94.2,
    clinicalNote: 'Extensive 4-quadrant retinal hemorrhages, venous beading, severe macular threat.',
    originalImage: createFundusDataUrl(3, 'original'),
    vesselImage: createFundusDataUrl(3, 'vessels'),
    heatmapImage: createFundusDataUrl(3, 'heatmap'),
  },
  {
    id: 'case-4',
    patientName: 'Kishore Dave',
    age: 71,
    gender: 'Male',
    diabetesDuration: 22,
    sugarLevel: 248,
    hba1c: 10.8,
    stage: 4,
    confidence: 98.1,
    clinicalNote: 'Neovascularization at optic disc (NVD), pre-retinal hemorrhage, imminent vision loss risk.',
    originalImage: createFundusDataUrl(4, 'original'),
    vesselImage: createFundusDataUrl(4, 'vessels'),
    heatmapImage: createFundusDataUrl(4, 'heatmap'),
  },
];

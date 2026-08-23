/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { MedicalDataProvider, useMedicalData } from './context/MedicalDataContext';
import { AccessibilityToolbar } from './components/AccessibilityToolbar';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { NewScanView } from './components/NewScanView';
import { BatchScreeningView } from './components/BatchScreeningView';
import { PatientDirectoryView } from './components/PatientDirectoryView';
import { PatientDetailView } from './components/PatientDetailView';
import { LandingPageView } from './components/LandingPageView';

const MainContent: React.FC = () => {
  const { activeView } = useMedicalData();

  if (activeView === 'landing') {
    return <LandingPageView />;
  }

  return (
    <main
      className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-12"
      id="main-content"
      role="main"
      aria-label="Clinical AI Workspace"
    >
      {activeView === 'dashboard' && <DashboardView />}
      {activeView === 'new-scan' && <NewScanView />}
      {activeView === 'batch-screening' && <BatchScreeningView />}
      {activeView === 'patients' && <PatientDirectoryView />}
      {activeView === 'patient-detail' && <PatientDetailView />}
    </main>
  );
};

export default function App() {
  return (
    <AccessibilityProvider>
      <MedicalDataProvider>
        <AppBody />
      </MedicalDataProvider>
    </AccessibilityProvider>
  );
}

const AppBody: React.FC = () => {
  const { activeView } = useMedicalData();

  if (activeView === 'landing') {
    return (
      <div className="min-h-screen bg-[#619FE8] text-white transition-colors duration-150 font-sans selection:bg-[#E1FA4A] selection:text-black">
        <LandingPageView />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#619FE8] text-white transition-colors duration-150 flex flex-col font-sans selection:bg-[#E1FA4A] selection:text-black relative">
      {/* Skip link for screen-readers and keyboard navigators */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-[#E1FA4A] focus:text-black focus:font-black focus:rounded-xl focus:shadow-2xl"
      >
        Skip to primary clinical workspace
      </a>

      {/* Top Accessibility & Action Toolbar */}
      <AccessibilityToolbar />

      {/* Body Container with Sidebar + Content */}
      <div className="flex-1 flex flex-row relative">
        <Navigation />
        <MainContent />
      </div>
    </div>
  );
};

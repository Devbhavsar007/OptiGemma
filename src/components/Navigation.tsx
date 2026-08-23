import React from 'react';
import { LayoutDashboard, Microscope, Layers, Users, UserCircle2 } from 'lucide-react';
import { useMedicalData } from '../context/MedicalDataContext';
import { ActiveView } from '../types';

interface NavItem {
  id: ActiveView;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
}

export const Navigation: React.FC = () => {
  const { activeView, setActiveView, batchQueue } = useMedicalData();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Clinical Dashboard',
      shortLabel: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      description: 'Screening metrics & risk distribution',
    },
    {
      id: 'new-scan',
      label: 'New Retinal Scan',
      shortLabel: 'New Scan',
      icon: <Microscope className="w-5 h-5" />,
      description: 'AI fundus analysis & Grad-CAM',
    },
    {
      id: 'batch-screening',
      label: 'Batch Screening',
      shortLabel: 'Batch Queue',
      icon: <Layers className="w-5 h-5" />,
      description: 'Mobile eye camp queue management',
    },
    {
      id: 'patients',
      label: 'Patient Directory',
      shortLabel: 'Patients',
      icon: <Users className="w-5 h-5" />,
      description: 'Longitudinal records & HbA1c history',
    },
  ];

  return (
    <>
      {/* Desktop Left Sidebar (240px wide) */}
      <aside
        className="hidden md:flex flex-col w-64 shrink-0 bg-white/15 backdrop-blur-2xl border-r border-white/30 min-h-[calc(100vh-72px)] p-4 gap-2 select-none text-white shadow-[4px_0_24px_rgba(0,0,0,0.04)]"
        aria-label="Main Navigation Menu"
      >
        <div className="space-y-2">
          {navItems.map((item) => {
            const isActive = activeView === item.id || (item.id === 'patients' && activeView === 'patient-detail');
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center w-full gap-3.5 p-3.5 rounded-2xl font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#1E54B7] shadow-[0_8px_20px_rgba(0,0,0,0.12)] scale-[1.02] font-black'
                    : 'text-white/85 hover:bg-white/20 hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={isActive ? 'text-[#1E54B7]' : 'text-white/90'}>
                  {item.icon}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black tracking-tight truncate block">{item.shortLabel}</span>
                    {item.id === 'batch-screening' && batchQueue.length > 0 && (
                      <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-mono font-black ${
                        isActive ? 'bg-[#E1FA4A] text-black shadow-sm' : 'bg-[#E1FA4A] text-black shadow-sm'
                      }`}>
                        {batchQueue.length}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Clinical Accreditation / Clinic Mode Footer Box in Sidebar */}
        <div className="mt-auto space-y-2.5">
          <button
            onClick={() => setActiveView('landing')}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/40 text-xs font-black text-white shadow-sm transition-all cursor-pointer"
          >
            <span>Landing Page</span>
            <span className="text-[#E1FA4A]">Overview ↗</span>
          </button>

          <div className="p-4 bg-white/90 backdrop-blur-md text-black border border-white rounded-2xl space-y-1.5 shadow-lg">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
              Active Camp / Clinic
            </p>
            <p className="text-xs font-black text-gray-900 leading-snug">
              General Hospital - Mumbai
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-[10px] font-mono font-bold text-gray-600">
              <span>Gemma-4 AI</span>
              <span className="text-[#1E54B7] font-black">WCAG AAA</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile & Tablet Bottom Sticky Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#619FE8]/95 backdrop-blur-2xl border-t border-white/30 px-3 py-2 flex items-center justify-around shadow-2xl"
        role="navigation"
        aria-label="Mobile Navigation"
      >
        {navItems.map((item) => {
          const isActive = activeView === item.id || (item.id === 'patients' && activeView === 'patient-detail');
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`relative flex flex-col items-center justify-center min-w-[70px] min-h-[50px] py-1 px-2.5 rounded-2xl transition-all ${
                isActive
                  ? 'text-[#1E54B7] bg-white font-black shadow-lg scale-105'
                  : 'text-white/80 hover:text-white'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                {item.icon}
                {item.id === 'batch-screening' && batchQueue.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-[#E1FA4A] text-black text-[9px] font-mono font-black flex items-center justify-center shadow-sm">
                    {batchQueue.length}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 font-bold tracking-tight whitespace-nowrap">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

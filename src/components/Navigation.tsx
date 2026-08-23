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
        className="hidden md:flex flex-col w-60 shrink-0 bg-[#131B2E] border-r-2 border-[#334155] min-h-[calc(100vh-72px)] p-4 gap-2 select-none"
        aria-label="Main Navigation Menu"
      >
        <div className="space-y-2">
          {navItems.map((item) => {
            const isActive = activeView === item.id || (item.id === 'patients' && activeView === 'patient-detail');
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center w-full gap-4 p-4 rounded-xl font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#38BDF8] text-[#0B0F19] shadow-xl'
                    : 'text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={isActive ? 'text-[#0B0F19]' : 'text-[#CBD5E1]'}>
                  {item.icon}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate block">{item.shortLabel}</span>
                    {item.id === 'batch-screening' && batchQueue.length > 0 && (
                      <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                        isActive ? 'bg-[#0B0F19] text-[#38BDF8]' : 'bg-sky-500/20 text-[#38BDF8]'
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
        <div className="mt-auto space-y-2">
          <button
            onClick={() => setActiveView('landing')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] border-2 border-[#334155] text-xs font-bold text-[#CBD5E1] hover:text-white transition-all cursor-pointer"
          >
            <span>Landing Page</span>
            <span className="text-[#38BDF8]">Overview ↗</span>
          </button>

          <div className="p-4 bg-[#0F172A] border-2 border-[#334155] rounded-xl space-y-1.5">
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
              Clinic Mode
            </p>
            <p className="text-sm font-bold text-[#F8FAFC]">
              General Hospital - Mumbai
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-[#1E293B] text-[10px] font-mono text-[#64748B]">
              <span>OptiGemma v2.4</span>
              <span className="text-[#38BDF8] font-bold">WCAG AAA</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile & Tablet Bottom Sticky Navigation Bar (Min height 64px, large 48px+ touch targets) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F19]/95 backdrop-blur-lg border-t-2 border-[#334155] px-2 py-1.5 flex items-center justify-around shadow-2xl"
        role="navigation"
        aria-label="Mobile Navigation"
      >
        {navItems.map((item) => {
          const isActive = activeView === item.id || (item.id === 'patients' && activeView === 'patient-detail');
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`relative flex flex-col items-center justify-center min-w-[70px] min-h-[54px] py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-[#38BDF8] bg-[#1E293B] font-bold border border-[#38BDF8]/40'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                {item.icon}
                {item.id === 'batch-screening' && batchQueue.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-[#38BDF8] text-[#0B0F19] text-[9px] font-mono font-bold flex items-center justify-center">
                    {batchQueue.length}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 font-semibold tracking-tight whitespace-nowrap">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

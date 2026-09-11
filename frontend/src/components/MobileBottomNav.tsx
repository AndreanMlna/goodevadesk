import React from 'react';
import {
  Ticket as TicketIcon,
  BarChart3,
  Sparkles,
  BookOpen,
  Settings,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'desk' | 'analytics' | 'shelf';
  setActiveTab: (tab: 'desk' | 'analytics' | 'shelf') => void;
  openTicketCount: number;
  onOpenSettings: () => void;
  onQuickAiTriage?: () => void;
  theme?: 'dark' | 'light';
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  openTicketCount,
  onOpenSettings,
  onQuickAiTriage,
  theme = 'dark',
}) => {
  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 ${
        theme === 'light'
          ? 'bg-white/95 border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] text-slate-700'
          : 'bg-[#0d1322]/95 border-t border-slate-800/90 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] text-slate-300'
      } backdrop-blur-xl transition-colors duration-200 select-none pb-[env(safe-area-inset-bottom,0px)]`}
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
        {/* Tab 1: Tickets */}
        <button
          type="button"
          onClick={() => setActiveTab('desk')}
          className={`flex flex-col items-center justify-center min-w-[56px] h-12 gap-1 rounded-xl transition-all ${
            activeTab === 'desk'
              ? theme === 'light'
                ? 'text-blue-600 font-bold scale-105'
                : 'text-blue-400 font-bold scale-105'
              : theme === 'light'
              ? 'text-slate-500 hover:text-slate-900'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Tickets Tab"
        >
          <div className="relative flex items-center justify-center">
            <TicketIcon className="w-5 h-5" />
            {openTicketCount > 0 && (
              <span className="absolute -top-1.5 -right-3 px-1.5 min-w-[16px] h-4 rounded-full bg-blue-600 text-white font-mono text-[9px] flex items-center justify-center font-extrabold shadow-sm">
                {openTicketCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight leading-none">Tickets</span>
        </button>

        {/* Tab 2: Analytics */}
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center justify-center min-w-[56px] h-12 gap-1 rounded-xl transition-all ${
            activeTab === 'analytics'
              ? theme === 'light'
                ? 'text-blue-600 font-bold scale-105'
                : 'text-blue-400 font-bold scale-105'
              : theme === 'light'
              ? 'text-slate-500 hover:text-slate-900'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Analytics Tab"
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] tracking-tight leading-none">Analytics</span>
        </button>

        {/* Tab 3: AI Triage (Action Highlighted) */}
        <button
          type="button"
          onClick={() => {
            if (onQuickAiTriage) {
              onQuickAiTriage();
            } else {
              setActiveTab('desk');
            }
          }}
          className="flex flex-col items-center justify-center min-w-[56px] h-12 gap-1 rounded-xl transition-all group"
          aria-label="AI Triage"
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/25 group-hover:scale-110 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight leading-none font-semibold text-purple-400">AI Triage</span>
        </button>

        {/* Tab 4: 3D Shelf / SOPs */}
        <button
          type="button"
          onClick={() => setActiveTab('shelf')}
          className={`flex flex-col items-center justify-center min-w-[56px] h-12 gap-1 rounded-xl transition-all ${
            activeTab === 'shelf'
              ? theme === 'light'
                ? 'text-blue-600 font-bold scale-105'
                : 'text-blue-400 font-bold scale-105'
              : theme === 'light'
              ? 'text-slate-500 hover:text-slate-900'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="SOPs and 3D Shelf Tab"
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] tracking-tight leading-none">SOP Shelf</span>
        </button>

        {/* Tab 5: Settings */}
        <button
          type="button"
          onClick={onOpenSettings}
          className={`flex flex-col items-center justify-center min-w-[56px] h-12 gap-1 rounded-xl transition-all ${
            theme === 'light'
              ? 'text-slate-500 hover:text-slate-900'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] tracking-tight leading-none">Settings</span>
        </button>
      </div>
    </nav>
  );
};

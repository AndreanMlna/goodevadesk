import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Layers,
  ShieldCheck,
  Cpu,
  Info,
  RotateCw,
  Palette,
} from 'lucide-react';
import { CompleteShelfLandingPage } from './CompleteShelfLandingPage';

export const KnowledgeShelfView: React.FC = () => {
  const [accentColor, setAccentColor] = useState('#c87046');

  const sopHighlights = [
    { roman: 'I', title: 'RAG SOPs', tag: 'Grounding' },
    { roman: 'II', title: 'Smart Triage', tag: 'SLA' },
    { roman: 'III', title: 'Multi-Tenancy', tag: 'Isolation' },
    { roman: 'IV', title: 'Gemini AI', tag: 'LLM' },
    { roman: 'V', title: 'Redis Cache', tag: 'Memory' },
    { roman: 'VI', title: 'HITL & RLHF', tag: 'Supervision' },
    { roman: 'VII', title: 'Python NLP', tag: 'Linguistics' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-[#111827]/80 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                GoodevaDesk 3D Knowledge & Policy Shelf
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
                Spatial Three.js r165
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Interactive 3D representation of GoodevaDesk&apos;s authoritative operational volumes. 
              These authoritative documents directly power the RAG Grounding pipeline and LLM automated triage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#090d16]/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-white">7</span> Working Volumes
            </div>
            <div className="flex items-center gap-2 bg-[#090d16]/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>WebGl / GPU 60 FPS</span>
            </div>
            <div className="flex items-center gap-2 bg-[#090d16]/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>RAG Grounded</span>
            </div>
          </div>
        </div>

        {/* SOP Quick Badges */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              7 Operational Volumes:
            </span>
            {sopHighlights.map((sop) => (
              <div
                key={sop.roman}
                className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 flex items-center gap-2"
              >
                <span className="font-mono font-bold text-purple-400 text-[11px]">Vol {sop.roman}</span>
                <span className="text-slate-400 text-[11px]">•</span>
                <span className="text-slate-200 font-semibold text-[11px]">{sop.title}</span>
                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                  {sop.tag}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-xs">Theme Accent:</span>
            <button
              type="button"
              onClick={() => setAccentColor('#c87046')}
              className={`w-4 h-4 rounded-full bg-[#c87046] transition-transform ${accentColor === '#c87046' ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
              title="Classic Terracotta (#c87046)"
            />
            <button
              type="button"
              onClick={() => setAccentColor('#8b5cf6')}
              className={`w-4 h-4 rounded-full bg-[#8b5cf6] transition-transform ${accentColor === '#8b5cf6' ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
              title="Goodeva Purple (#8b5cf6)"
            />
            <button
              type="button"
              onClick={() => setAccentColor('#06b6d4')}
              className={`w-4 h-4 rounded-full bg-[#06b6d4] transition-transform ${accentColor === '#06b6d4' ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
              title="Cyber Cyan (#06b6d4)"
            />
          </div>
        </div>
      </div>

      {/* 3D Canvas Showcase */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-[#080808]">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-slate-300 pointer-events-none">
          <RotateCw className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
          <span>Interactive 3D Scene • Click books to inspect • Drag to rotate camera</span>
        </div>

        <div className="w-full h-[740px]">
          <CompleteShelfLandingPage
            headingFont="iowan-old-style"
            bodyFont="inter"
            headingWeight="400"
            bodyWeight="400"
            primaryColor={accentColor}
            headingSize={60}
            bodySize={12}
            headingLetterSpacing={-0.055}
            className="w-full h-full"
          />
        </div>

        <div className="p-3 bg-[#0d121f] border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-400" />
            <span>Authored Three.js r165 environment with real-time dynamic lighting, shaders, and physics-based volume pull interaction.</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">Canonical SHA-256: 606f200fed86</span>
        </div>
      </div>
    </div>
  );
};

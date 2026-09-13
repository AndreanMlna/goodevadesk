import React from 'react';
import { Cpu, RefreshCw } from 'lucide-react';
import { NlpAnalysisResult } from '../../types';

interface TicketNlpCardProps {
  nlpAnalysis: NlpAnalysisResult | null;
  loadingNlp: boolean;
}

export const TicketNlpCard: React.FC<TicketNlpCardProps> = ({ nlpAnalysis, loadingNlp }) => {
  if (loadingNlp) {
    return (
      <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between text-xs text-cyan-300 animate-pulse">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Analyzing ticket entities & sentiment with Python NLP microservice...</span>
        </div>
        <span className="text-[10px] text-cyan-400/70 font-mono">Python Microservice</span>
      </div>
    );
  }

  if (!nlpAnalysis) return null;

  return (
    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 dark:bg-slate-900/70 dark:border-slate-800 space-y-3 shadow-xs dark:shadow-inner">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-cyan-800 dark:text-cyan-400 flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Python NLP Microservice Analysis
        </span>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 uppercase dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/50">
            Category: {nlpAnalysis.predicted_category} ({Math.round(nlpAnalysis.confidence * 100)}%)
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase ${
              nlpAnalysis.urgency === 'high'
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/40'
                : nlpAnalysis.urgency === 'medium'
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/40'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            Urgency: {nlpAnalysis.urgency}
          </span>
        </div>
      </div>

      <div className="text-xs text-slate-700 dark:text-slate-300 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs dark:bg-black/40 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold tracking-wider uppercase">
            EXTRACTED EMAILS
          </span>
          <span
            className={
              nlpAnalysis.entities.emails?.length > 0
                ? 'text-sky-700 dark:text-cyan-300 font-mono font-semibold text-[11px] break-all'
                : 'text-slate-400 dark:text-slate-500 italic text-[11px]'
            }
          >
            {nlpAnalysis.entities.emails?.length > 0
              ? nlpAnalysis.entities.emails.join(', ')
              : 'None detected'}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs dark:bg-black/40 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold tracking-wider uppercase">
            ORDER / INVOICE IDS
          </span>
          <span
            className={
              nlpAnalysis.entities.invoice_or_order_ids?.length > 0
                ? 'text-purple-700 dark:text-purple-300 font-mono font-semibold text-[11px]'
                : 'text-slate-400 dark:text-slate-500 italic text-[11px]'
            }
          >
            {nlpAnalysis.entities.invoice_or_order_ids?.length > 0
              ? nlpAnalysis.entities.invoice_or_order_ids.join(', ')
              : 'None detected'}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs dark:bg-black/40 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold tracking-wider uppercase">
            PHONE NUMBERS
          </span>
          <span
            className={
              nlpAnalysis.entities.phone_numbers?.length > 0
                ? 'text-emerald-700 dark:text-emerald-300 font-mono font-semibold text-[11px]'
                : 'text-slate-400 dark:text-slate-500 italic text-[11px]'
            }
          >
            {nlpAnalysis.entities.phone_numbers?.length > 0
              ? nlpAnalysis.entities.phone_numbers.join(', ')
              : 'None detected'}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs dark:bg-black/40 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold tracking-wider uppercase">
            SYSTEM ERROR CODES
          </span>
          <span
            className={
              nlpAnalysis.entities.error_codes?.length > 0
                ? 'text-rose-700 dark:text-rose-300 font-mono font-bold text-[11px]'
                : 'text-slate-400 dark:text-slate-500 italic text-[11px]'
            }
          >
            {nlpAnalysis.entities.error_codes?.length > 0
              ? nlpAnalysis.entities.error_codes.join(', ')
              : 'None detected'}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs dark:bg-black/40 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold tracking-wider uppercase">
            MONETARY AMOUNTS
          </span>
          <span
            className={
              nlpAnalysis.entities.monetary_amounts?.length > 0
                ? 'text-amber-700 dark:text-amber-300 font-mono font-semibold text-[11px]'
                : 'text-slate-400 dark:text-slate-500 italic text-[11px]'
            }
          >
            {nlpAnalysis.entities.monetary_amounts?.length > 0
              ? nlpAnalysis.entities.monetary_amounts.join(', ')
              : 'None detected'}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-xs dark:bg-black/40 dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-bold tracking-wider uppercase">
            SENTIMENT POLARITY
          </span>
          <span className="text-slate-800 dark:text-slate-300 font-semibold text-[11px] capitalize">
            {nlpAnalysis.sentiment_hint || 'neutral'}
          </span>
        </div>
      </div>

      {nlpAnalysis.summary && (
        <div className="text-[11px] text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs dark:text-slate-400 dark:bg-slate-950/40 dark:border-slate-800/60 flex items-center justify-between">
          <span>
            <strong className="text-slate-800 dark:text-slate-300 font-semibold">
              Pipeline Summary:
            </strong>{' '}
            {nlpAnalysis.summary}
          </span>
          <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono">
            Python Microservice
          </span>
        </div>
      )}
    </div>
  );
};

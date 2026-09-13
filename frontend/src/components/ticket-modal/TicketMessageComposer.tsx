import React from 'react';
import { CornerDownRight, Lock, Zap, Send } from 'lucide-react';

interface TicketMessageComposerProps {
  composerContent: string;
  setComposerContent: (val: string) => void;
  composerType: 'agent' | 'internal_note';
  setComposerType: (type: 'agent' | 'internal_note') => void;
  isSendingMessage: boolean;
  onSendMessage: (e?: React.FormEvent) => void;
  isStreaming: boolean;
  streamedText: string;
  streamMeta: {
    ragDoc?: string;
    cached?: boolean;
    piiMasked?: boolean;
  } | null;
  onStartStream: () => void;
  onStopStream: () => void;
  onInsertStreamToComposer: () => void;
}

export const TicketMessageComposer: React.FC<TicketMessageComposerProps> = ({
  composerContent,
  setComposerContent,
  composerType,
  setComposerType,
  isSendingMessage,
  onSendMessage,
  isStreaming,
  streamedText,
  streamMeta,
  onStartStream,
  onStopStream,
  onInsertStreamToComposer,
}) => {
  return (
    <form
      onSubmit={onSendMessage}
      className="p-3 sm:p-4 bg-white dark:bg-[#090d18] border-t border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setComposerType('agent')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              composerType === 'agent'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <CornerDownRight className="w-3 h-3" />
            <span>Public Reply</span>
          </button>
          <button
            type="button"
            onClick={() => setComposerType('internal_note')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              composerType === 'internal_note'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Lock
              className={`w-3 h-3 ${
                composerType === 'internal_note' ? 'text-white' : 'text-amber-600 dark:text-amber-300'
              }`}
            />
            <span>Internal Whisper</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onStartStream}
            disabled={isStreaming}
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 dark:bg-gradient-to-r dark:from-cyan-600/30 dark:to-blue-600/30 dark:border-cyan-500/40 dark:text-cyan-200 dark:hover:from-cyan-600/50 dark:hover:to-blue-600/50 transition font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
            title="Stream real-time AI reply draft with PII protection"
          >
            <Zap
              className={`w-3 h-3 text-cyan-600 dark:text-cyan-400 ${
                isStreaming ? 'animate-bounce' : ''
              }`}
            />
            <span>{isStreaming ? 'Streaming...' : 'Stream AI Copilot'}</span>
          </button>
          <span className="text-[10px] text-slate-500 hidden md:inline-flex items-center gap-1">
            {composerType === 'internal_note' ? (
              <>
                <Lock className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400 shrink-0" />
                <span>Staff only</span>
              </>
            ) : (
              <>
                <Send className="w-2.5 h-2.5 text-blue-500 dark:text-blue-400 shrink-0" />
                <span>Sends to email</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Compact Copilot Streaming Preview Banner */}
      {(isStreaming || (streamedText && composerContent !== streamedText)) && (
        <div className="p-2.5 rounded-xl border border-cyan-200 bg-cyan-50/70 dark:border-cyan-500/30 dark:bg-cyan-950/20 text-xs space-y-1 animate-fadeIn">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300 font-semibold">
              <Zap
                className={`w-3 h-3 text-cyan-600 dark:text-cyan-400 ${
                  isStreaming ? 'animate-spin' : ''
                }`}
              />
              <span>{isStreaming ? 'AI Streaming (SSE)...' : 'AI Copilot Draft'}</span>
              {streamMeta?.cached && (
                <span className="px-1.5 py-0.2 rounded bg-cyan-100 text-[9px] text-cyan-800 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40">
                  Cache Hit
                </span>
              )}
              {streamMeta?.piiMasked && (
                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-[9px] text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40">
                  PII Masked
                </span>
              )}
            </div>
            <div>
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopStream}
                  className="px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-500/20 dark:hover:bg-rose-500/40 dark:text-rose-300 text-[10px] border border-rose-200 dark:border-rose-500/30 cursor-pointer"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onInsertStreamToComposer}
                  className="px-2.5 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-semibold cursor-pointer shadow-xs"
                >
                  Insert into Composer
                </button>
              )}
            </div>
          </div>
          <p className="text-slate-800 dark:text-slate-300 font-mono text-[11px] max-h-14 overflow-y-auto leading-relaxed">
            {streamedText}
            {isStreaming && (
              <span className="inline-block w-1 h-3 bg-cyan-500 dark:bg-cyan-400 animate-pulse ml-0.5 align-middle" />
            )}
          </p>
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={composerContent}
          onChange={(e) => setComposerContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          placeholder={
            composerType === 'internal_note'
              ? 'Add private technical notes, escalation notes, or staff observations...'
              : 'Type a multi-turn reply to the customer (Press Ctrl+Enter to send)...'
          }
          rows={2}
          className={`w-full bg-slate-50 border rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none transition resize-none dark:bg-[#0d1424] dark:text-slate-100 dark:placeholder-slate-500 ${
            composerType === 'internal_note'
              ? 'border-amber-200 focus:border-amber-500 dark:border-amber-500/30'
              : 'border-slate-200 focus:border-indigo-500 dark:border-indigo-500/30'
          }`}
        />

        <button
          type="submit"
          disabled={isSendingMessage || !composerContent.trim()}
          className={`px-3.5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0 disabled:opacity-40 cursor-pointer ${
            composerType === 'internal_note'
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {isSendingMessage ? 'Sending...' : composerType === 'internal_note' ? 'Save Whisper' : 'Send'}
          </span>
        </button>
      </div>
    </form>
  );
};

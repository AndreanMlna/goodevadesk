import React from 'react';
import { Lock } from 'lucide-react';
import { TicketMessage } from '../../types';

interface TicketMessageTimelineProps {
  messages: TicketMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const TicketMessageTimeline: React.FC<TicketMessageTimelineProps> = ({
  messages,
  messagesEndRef,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
      {messages.map((msg) => {
        const isInternalNote = msg.sender_type === 'internal_note';
        const isCustomer = msg.sender_type === 'customer';

        if (isInternalNote) {
          return (
            <div key={msg.id} className="w-full flex flex-col items-center my-1.5 animate-fadeIn">
              <div className="w-full max-w-2xl bg-amber-950/20 border border-amber-500/35 rounded-xl p-3 text-xs text-amber-100 shadow-sm">
                <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold mb-1 pb-1 border-b border-amber-500/20">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3" />
                    <span className="uppercase tracking-wider text-[10px] font-bold">Team Whisper</span>
                    <span className="text-amber-300/80 font-normal">({msg.sender_name})</span>
                  </div>
                  <span className="text-[10px] text-amber-400/80 font-mono">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-amber-100/90 leading-relaxed font-sans">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${
              isCustomer ? 'items-start' : 'items-end ml-auto'
            } max-w-[85%] sm:max-w-[78%] animate-fadeIn`}
          >
            {/* Message Header Info */}
            <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
              <span className={`font-semibold ${isCustomer ? 'text-slate-300' : 'text-indigo-300'}`}>
                {msg.sender_name}
              </span>
              <span>•</span>
              <span className="font-mono">
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Message Bubble */}
            <div
              className={`rounded-2xl p-3.5 sm:p-4 text-xs leading-relaxed shadow-xs ${
                isCustomer
                  ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm dark:bg-[#0b1324] dark:border-slate-700/70 dark:text-slate-100'
                  : 'bg-indigo-50 border border-indigo-200/80 text-indigo-950 rounded-tr-sm dark:bg-indigo-950/40 dark:border-indigo-500/40 dark:text-indigo-50'
              }`}
            >
              <p className="whitespace-pre-wrap font-sans">{msg.content}</p>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

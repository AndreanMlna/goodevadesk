import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface TicketPresenceBannerProps {
  collisionAgents: string[];
}

export const TicketPresenceBanner: React.FC<TicketPresenceBannerProps> = ({ collisionAgents }) => {
  if (!collisionAgents || collisionAgents.length === 0) return null;

  return (
    <div className="mx-5 mt-2.5 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-3 text-xs text-amber-200 animate-pulse shrink-0">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong className="text-amber-300">Collision Alert:</strong> {collisionAgents.join(', ')} is
          also viewing this ticket.
        </span>
      </div>
      <span className="text-[10px] font-mono font-bold uppercase bg-amber-500/25 px-2 py-0.5 rounded text-amber-300 border border-amber-500/40 shrink-0">
        Live Presence
      </span>
    </div>
  );
};

import { useState } from "react";
import { LegendsGrid } from "@/components/LegendsGrid";
import type { OranitPlayer } from "@/types/oranit";

interface CollapsibleLegendsProps {
  players: OranitPlayer[];
  highlightPlayerId?: string | null;
}

export function CollapsibleLegends({
  players,
  highlightPlayerId,
}: CollapsibleLegendsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-violet-500/25 bg-oranit-navy/40">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-right transition hover:bg-violet-500/10"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-500/40 bg-violet-600/20 text-violet-200 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▼
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold text-transparent bg-gradient-to-l from-cyan-200 to-violet-300 bg-clip-text">
            הצג אגדות מועדון / חבר היכל התהילה
          </span>
          <span className="mt-1 block text-sm text-slate-400">
            {isOpen ? "לחץ לסגירה" : `טופ ${players.length} אגדות — לחץ להרחבה`}
          </span>
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-violet-500/20 p-2 pt-0 sm:p-4">
            <LegendsGrid
              players={players}
              highlightPlayerId={highlightPlayerId}
              hideHeader
            />
          </div>
        </div>
      </div>
    </section>
  );
}

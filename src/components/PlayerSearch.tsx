import { useEffect, useMemo, useRef, useState } from "react";
import type { OranitPlayer } from "@/types/oranit";
import { normalizeSearchQuery, searchPlayers } from "@/utils/playerSearch";

interface PlayerSearchProps {
  players: OranitPlayer[];
  onSelectPlayer: (player: OranitPlayer) => void;
}

export function PlayerSearch({ players, onSelectPlayer }: PlayerSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(
    () => searchPlayers(players, query),
    [players, query],
  );

  const showDropdown =
    open && normalizeSearchQuery(query).length > 0 && suggestions.length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectPlayer(player: OranitPlayer) {
    setQuery(player.name);
    setOpen(false);
    onSelectPlayer(player);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && suggestions[activeIndex]) {
      e.preventDefault();
      selectPlayer(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-xl">
      <label htmlFor="player-search" className="sr-only">
        חיפוש שחקן
      </label>
      <div className="relative">
        <span
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-violet-400"
          aria-hidden
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </span>
        <input
          ref={inputRef}
          id="player-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="חפש שחקן לפי שם — מסד נתונים היסטורי מלא..."
          autoComplete="off"
          className="w-full rounded-2xl border border-violet-500/40 bg-slate-950/90 py-4 pl-4 pr-12 text-base text-slate-100 shadow-[0_0_24px_rgba(147,51,234,0.15)] outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50 focus:shadow-[0_0_28px_rgba(56,189,248,0.2)]"
        />
      </div>

      {showDropdown && (
        <ul
          role="listbox"
          className="absolute z-40 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-violet-500/30 bg-slate-950/95 py-2 shadow-glow backdrop-blur-md"
        >
          {suggestions.map((player, index) => (
            <li key={player.playerId} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectPlayer(player)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition ${
                  index === activeIndex
                    ? "bg-violet-600/20"
                    : "hover:bg-violet-500/10"
                }`}
              >
                <span className="inline-flex shrink-0 items-center rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 font-display text-sm font-bold text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
                  {player.caps}
                  <span className="mr-1 text-xs font-normal text-blue-300/80">
                    הופעות
                  </span>
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-100">
                  {player.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && normalizeSearchQuery(query).length > 0 && suggestions.length === 0 && (
        <p className="absolute z-40 mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-center text-sm text-slate-500">
          לא נמצאו שחקנים התואמים לחיפוש
        </p>
      )}
    </div>
  );
}

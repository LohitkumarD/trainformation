'use client';

import React, { useRef, useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { COACH_COLORS, detectCoachType } from '@/lib/coach-colors';
import { generateId } from '@/lib/utils';
import type { Coach } from '@/types';

// ─── Button definitions ───────────────────────────────────────────────────────
// noNumber: true  → always adds the bare prefix (ENG, PC, VP, LPR)
// noNumber: false → auto-increments: S→S1, S→S2, SLR→SLR1 …

interface BtnDef {
  prefix: string;
  noNumber?: boolean;
}

const BUTTONS: BtnDef[] = [
  // Engine
  { prefix: 'ENG',  noNumber: true  },
  // Guard / Utility vans
  { prefix: 'SLR'  },
  { prefix: 'LSLR' },
  { prefix: 'D'    },
  { prefix: 'DE'   },
  // Sleeper
  { prefix: 'S'    },
  { prefix: 'M'    },
  { prefix: 'SE'   },
  // AC
  { prefix: 'B'    },
  { prefix: 'A'    },
  { prefix: 'H'    },
  { prefix: 'HA'   },
  { prefix: 'AE'   },
  // Chair / Other
  { prefix: 'C'    },
  { prefix: 'PC',  noNumber: true  },
  { prefix: 'LPR', noNumber: true  },
  { prefix: 'VP',  noNumber: true  },
];

// ─── Auto-increment helper ────────────────────────────────────────────────────
function getNextCode(prefix: string, noNumber: boolean, coaches: Coach[]): string {
  const upper = prefix.toUpperCase();
  if (noNumber) return upper;

  // Collect all numeric suffixes of existing coaches with this exact prefix
  const nums = coaches
    .map((c) => c.code.toUpperCase())
    .filter((code) => code.startsWith(upper) && /^\d+$/.test(code.slice(upper.length)))
    .map((code) => parseInt(code.slice(upper.length), 10))
    .filter((n) => !isNaN(n) && n > 0);

  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${upper}${next}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface QuickCoachButtonsProps {
  coaches: Coach[];
  onAdd: (coach: Coach) => void;
}

export function QuickCoachButtons({ coaches, onAdd }: QuickCoachButtonsProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

  const handleQuickAdd = (btn: BtnDef) => {
    const code = getNextCode(btn.prefix, btn.noNumber ?? false, coaches);
    onAdd({ id: generateId(), code, type: detectCoachType(code) });
  };

  const handleCustomAdd = () => {
    const code = customCode.trim().toUpperCase();
    if (!code) return;
    onAdd({ id: generateId(), code, type: detectCoachType(code) });
    setCustomCode('');
    customInputRef.current?.focus();
  };

  const openCustom = () => {
    setShowCustom(true);
    // tiny delay so the input is rendered before we focus
    setTimeout(() => customInputRef.current?.focus(), 50);
  };

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        Quick Add
      </p>

      {/* ── Scrollable button row ─────────────────────────────────── */}
      <div className="overflow-x-auto -mx-1 pb-1">
        <div className="flex gap-1.5 px-1 w-max">
          {BUTTONS.map((btn) => {
            // Colour based on what the code will look like once numbered
            const sampleCode = btn.noNumber ? btn.prefix : `${btn.prefix}1`;
            const cfg = COACH_COLORS[detectCoachType(sampleCode)];

            // Count how many of this prefix already exist in the list
            const upper = btn.prefix.toUpperCase();
            const count = coaches.filter((c) => {
              const code = c.code.toUpperCase();
              if (!code.startsWith(upper)) return false;
              const rest = code.slice(upper.length);
              return rest === '' || /^\d+$/.test(rest);
            }).length;

            return (
              <button
                key={btn.prefix}
                type="button"
                onClick={() => handleQuickAdd(btn)}
                className="relative flex flex-col items-center justify-center gap-0.5 rounded-xl font-bold text-white active:scale-90 transition-transform min-w-[3rem] px-2.5 py-2.5 shadow-sm"
                style={{ backgroundColor: cfg.hex }}
                aria-label={`Add ${btn.prefix} coach`}
              >
                <span className="text-xs leading-none">{btn.prefix}</span>
                {count > 0 && (
                  <span className="text-[9px] leading-none opacity-75">×{count}</span>
                )}
              </button>
            );
          })}

          {/* ── Custom button ─────────────────────────────────────── */}
          <button
            type="button"
            onClick={openCustom}
            className="flex flex-col items-center justify-center gap-0.5 rounded-xl font-bold text-slate-600 active:scale-90 transition-transform min-w-[3rem] px-2.5 py-2.5 border-2 border-dashed border-slate-300 bg-slate-50"
            aria-label="Add custom coach"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[10px] leading-none">Custom</span>
          </button>
        </div>
      </div>

      {/* ── Custom code inline input ──────────────────────────────── */}
      {showCustom && (
        <div className="flex gap-2 items-center animate-fade-in">
          <input
            ref={customInputRef}
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomAdd();
              if (e.key === 'Escape') {
                setShowCustom(false);
                setCustomCode('');
              }
            }}
            placeholder="e.g. GEN, UR, GSCN…"
            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:normal-case placeholder:text-slate-400"
            maxLength={10}
            autoCapitalize="characters"
          />
          <button
            type="button"
            onClick={handleCustomAdd}
            disabled={!customCode.trim()}
            className="h-10 px-4 rounded-xl text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
            style={{ backgroundColor: '#2563EB' }}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => { setShowCustom(false); setCustomCode(''); }}
            className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center active:scale-95"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CoachBadge } from './CoachBadge';
import { QuickCoachButtons } from './QuickCoachButtons';
import { parseCoachSequence } from '@/lib/parser';
import { detectCoachType } from '@/lib/coach-colors';
import { generateId } from '@/lib/utils';
import type { Coach } from '@/types';
import { cn } from '@/lib/utils';

// ─── Drag-sortable coach item ─────────────────────────────────────────────────
interface SortableCoachItemProps {
  coach: Coach;
  index: number;
  onRemove: (id: string) => void;
}

function SortableCoachItem({ coach, index, onRemove }: SortableCoachItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: coach.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={cn('flex flex-col items-center gap-1 relative group', isDragging && 'z-50')}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded text-muted-foreground touch-none"
      >
        <GripVertical className="w-3 h-3" />
      </div>

      <CoachBadge code={coach.code} type={coach.type} size="md" />

      {/* Position index */}
      <span className="text-[10px] text-muted-foreground">{index + 1}</span>

      {/* Remove button — visible on hover/focus */}
      <button
        onClick={() => onRemove(coach.id)}
        className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity shadow"
        type="button"
        aria-label={`Remove ${coach.code}`}
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────
interface CoachEditorProps {
  coaches: Coach[];
  onChange: (coaches: Coach[]) => void;
}

export function CoachEditor({ coaches, onChange }: CoachEditorProps) {
  const [showBulk, setShowBulk] = useState(false);
  const [bulkInput, setBulkInput] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = coaches.findIndex((c) => c.id === active.id);
      const newIndex = coaches.findIndex((c) => c.id === over.id);
      onChange(arrayMove(coaches, oldIndex, newIndex));
    }
  };

  const removeCoach = (id: string) => {
    onChange(coaches.filter((c) => c.id !== id));
  };

  const applyBulkInput = () => {
    if (!bulkInput.trim()) return;
    const parsed = parseCoachSequence(bulkInput);
    if (parsed.length > 0) {
      onChange([...coaches, ...parsed]);
      setBulkInput('');
      setShowBulk(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* ── 1. Quick-add shortcut buttons ─────────────────────────── */}
      <QuickCoachButtons
        coaches={coaches}
        onAdd={(coach) => onChange([...coaches, coach])}
      />

      {/* ── 2. Current coach list (drag to reorder) ───────────────── */}
      {coaches.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Sequence — drag to reorder
          </p>
          <div className="overflow-x-auto -mx-1 pb-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={coaches.map((c) => c.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-3 px-1 w-max py-1">
                  {coaches.map((coach, idx) => (
                    <SortableCoachItem
                      key={coach.id}
                      coach={coach}
                      index={idx}
                      onRemove={removeCoach}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{coaches.length} coaches</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-red-500 underline"
            >
              Clear all
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-14 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
          Tap a button above to add coaches
        </div>
      )}

      {/* ── 3. Bulk / paste input (collapsed by default) ─────────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowBulk((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-primary"
        >
          {showBulk ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Bulk paste / import sequence
        </button>

        {showBulk && (
          <div className="mt-2 space-y-2 animate-fade-in">
            <p className="text-xs text-muted-foreground">
              Paste a full sequence or use ranges — e.g.{' '}
              <span className="font-mono bg-muted px-1 rounded text-[11px]">
                ENG SLR1 GEN S1-S9 B1-B4 A1
              </span>
            </p>
            <div className="flex gap-2">
              <Input
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="ENG SLR1 S1-S9 B1-B4 A1"
                className="font-mono text-sm"
                onKeyDown={(e) => e.key === 'Enter' && applyBulkInput()}
              />
              <Button onClick={applyBulkInput} variant="accent" className="shrink-0">
                <Wand2 className="w-4 h-4" />
                Parse
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

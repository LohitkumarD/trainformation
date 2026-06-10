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
import { GripVertical, X, Plus, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CoachBadge } from './CoachBadge';
import { parseCoachSequence } from '@/lib/parser';
import { detectCoachType } from '@/lib/coach-colors';
import { generateId } from '@/lib/utils';
import type { Coach } from '@/types';
import { cn } from '@/lib/utils';

interface SortableCoachItemProps {
  coach: Coach;
  onRemove: (id: string) => void;
}

function SortableCoachItem({ coach, onRemove }: SortableCoachItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: coach.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex flex-col items-center gap-1 relative group',
        isDragging && 'z-50'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-3 h-3" />
      </div>
      <CoachBadge code={coach.code} type={coach.type} size="md" />
      <button
        onClick={() => onRemove(coach.id)}
        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow"
        type="button"
        aria-label={`Remove ${coach.code}`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

interface CoachEditorProps {
  coaches: Coach[];
  onChange: (coaches: Coach[]) => void;
}

export function CoachEditor({ coaches, onChange }: CoachEditorProps) {
  const [inputValue, setInputValue] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulk, setShowBulk] = useState(coaches.length === 0);

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

  const addCoach = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    const newCoach: Coach = { id: generateId(), code: trimmed, type: detectCoachType(trimmed) };
    onChange([...coaches, newCoach]);
    setInputValue('');
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
      {/* Bulk input */}
      {showBulk ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Enter coach sequence (e.g., <span className="font-mono text-xs bg-muted px-1 rounded">ENG SLRD GEN S1 S2 B1 A1</span> or ranges like <span className="font-mono text-xs bg-muted px-1 rounded">S1-S9</span>)
          </p>
          <div className="flex gap-2">
            <Input
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="ENG SLRD GEN S1 S2 S3 B1 A1"
              className="font-mono"
              onKeyDown={(e) => e.key === 'Enter' && applyBulkInput()}
            />
            <Button onClick={applyBulkInput} variant="accent" className="shrink-0">
              <Wand2 className="w-4 h-4" />
              Parse
            </Button>
          </div>
          {coaches.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBulk(false)}
              className="text-sm text-primary underline"
            >
              Switch to individual add
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toUpperCase())}
              placeholder="Add coach (e.g., S1, B2, GEN)"
              className="font-mono uppercase"
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addCoach(inputValue); }
              }}
            />
            <Button onClick={() => addCoach(inputValue)} className="shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setShowBulk(true)}
            className="text-sm text-primary underline"
          >
            Bulk paste / import sequence
          </button>
        </div>
      )}

      {/* Sortable coach list */}
      {coaches.length > 0 && (
        <div className="overflow-x-auto -mx-1 pb-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={coaches.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-3 px-1 w-max py-2">
                {coaches.map((coach) => (
                  <SortableCoachItem key={coach.id} coach={coach} onRemove={removeCoach} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {coaches.length === 0 && !showBulk && (
        <div className="flex items-center justify-center h-16 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
          No coaches added yet
        </div>
      )}

      {coaches.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>{coaches.length} coaches total</span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-red-500 hover:text-red-600 underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

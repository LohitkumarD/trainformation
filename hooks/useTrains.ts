'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { detectCoachType } from '@/lib/coach-colors';
import type { Train, Coach } from '@/types';
import { generateId } from '@/lib/utils';

/** Re-apply type detection on every read so stored data always uses latest logic. */
function reTypeCoaches(coaches: Coach[]): Coach[] {
  return coaches.map((c) => ({ ...c, type: detectCoachType(c.code) }));
}

function reTypeTrain(train: Train): Train {
  return { ...train, coaches: reTypeCoaches(train.coaches) };
}

export function useAllTrains(searchQuery?: string) {
  return useLiveQuery(async () => {
    const all = await db.trains.orderBy('updatedAt').reverse().toArray();
    const reTyped = all.map(reTypeTrain);
    if (!searchQuery?.trim()) return reTyped;
    const q = searchQuery.trim().toLowerCase();
    return reTyped.filter(
      (t) => t.number.includes(q) || t.name.toLowerCase().includes(q)
    );
  }, [searchQuery]);
}

export function useTrain(id: string) {
  return useLiveQuery(async () => {
    const train = await db.trains.get(id);
    return train ? reTypeTrain(train) : train;
  }, [id]);
}

export async function addTrain(data: {
  number: string;
  name: string;
  coaches: Coach[];
}): Promise<string> {
  const id = generateId();
  const now = Date.now();
  await db.trains.add({
    id,
    number: data.number.trim(),
    name: data.name.trim(),
    coaches: reTypeCoaches(data.coaches),
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateTrain(
  id: string,
  data: Partial<Omit<Train, 'id' | 'createdAt'>>
): Promise<void> {
  const patch = data.coaches
    ? { ...data, coaches: reTypeCoaches(data.coaches), updatedAt: Date.now() }
    : { ...data, updatedAt: Date.now() };
  await db.trains.update(id, patch);
}

export async function deleteTrain(id: string): Promise<void> {
  await db.trains.delete(id);
}

export async function getTrainByNumber(number: string): Promise<Train | undefined> {
  const train = await db.trains.where('number').equals(number.trim()).first();
  return train ? reTypeTrain(train) : undefined;
}

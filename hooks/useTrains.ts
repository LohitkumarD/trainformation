'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { Train, Coach } from '@/types';
import { generateId } from '@/lib/utils';

export function useAllTrains(searchQuery?: string) {
  return useLiveQuery(async () => {
    const all = await db.trains.orderBy('updatedAt').reverse().toArray();
    if (!searchQuery?.trim()) return all;
    const q = searchQuery.trim().toLowerCase();
    return all.filter(
      (t) => t.number.includes(q) || t.name.toLowerCase().includes(q)
    );
  }, [searchQuery]);
}

export function useTrain(id: string) {
  return useLiveQuery(() => db.trains.get(id), [id]);
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
    coaches: data.coaches,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateTrain(
  id: string,
  data: Partial<Omit<Train, 'id' | 'createdAt'>>
): Promise<void> {
  await db.trains.update(id, { ...data, updatedAt: Date.now() });
}

export async function deleteTrain(id: string): Promise<void> {
  await db.trains.delete(id);
}

export async function getTrainByNumber(number: string): Promise<Train | undefined> {
  return db.trains.where('number').equals(number.trim()).first();
}

import Dexie, { type Table } from 'dexie';
import type { Train } from '@/types';

class TrainDatabase extends Dexie {
  trains!: Table<Train, string>;

  constructor() {
    super('coach-position-manager');
    this.version(1).stores({
      trains: 'id, number, name, createdAt, updatedAt',
    });
  }
}

export const db = new TrainDatabase();

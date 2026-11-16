import fs from 'fs';
import path from 'path';
import type { SchoolDatabase } from '../src/types/school.ts';
import { createSeedDatabase } from './seed.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'gis-school-db.json');

let memoryDb: SchoolDatabase | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadDatabase(): SchoolDatabase {
  if (memoryDb) {
    return memoryDb;
  }
  ensureDataDir();
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      memoryDb = JSON.parse(raw) as SchoolDatabase;
      return memoryDb;
    } catch {
      // Fallback to fresh seed if corrupted
    }
  }
  memoryDb = createSeedDatabase();
  saveDatabase(memoryDb);
  return memoryDb;
}

export function saveDatabase(db: SchoolDatabase): void {
  memoryDb = db;
  ensureDataDir();
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}

export function resetDatabase(): SchoolDatabase {
  const fresh = createSeedDatabase();
  saveDatabase(fresh);
  return fresh;
}

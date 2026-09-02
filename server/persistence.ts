import fs from 'fs';
import path from 'path';
import { Bot, Trade, TelegramConfig } from '../src/types';

export interface PersistentArenaData {
  version: string;
  lastSavedAt: number;
  cloudStartedAt: number;
  isScanningActive: boolean;
  telegramConfig?: TelegramConfig;
  bots: Bot[];
  allTrades: Trade[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const PRIMARY_FILE = path.join(DATA_DIR, 'arena_state.json');
const BACKUP_FILE = path.join(DATA_DIR, 'arena_state.backup.json');

export class PersistenceManager {
  private saveTimeout: NodeJS.Timeout | null = null;
  private isSaving = false;

  constructor() {
    this.ensureDataDirectory();
  }

  private ensureDataDirectory() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('Could not create data directory:', err);
    }
  }

  /**
   * Load saved state from disk on startup.
   */
  public loadState(): PersistentArenaData | null {
    this.ensureDataDirectory();

    const tryLoad = (filePath: string): PersistentArenaData | null => {
      try {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          if (raw && raw.trim().length > 0) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.bots) && parsed.bots.length > 0) {
              console.log(`[Persistence] Successfully restored ${parsed.bots.length} bots and ${(parsed.allTrades || []).length} trades from ${filePath}`);
              return parsed;
            }
          }
        }
      } catch (err) {
        console.warn(`[Persistence] Failed to read ${filePath}:`, err);
      }
      return null;
    };

    // Try primary file first, then backup
    const primary = tryLoad(PRIMARY_FILE);
    if (primary) return primary;

    const backup = tryLoad(BACKUP_FILE);
    if (backup) return backup;

    console.log('[Persistence] No existing save file found. Initializing fresh 24/7 arena.');
    return null;
  }

  /**
   * Schedule debounced save to prevent excessive disk I/O during high frequency ticks
   */
  public scheduleSave(data: PersistentArenaData, immediate = false) {
    if (immediate) {
      this.saveNow(data);
      return;
    }

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveNow(data);
    }, 1500);
  }

  /**
   * Write data atomically to disk with backup protection
   */
  public saveNow(data: PersistentArenaData) {
    if (this.isSaving) return;
    this.isSaving = true;

    try {
      this.ensureDataDirectory();
      const payload = JSON.stringify(data, null, 2);
      const tempFile = path.join(DATA_DIR, `arena_state.tmp.${Date.now()}.json`);

      fs.writeFileSync(tempFile, payload, 'utf-8');
      
      // If primary file exists, make a backup first
      if (fs.existsSync(PRIMARY_FILE)) {
        try {
          fs.copyFileSync(PRIMARY_FILE, BACKUP_FILE);
        } catch {
          // ignore backup copy error
        }
      }

      fs.renameSync(tempFile, PRIMARY_FILE);
    } catch (err) {
      console.error('[Persistence] Error writing state to disk:', err);
    } finally {
      this.isSaving = false;
    }
  }
}

export const persistenceManager = new PersistenceManager();

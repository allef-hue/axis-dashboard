import { SDRConfig, CloserConfig } from './types';
import { SDR_CONFIGS as DEFAULT_SDR, CLOSER_CONFIGS as DEFAULT_CLOSER } from './config';

const SDR_KEY = 'axis_sdr_configs';
const CLOSER_KEY = 'axis_closer_configs';

export function loadSDRConfigs(): SDRConfig[] {
  try {
    const raw = localStorage.getItem(SDR_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SDRConfig[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migration: ensure diasUteis exists
        return parsed.map(c => ({
          ...c,
          diasUteis: c.diasUteis ?? 22,
        }));
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_SDR;
}

export function loadCloserConfigs(): CloserConfig[] {
  try {
    const raw = localStorage.getItem(CLOSER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CloserConfig[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migration: ensure diasUteis exists
        return parsed.map(c => ({
          ...c,
          diasUteis: c.diasUteis ?? 22,
        }));
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_CLOSER;
}

export function saveSDRConfigs(configs: SDRConfig[]): void {
  try {
    localStorage.setItem(SDR_KEY, JSON.stringify(configs));
  } catch (e) {
    console.error('Failed to save SDR configs:', e);
  }
}

export function saveCloserConfigs(configs: CloserConfig[]): void {
  try {
    localStorage.setItem(CLOSER_KEY, JSON.stringify(configs));
  } catch (e) {
    console.error('Failed to save Closer configs:', e);
  }
}

/** Converts a display name to a slug suitable for use as an ID */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'pessoa';
}

/** Generates a unique ID from a name, avoiding conflicts with existingIds */
export function generateUniqueId(name: string, existingIds: string[]): string {
  const base = slugifyName(name);
  let id = base;
  let counter = 2;
  while (existingIds.includes(id)) {
    id = `${base}_${counter++}`;
  }
  return id;
}

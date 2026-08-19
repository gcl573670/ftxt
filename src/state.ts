import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { log } from './logger.js';

export interface PublishedRecord {
  guid: string;
  url: string;
  title: string;
  publishedAt: string;
}

export interface State {
  published: Record<string, PublishedRecord>;
  updatedAt: string;
}

const STATE_FILE = resolve('state.json');

function loadState(): State {
  if (!existsSync(STATE_FILE)) return { published: {}, updatedAt: '' };
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { published: {}, updatedAt: '' };
  }
}

function saveState(state: State): void {
  const dir = dirname(STATE_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  state.updatedAt = new Date().toISOString();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

let _state: State | null = null;

function getState(): State {
  if (!_state) _state = loadState();
  return _state;
}

export function isPublished(key: string): boolean {
  return !!getState().published[key];
}

export function markPublished(key: string, rec: PublishedRecord): void {
  const state = getState();
  state.published[key] = rec;
  saveState(state);
  log.info('Marked as published', { key });
}

export function resetState(): void {
  _state = { published: {}, updatedAt: '' };
  saveState(_state);
}

import { vi } from 'vitest';

// Mock Tauri FS API for testing
export const readTextFile = vi.fn().mockResolvedValue('Test content');
export const writeTextFile = vi.fn().mockResolvedValue(undefined);
export const exists = vi.fn().mockResolvedValue(true);

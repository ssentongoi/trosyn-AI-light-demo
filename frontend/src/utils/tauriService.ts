import { invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';

const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

class TauriService {
  private static instance: TauriService | null = null;
  public isTauri: boolean = false;

  private constructor() {
    this.isTauri = this.checkTauriEnvironment();
  }

  public static getInstance(): TauriService {
    if (!TauriService.instance) {
      TauriService.instance = new TauriService();
    }
    return TauriService.instance;
  }

  private checkTauriEnvironment(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
  }

  public async invoke<T = any>(command: string, args?: any): Promise<T> {
    if (!this.isTauri) {
      console.warn('Tauri API not available in browser environment');
      return Promise.reject('Tauri API not available');
    }
    return invoke<T>(command, args);
  }

  public async readFile(path: string): Promise<string> {
    if (!this.isTauri) {
      console.warn('Tauri FS API not available in browser environment');
      return Promise.reject('Tauri FS API not available');
    }
    return readTextFile(path);
  }

  public async writeFile(path: string, contents: string): Promise<void> {
    if (!this.isTauri) {
      console.warn('Tauri FS API not available in browser environment');
      return Promise.reject('Tauri FS API not available');
    }
    return writeTextFile(path, contents);
  }

  public async fileExists(path: string): Promise<boolean> {
    if (!this.isTauri) {
      const errorMsg = 'Tauri FS API not available in browser environment';
      console.warn(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }
    return exists(path);
  }
}

export const tauriService = TauriService.getInstance();

import { useState, useEffect } from 'react';
import { tauriService } from '../utils/tauriService';

export function useTauri() {
  const [isTauri, setIsTauri] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkTauri = async () => {
      try {
        // Test a simple Tauri API call to verify environment
        await tauriService.fileExists('.');
        setIsTauri(true);
      } catch (err) {
        console.warn('Tauri environment not detected:', err);
        setIsTauri(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkTauri();
  }, []);

  const invoke = async <T = any,>(command: string, args?: any): Promise<T> => {
    if (!isTauri) {
      throw new Error('Tauri API is not available in this environment');
    }
    return tauriService.invoke<T>(command, args);
  };

  const readFile = async (path: string): Promise<string> => {
    if (!isTauri) {
      throw new Error('Tauri FS API is not available in this environment');
    }
    return tauriService.readFile(path);
  };

  const writeFile = async (path: string, contents: string): Promise<void> => {
    if (!isTauri) {
      throw new Error('Tauri FS API is not available in this environment');
    }
    return tauriService.writeFile(path, contents);
  };

  const fileExists = async (path: string): Promise<boolean> => {
    if (!isTauri) {
      return false;
    }
    return tauriService.fileExists(path);
  };

  return {
    isTauri,
    isLoading,
    error,
    invoke,
    readFile,
    writeFile,
    fileExists,
  };
}

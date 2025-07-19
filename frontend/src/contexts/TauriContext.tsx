import React, { createContext, useContext, ReactNode } from 'react';
import { useTauri } from '../hooks/useTauri';

interface TauriContextType {
  isTauri: boolean;
  isLoading: boolean;
  error: Error | null;
  invoke: <T = any>(command: string, args?: any) => Promise<T>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, contents: string) => Promise<void>;
  fileExists: (path: string) => Promise<boolean>;
}

const TauriContext = createContext<TauriContextType | undefined>(undefined);

export const TauriProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const tauri = useTauri();

  return (
    <TauriContext.Provider value={tauri}>
      {children}
    </TauriContext.Provider>
  );
};

export const useTauriContext = (): TauriContextType => {
  const context = useContext(TauriContext);
  if (context === undefined) {
    throw new Error('useTauriContext must be used within a TauriProvider');
  }
  return context;
};

export default TauriContext;

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import memoryService from '../services/memoryService';

const MemoryContext = createContext(null);

export const MemoryProvider = ({ children }) => {
  const [context, setContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load memory context on mount
  useEffect(() => {
    const loadContext = async () => {
      try {
        setIsLoading(true);
        const data = await memoryService.getContext();
        setContext(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load memory context:', err);
        setError('Failed to load memory context');
      } finally {
        setIsLoading(false);
      }
    };

    loadContext();
  }, []);

  // Update memory context
  const updateContext = useCallback(async (updates) => {
    try {
      await memoryService.updateContext(updates);
      setContext(prev => ({
        ...prev,
        ...updates,
        preferences: {
          ...prev?.preferences,
          ...updates.preferences,
        },
        context: {
          ...prev?.context,
          ...updates.context,
        },
      }));
      return { success: true };
    } catch (err) {
      console.error('Failed to update memory context:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Add an interaction to memory
  const addInteraction = useCallback(async (query, response, metadata = {}) => {
    try {
      const result = await memoryService.addInteraction(query, response, metadata);
      return { success: true, data: result };
    } catch (err) {
      console.error('Failed to add interaction to memory:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Export memory to file
  const exportMemory = useCallback(async () => {
    try {
      await memoryService.exportMemory();
      return { success: true };
    } catch (err) {
      console.error('Failed to export memory:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Import memory from file
  const importMemory = useCallback(async (file) => {
    try {
      const result = await memoryService.importMemory(file);
      // Reload context after import
      const newContext = await memoryService.getContext();
      setContext(newContext);
      return { success: true, data: result };
    } catch (err) {
      console.error('Failed to import memory:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Clear all memory
  const clearMemory = useCallback(async () => {
    try {
      await memoryService.clearMemory();
      // Reset to default context
      const defaultContext = await memoryService.getContext();
      setContext(defaultContext);
      return { success: true };
    } catch (err) {
      console.error('Failed to clear memory:', err);
      return { success: false, error: err.message };
    }
  }, []);

  const value = {
    context,
    isLoading,
    error,
    updateContext,
    addInteraction,
    exportMemory,
    importMemory,
    clearMemory,
  };

  return (
    <MemoryContext.Provider value={value}>
      {children}
    </MemoryContext.Provider>
  );
};

MemoryProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useMemory = () => {
  const context = useContext(MemoryContext);
  if (!context) {
    throw new Error('useMemory must be used within a MemoryProvider');
  }
  return context;
};

export default MemoryContext;

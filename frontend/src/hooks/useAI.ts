import { useState, useCallback } from 'react';
import { executeAITask } from '../api/aiApi';

type AITask = 'summarize' | 'redact' | 'spellcheck';

export const useAI = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState<number>(0);

  /**
   * Execute an AI task with the given text and options
   */
  const executeTask = useCallback(async (
    task: AITask,
    text: string,
    options: any = {}
  ) => {
    if (!text.trim()) {
      setError('Text input is required');
      return null;
    }

    setIsLoading(true);
    setError(null);
    setProgress(10);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 300);

      const response = await executeAITask(task, text, options);
      
      clearInterval(progressInterval);
      setProgress(100);

      if (!response.success) {
        throw new Error(response.error || 'An unknown error occurred');
      }

      setResult(response.data);
      return response.data;
    } catch (err) {
      console.error(`Error executing ${task}:`, err);
      setError(err.message || 'Failed to complete the task');
      return null;
    } finally {
      setIsLoading(false);
      // Reset progress after a short delay
      setTimeout(() => setProgress(0), 500);
    }
  }, []);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setResult(null);
    setProgress(0);
  }, []);

  return {
    // State
    isLoading,
    error,
    result,
    progress,
    
    // Actions
    executeTask,
    reset,
    
    // Convenience methods for common tasks
    summarize: (text: string, options = {}) => 
      executeTask('summarize', text, options),
      
    redact: (text: string, options = {}) => 
      executeTask('redact', text, options),
      
    spellcheck: (text: string, options = {}) => 
      executeTask('spellcheck', text, options)
  };
};

export default useAI;

import { useState } from 'react';
import { summarizeText, SummarizeResponse } from '../services/documentApi';

export function useSummarize() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summarize = async (text: string) => {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const res: SummarizeResponse = await summarizeText(text);
      if (res.status === 'success') {
        setSummary(res.summary ?? null);
      } else {
        setError(res.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return { summary, loading, error, summarize };
}

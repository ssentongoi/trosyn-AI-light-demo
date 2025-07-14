import { useState } from 'react';
import { spellcheckText, SpellcheckResponse } from '../services/documentApi';

export function useSpellcheck() {
  const [spellcheckedText, setSpellcheckedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spellcheck = async (text: string) => {
    setLoading(true);
    setError(null);
    setSpellcheckedText(null);
    try {
      const res: SpellcheckResponse = await spellcheckText(text);
      if (res.status === 'success') {
        setSpellcheckedText(res.spellchecked_text ?? null);
      } else {
        setError(res.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return { spellcheckedText, loading, error, spellcheck };
}

// Mock implementation of formatOutput.ts
export const formatSummary = (text: string, maxLength?: number): string => {
  return text.length > (maxLength || 150) 
    ? text.substring(0, maxLength || 150) + '...' 
    : text;
};

export const formatSummaryOutput = formatSummary;

export const formatRedaction = (text: string): string => {
  return text;
};

export const formatRedactionOutput = (text: string, options = {}) => {
  return {
    content: text,
    tokens: {
      count: text.length,
      limit: 1000,
      truncated: false
    },
    redactions: [{ type: 'pii', count: 2 }]
  };
};

export const formatSpellcheckResult = (result: {
  original: string;
  corrected: string;
  corrections: Array<{ original: string; corrected: string; start: number; end: number }>;
}) => {
  return result;
};

export default {
  formatSummary,
  formatRedaction,
  formatSpellcheckResult
};

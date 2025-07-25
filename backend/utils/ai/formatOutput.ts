import { truncateText, countTokens } from '@utils/ai/textHelpers.js';
import { join } from 'path';
import { readFileSync } from 'fs';

const configPath = join(process.cwd(), 'config/aiConfig.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

type SummaryOptions = {
  maxLength?: number;
  maxTokens?: number;
  includeBullets?: boolean;
  language?: string;
  temperature?: number;
};

type RedactionOptions = {
  redactionTypes?: string[];
  replacement?: string;
  temperature?: number;
};

type SpellcheckOptions = {
  language?: string;
  includeTypoCount?: boolean;
  temperature?: number;
};

interface TokenInfo {
  count: number;
  limit: number;
  truncated: boolean;
}

/**
 * Truncates text to a maximum token count
 */
const truncateToTokens = (text: string, maxTokens: number): { text: string; truncated: boolean } => {
  const tokens = text.split(/\s+/);
  if (tokens.length <= maxTokens) {
    return { text, truncated: false };
  }
  return { 
    text: tokens.slice(0, maxTokens).join(' ') + '... [truncated]',
    truncated: true 
  };
};

/**
 * Gets token information for a given text
 */
const getTokenInfo = (text: string, maxTokens?: number): TokenInfo => {
  const tokenCount = countTokens(text);
  const tokenLimit = maxTokens || config.models['gemma-3n']?.maxTokens || 4096;
  return {
    count: tokenCount,
    limit: tokenLimit,
    truncated: tokenCount > tokenLimit
  };
};

export const formatSummaryOutput = (
  summary: string,
  options: SummaryOptions = {}
): {
  content: string;
  tokens: TokenInfo;
  formattedContent: string;
} => {
  const { 
    maxLength = 1000, 
    maxTokens = config.features.summarization.maxTokens,
    includeBullets = true,
    language = 'en'
  } = options;

  // Apply token-based truncation first
  const { text: tokenSafeText, truncated: tokenTruncated } = truncateToTokens(summary, maxTokens);
  
  // Then apply character-based truncation
  const truncatedText = truncateText(tokenSafeText, maxLength);
  
  let formatted = truncatedText;
  
  if (includeBullets && !formatted.startsWith('- ') && !formatted.startsWith('* ')) {
    // Simple bullet point formatting
    formatted = formatted
      .split('. ')
      .filter((s: string) => s.trim().length > 0)
      .map((s: string) => `- ${s.trim().replace(/\.$/, '')}`)
      .join('\n');
  }
  
  const tokenInfo = getTokenInfo(formatted, maxTokens);
  
  return {
    content: truncatedText,
    formattedContent: formatted,
    tokens: {
      ...tokenInfo,
      truncated: tokenInfo.truncated || tokenTruncated
    }
  };
};

export const formatRedactionOutput = (
  text: string,
  options: RedactionOptions = {}
): {
  content: string;
  tokens: TokenInfo;
  redactions: Array<{ type: string; count: number }>;
} => {
  const { 
    redactionTypes = ['pii', 'sensitive'],
    replacement = '[REDACTED]',
  } = options;
  
  // Count redactions in the text
  const redactionPattern = new RegExp(replacement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const redactionCount = (text.match(redactionPattern) || []).length;
  
  // Get token information
  const tokenInfo = getTokenInfo(text);
  
  return {
    content: text,
    tokens: tokenInfo,
    redactions: redactionTypes.map(type => ({
      type,
      count: type === 'pii' ? redactionCount : 0 // Simplified for now
    }))
  };
};

export interface SpellcheckResult {
  original: string;
  corrected: string;
  issues: Array<{
    offset: number;
    length: number;
    type: string;
    word: string;
    suggestions: string[];
    correctedWord?: string;
  }>;
  issueCount: number;
  tokenInfo: {
    original: TokenInfo;
    corrected: TokenInfo;
    diff: number;
  };
  stats: {
    spelling: number;
    grammar: number;
    other: number;
  };
}

export const formatSpellcheckOutput = (
  text: string,
  issues: Array<{
    offset: number;
    length: number;
    type: string;
    word: string;
    suggestions: string[];
  }> = [],
  options: SpellcheckOptions = {}
): SpellcheckResult => {
  const { language = 'en-US', includeTypoCount = true } = options;
  
  let corrected = text;
  let offsetAdjustment = 0;
  
  // Initialize stats
  const stats = {
    spelling: 0,
    grammar: 0,
    other: 0
  };
  
  // Apply corrections to the text
  const processedIssues = issues.map(issue => {
    // Update stats
    if (issue.type === 'spelling') stats.spelling++;
    else if (issue.type === 'grammar') stats.grammar++;
    else stats.other++;
    
    if (issue.suggestions.length > 0) {
      const correctedWord = issue.suggestions[0];
      const start = issue.offset + offsetAdjustment;
      const end = start + issue.length;
      
      // Update the corrected text
      corrected = corrected.substring(0, start) + correctedWord + corrected.substring(end);
      
      // Adjust offset for subsequent corrections
      offsetAdjustment += correctedWord.length - issue.length;
      
      // Return updated issue with correct offset for the corrected text
      return {
        ...issue,
        correctedWord,
        offset: start
      };
    }
    return issue;
  });
  
  // Get token information for both original and corrected text
  const originalTokens = getTokenInfo(text);
  const correctedTokens = getTokenInfo(corrected);
  
  return {
    original: text,
    corrected,
    issues: processedIssues,
    issueCount: processedIssues.length,
    tokenInfo: {
      original: originalTokens,
      corrected: correctedTokens,
      diff: correctedTokens.count - originalTokens.count
    },
    stats
  };
};

// Helper to format timestamps in a user-friendly way
export const formatTimestamp = (date: Date = new Date()): string => {
  return date.toISOString();
};

// Helper to format error responses consistently
export const formatErrorResponse = (
  error: Error,
  context: string = 'AI processing'
) => {
  return {
    success: false,
    error: `${context} failed`,
    details: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'An error occurred. Please try again.'
  };
};

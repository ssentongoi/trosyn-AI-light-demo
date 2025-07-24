/**
 * Text processing utilities for AI operations
 */

/**
 * Truncates text to a maximum length, preserving words if possible
 */
export const truncateText = (text: string, maxLength: number = 1000, preserveWords: boolean = true): string => {
  if (!text || typeof text !== 'string') return '';
  
  if (text.length <= maxLength) return text;
  
  if (!preserveWords) return `${text.substring(0, maxLength)}...`;
  
  // Try to truncate at word boundary
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 
    ? `${truncated.substring(0, lastSpace)}...`
    : `${truncated}...`;
};

/**
 * Counts words in a text string
 */
export const countWords = (text: string): number => {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).length;
};

/**
 * Counts tokens in a text string using a simple approximation
 * Note: This is an approximation. For exact counts, use the tokenizer specific to the model
 */
export const countTokens = (text: string): number => {
  if (!text || typeof text !== 'string') return 0;
  
  // Simple approximation: 1 token ≈ 4 characters or 1 word
  const charCount = text.length;
  const wordCount = countWords(text);
  
  // Average of character-based and word-based estimates
  return Math.ceil((charCount / 4 + wordCount * 1.3) / 2);
};

/**
 * Estimates token count (legacy function, use countTokens for new code)
 * @deprecated Use countTokens instead for better accuracy
 */
export const estimateTokenCount = countTokens;

export const sanitizeInput = (text: string): string => {
  // Basic sanitization to prevent XSS
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// Helper to split text into chunks respecting word boundaries
export const chunkText = (
  text: string, 
  maxChunkSize: number = 1000,
  overlap: number = 50
): string[] => {
  if (!text || text.length <= maxChunkSize) return [text];
  
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + maxChunkSize;
    
    if (end < text.length) {
      // Try to find a good breaking point (space or punctuation)
      const nextSpace = text.lastIndexOf(' ', end);
      const nextPunctuation = Math.max(
        text.lastIndexOf('.', end),
        text.lastIndexOf('!', end),
        text.lastIndexOf('?', end),
        text.lastIndexOf('\n', end)
      );
      
      end = Math.max(nextPunctuation, nextSpace, start + Math.floor(maxChunkSize / 2));
      if (end <= start) end = start + maxChunkSize; // Fallback
    } else {
      end = text.length;
    }
    
    chunks.push(text.substring(start, end).trim());
    start = end - overlap;
    
    if (start >= text.length) break;
  }
  
  return chunks;
};

// Helper to detect language (mock implementation)
export const detectLanguage = (text: string): string => {
  // Simple implementation - in a real app, use a proper language detection library
  const commonEnglishWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I'];
  const wordCount = countWords(text);
  const englishWordCount = commonEnglishWords.filter(word => 
    new RegExp(`\\b${word}\\b`, 'i').test(text)
  ).length;
  
  return (englishWordCount / Math.min(commonEnglishWords.length, wordCount) > 0.3) 
    ? 'en' 
    : 'unknown';
};

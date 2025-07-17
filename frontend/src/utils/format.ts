/**
 * Format bytes to human-readable string
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places to show (default: 2)
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export const bytesToSize = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Format a date to a human-readable string
 * @param date - Date object or date string
 * @param format - Date format string (default: 'MMM d, yyyy')
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string, format = 'MMM d, yyyy'): string => {
  const d = date instanceof Date ? date : new Date(date);
  
  // Simple formatter for common formats
  const formatters: Record<string, (d: Date) => string | number> = {
    'yyyy': d => d.getFullYear(),
    'MM': d => String(d.getMonth() + 1).padStart(2, '0'),
    'dd': d => String(d.getDate()).padStart(2, '0'),
    'HH': d => String(d.getHours()).padStart(2, '0'),
    'mm': d => String(d.getMinutes()).padStart(2, '0'),
    'ss': d => String(d.getSeconds()).padStart(2, '0'),
  };
  
  // Format month names
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  // Format day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  let result = format;
  
  // Replace format tokens with actual values
  result = result.replace(/yyyy/g, String(d.getFullYear()));
  result = result.replace(/yy/g, String(d.getFullYear()).slice(-2));
  result = result.replace(/MMMM/g, monthNames[d.getMonth()]);
  result = result.replace(/MMM/g, monthNames[d.getMonth()]);
  result = result.replace(/MM/g, String(d.getMonth() + 1).padStart(2, '0'));
  result = result.replace(/dddd/g, dayNames[d.getDay()]);
  result = result.replace(/ddd/g, dayNames[d.getDay()]);
  result = result.replace(/dd/g, String(d.getDate()).padStart(2, '0'));
  result = result.replace(/d/g, String(d.getDate()));
  result = result.replace(/HH/g, String(d.getHours()).padStart(2, '0'));
  result = result.replace(/hh/g, String(d.getHours() % 12 || 12).padStart(2, '0'));
  result = result.replace(/mm/g, String(d.getMinutes()).padStart(2, '0'));
  result = result.replace(/ss/g, String(d.getSeconds()).padStart(2, '0'));
  result = result.replace(/a/g, d.getHours() < 12 ? 'am' : 'pm');
  result = result.replace(/A/g, d.getHours() < 12 ? 'AM' : 'PM');
  
  return result;
};

/**
 * Truncate text to a maximum length with an ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @param ellipsis - Ellipsis character(s) to use (default: '...')
 * @returns Truncated text with ellipsis if needed
 */
export const truncate = (text: string, maxLength: number, ellipsis = '...'): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}${ellipsis}`;
};

/**
 * Generate a unique ID
 * @param prefix - Optional prefix for the ID
 * @returns A unique ID string
 */
export const uniqueId = (prefix = 'id'): string => {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
};

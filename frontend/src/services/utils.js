/**
 * Utility service for common functions and helpers
 */

/**
 * Format bytes to human-readable format
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format date to a readable string
 * @param {string|Date} date - Date to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, locale = 'en-US') => {
  if (!date) return 'N/A';
  
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return new Date(date).toLocaleString(locale, options);
};

/**
 * Get time ago string from date
 * @param {string|Date} date - Date to calculate time ago
 * @returns {string} Time ago string (e.g., '2 hours ago')
 */
export const timeAgo = (date) => {
  if (!date) return 'N/A';
  
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval} year${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval} month${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval} day${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval} hour${interval === 1 ? '' : 's'} ago`;
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval} minute${interval === 1 ? '' : 's'} ago`;
  
  return 'Just now';
};

/**
 * Truncate text to a specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @param {string} ellipsis - Ellipsis character(s)
 * @returns {string} Truncated text
 */
export const truncateText = (text, length = 100, ellipsis = '...') => {
  if (!text || text.length <= length) return text;
  return text.substring(0, length) + ellipsis;
};

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
export const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Convert object to query string
 * @param {Object} params - Object to convert
 * @returns {string} Query string
 */
export const toQueryString = (params) => {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
};

/**
 * Parse query string to object
 * @param {string} queryString - Query string to parse
 * @returns {Object} Parsed object
 */
export const parseQueryString = (queryString) => {
  return Object.fromEntries(
    new URLSearchParams(queryString)
  );
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isLongEnough = password.length >= minLength;
  
  return {
    isValid: hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar,
    isLongEnough,
  };
};

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} File extension (without dot)
 */
export const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
};

/**
 * Get file icon based on file type
 * @param {string} filename - Filename or mime type
 * @returns {string} Font Awesome icon class
 */
export const getFileIcon = (filename) => {
  const extension = getFileExtension(filename).toLowerCase();
  
  const iconMap = {
    // Documents
    'pdf': 'file-pdf',
    'doc': 'file-word',
    'docx': 'file-word',
    'txt': 'file-alt',
    'rtf': 'file-alt',
    'odt': 'file-alt',
    'xls': 'file-excel',
    'xlsx': 'file-excel',
    'csv': 'file-csv',
    'ppt': 'file-powerpoint',
    'pptx': 'file-powerpoint',
    
    // Images
    'jpg': 'file-image',
    'jpeg': 'file-image',
    'png': 'file-image',
    'gif': 'file-image',
    'bmp': 'file-image',
    'svg': 'file-image',
    'webp': 'file-image',
    'tiff': 'file-image',
    
    // Audio
    'mp3': 'file-audio',
    'wav': 'file-audio',
    'ogg': 'file-audio',
    'm4a': 'file-audio',
    'flac': 'file-audio',
    
    // Video
    'mp4': 'file-video',
    'mov': 'file-video',
    'avi': 'file-video',
    'wmv': 'file-video',
    'flv': 'file-video',
    'mkv': 'file-video',
    
    // Archives
    'zip': 'file-archive',
    'rar': 'file-archive',
    '7z': 'file-archive',
    'tar': 'file-archive',
    'gz': 'file-archive',
    
    // Code
    'js': 'file-code',
    'jsx': 'file-code',
    'ts': 'file-code',
    'tsx': 'file-code',
    'html': 'file-code',
    'css': 'file-code',
    'scss': 'file-code',
    'json': 'file-code',
    'xml': 'file-code',
    'py': 'file-code',
    'java': 'file-code',
    'c': 'file-code',
    'cpp': 'file-code',
    'cs': 'file-code',
    'php': 'file-code',
    'rb': 'file-code',
    'go': 'file-code',
    'rs': 'file-code',
    'swift': 'file-code',
    'kt': 'file-code',
    'sh': 'file-code',
  };
  
  return `fa-${iconMap[extension] || 'file'}`;
};

/**
 * Format number with commas
 * @param {number} number - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (number) => {
  return new Intl.NumberFormat().format(number);
};

/**
 * Convert a string to title case
 * @param {string} str - String to convert
 * @returns {string} Title cased string
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

/**
 * Generate a random color
 * @returns {string} Hex color code
 */
export const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

/**
 * Convert hex color to RGBA
 * @param {string} hex - Hex color code
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} RGBA color string
 */
export const hexToRgba = (hex, alpha = 1) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default {
  formatFileSize,
  formatDate,
  timeAgo,
  truncateText,
  generateId,
  toQueryString,
  parseQueryString,
  debounce,
  throttle,
  isValidEmail,
  validatePassword,
  deepClone,
  getFileExtension,
  getFileIcon,
  formatNumber,
  toTitleCase,
  getRandomColor,
  hexToRgba,
};

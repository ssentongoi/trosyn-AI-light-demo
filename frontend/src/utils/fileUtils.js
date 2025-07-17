import { DocIcon as FileIcon } from './icons';

/**
 * Format bytes to human-readable string
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places to show
 * @returns {string} Formatted file size (e.g., '1.2 MB')
 */
export const bytesToSize = (bytes, decimals = 1) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 * @param {string} filename - The filename
 * @returns {string} File extension (without the dot)
 */
export const getFileExtension = (filename) => {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

/**
 * Get MIME type from file extension
 * @param {string} extension - File extension (with or without dot)
 * @returns {string} MIME type or 'application/octet-stream' if unknown
 */
export const getMimeType = (extension) => {
  if (!extension) return 'application/octet-stream';
  
  // Remove leading dot if present
  const ext = extension.startsWith('.') ? extension.substring(1) : extension;
  
  const mimeTypes = {
    // Text
    'txt': 'text/plain',
    'csv': 'text/csv',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    
    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    'bz2': 'application/x-bzip2',
    
    // Audio/Video
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'video/ogg',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
  };
  
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
};

/**
 * Check if a file type is an image
 * @param {string} mimeType - The MIME type to check
 * @returns {boolean} True if the file is an image
 */
export const isImage = (mimeType) => {
  return mimeType.startsWith('image/');
};

/**
 * Check if a file type is a document (PDF, Word, Excel, etc.)
 * @param {string} mimeType - The MIME type to check
 * @returns {boolean} True if the file is a document
 */
export const isDocument = (mimeType) => {
  return [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'text/html',
    'application/json',
    'application/xml'
  ].includes(mimeType);
};

/**
 * Get the appropriate icon for a file type
 * @param {string} mimeType - The MIME type of the file
 * @returns {React.ReactNode} A Material-UI icon component
 */
export const getFileIcon = (mimeType) => {
  if (!mimeType) return <FileIcon />;
  
  const iconProps = { fontSize: 'small' };
  
  if (mimeType.includes('pdf')) {
    return <FileIcon color="error" {...iconProps} />;
  }
  
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return <FileIcon color="primary" {...iconProps} />;
  }
  
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
    return <FileIcon sx={{ color: 'success.main' }} {...iconProps} />;
  }
  
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
    return <FileIcon sx={{ color: 'warning.main' }} {...iconProps} />;
  }
  
  if (mimeType.startsWith('image/')) {
    return <FileIcon sx={{ color: 'info.main' }} {...iconProps} />;
  }
  
  if (mimeType.startsWith('video/')) {
    return <FileIcon sx={{ color: 'secondary.main' }} {...iconProps} />;
  }
  
  if (mimeType.startsWith('audio/')) {
    return <FileIcon sx={{ color: 'primary.light' }} {...iconProps} />;
  }
  
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive')) {
    return <FileIcon sx={{ color: 'grey.600' }} {...iconProps} />;
  }
  
  return <FileIcon {...iconProps} />;
};

export default {
  bytesToSize,
  getFileExtension,
  getMimeType,
  isImage,
  isDocument,
  getFileIcon
};

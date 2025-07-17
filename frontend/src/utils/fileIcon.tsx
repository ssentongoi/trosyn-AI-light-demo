import React from 'react';
import {
  InsertDriveFile as InsertDriveFileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Audiotrack as AudioIcon,
  Videocam as VideoIcon,
  Code as CodeIcon,
  TableChart as XlsIcon,
  Article as DocIcon,
  FolderZip as ArchiveIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';

/**
 * Returns an appropriate icon based on the MIME type
 * @param mimeType - The MIME type of the file
 * @returns A React component representing the file icon
 */
export const getFileIcon = (mimeType: string): React.ReactNode => {
  if (!mimeType) return <InsertDriveFileIcon />;
  if (mimeType.startsWith('image/')) return <ImageIcon />;
  if (mimeType === 'application/pdf') return <PdfIcon />;
  if (mimeType.startsWith('audio/')) return <AudioIcon />;
  if (mimeType.startsWith('video/')) return <VideoIcon />;
  if (mimeType.startsWith('text/')) return <CodeIcon />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <XlsIcon />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <DocIcon />;
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return <ArchiveIcon />;
  if (mimeType.includes('cloud')) return <CloudIcon />;
  return <InsertDriveFileIcon />;
};

export default getFileIcon;

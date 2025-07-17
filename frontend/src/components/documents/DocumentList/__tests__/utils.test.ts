import { vi } from 'vitest';
import { bytesToSize, getFileExtension, getMimeTypeCategory, sortDocuments, filterDocuments } from '../utils';
import { Document } from '../../../../types/document';

describe('DocumentList utils', () => {
  describe('bytesToSize', () => {
    it('formats bytes correctly', () => {
      expect(bytesToSize(0)).toBe('0 Bytes');
      expect(bytesToSize(500)).toBe('500 Bytes');
      expect(bytesToSize(1024)).toBe('1 KB');
      expect(bytesToSize(1500)).toBe('1.46 KB');
      expect(bytesToSize(1024 * 1024)).toBe('1 MB');
      expect(bytesToSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
      expect(bytesToSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('handles custom decimal places', () => {
      expect(bytesToSize(1500, 0)).toBe('1 KB');
      expect(bytesToSize(1500, 4)).toBe('1.4648 KB');
    });
  });

  describe('getFileExtension', () => {
    it('extracts file extension correctly', () => {
      expect(getFileExtension('document.pdf')).toBe('pdf');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
      expect(getFileExtension('no_extension')).toBe('');
      expect(getFileExtension('UPPERCASE.PDF')).toBe('pdf');
      expect(getFileExtension('')).toBe('');
    });
  });

  describe('getMimeTypeCategory', () => {
    it('categorizes MIME types correctly', () => {
      // Images
      expect(getMimeTypeCategory('image/jpeg')).toBe('image');
      expect(getMimeTypeCategory('image/png')).toBe('image');
      
      // Documents
      expect(getMimeTypeCategory('application/pdf')).toBe('pdf');
      expect(getMimeTypeCategory('application/msword')).toBe('document');
      expect(getMimeTypeCategory('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('document');
      
      // Spreadsheets
      expect(getMimeTypeCategory('application/vnd.ms-excel')).toBe('spreadsheet');
      
      // Presentations
      expect(getMimeTypeCategory('application/vnd.ms-powerpoint')).toBe('presentation');
      
      // Archives
      expect(getMimeTypeCategory('application/zip')).toBe('archive');
      
      // Default cases
      expect(getMimeTypeCategory('')).toBe('other');
      expect(getMimeTypeCategory('unknown/type')).toBe('other');
    });
  });

  describe('sortDocuments', () => {
    const mockDocuments: Document[] = [
      { id: '1', name: 'Zebra', updatedAt: '2023-01-03', size: 100 } as Document,
      { id: '2', name: 'Apple', updatedAt: '2023-01-01', size: 200 } as Document,
      { id: '3', name: 'Banana', updatedAt: '2023-01-02', size: 150 } as Document,
    ];

    it('sorts by name in ascending order', () => {
      const sorted = sortDocuments(mockDocuments, 'name', 'asc');
      expect(sorted.map(d => d.id)).toEqual(['2', '3', '1']);
    });

    it('sorts by name in descending order', () => {
      const sorted = sortDocuments(mockDocuments, 'name', 'desc');
      expect(sorted.map(d => d.id)).toEqual(['1', '3', '2']);
    });

    it('sorts by date in ascending order', () => {
      const sorted = sortDocuments(mockDocuments, 'updatedAt', 'asc');
      expect(sorted.map(d => d.id)).toEqual(['2', '3', '1']);
    });

    it('sorts by size in descending order', () => {
      const sorted = sortDocuments(mockDocuments, 'size', 'desc');
      expect(sorted.map(d => d.id)).toEqual(['2', '3', '1']);
    });

    it('handles null/undefined values', () => {
      const docs = [
        { id: '1', name: 'A' } as Document,
        { id: '2', name: 'B', updatedAt: '2023-01-01' } as Document,
      ];
      const sorted = sortDocuments(docs, 'updatedAt', 'asc');
      expect(sorted[0].id).toBe('2');
    });
  });

  describe('filterDocuments', () => {
    const mockDocuments: Document[] = [
      { 
        id: '1', 
        name: 'report.pdf', 
        updatedAt: '2023-01-01',
        mimeType: 'application/pdf',
        tags: ['work', 'important']
      } as Document,
      { 
        id: '2', 
        name: 'image.jpg', 
        updatedAt: '2023-01-02',
        mimeType: 'image/jpeg',
        tags: ['personal']
      } as Document,
      { 
        id: '3', 
        name: 'data.xlsx', 
        updatedAt: '2023-01-03',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        tags: ['work']
      } as Document,
    ];

    it('filters by search query', () => {
      const filtered = filterDocuments(mockDocuments, 'report');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('filters by MIME type category', () => {
      const filtered = filterDocuments(mockDocuments, '', { mimeType: 'image' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    it('filters by tags', () => {
      const filtered = filterDocuments(mockDocuments, '', { tags: ['work'] });
      expect(filtered).toHaveLength(2);
      expect(filtered.map(d => d.id)).toContain('1');
      expect(filtered.map(d => d.id)).toContain('3');
    });

    it('filters by date range', () => {
      const filtered = filterDocuments(mockDocuments, '', {
        dateRange: {
          start: new Date('2023-01-02'),
          end: new Date('2023-01-02')
        }
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    it('combines multiple filters', () => {
      const filtered = filterDocuments(mockDocuments, 'data', { 
        tags: ['work'],
        mimeType: 'spreadsheet'
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('3');
    });

    it('returns all documents when no filters applied', () => {
      const filtered = filterDocuments(mockDocuments, '', {});
      expect(filtered).toHaveLength(3);
    });
  });
});

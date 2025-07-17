import React, { createContext, useContext, ReactNode } from 'react';
import { useDocuments, DocumentMetadata, DocumentWithVersions, DocumentVersion } from '../hooks/useDocuments';

interface DocumentApiContextType {
  // State
  loading: boolean;
  error: string | null;
  currentDocument: DocumentWithVersions | null;
  documentList: DocumentMetadata[];
  versionHistory: DocumentVersion[];
  
  // Document Actions
  uploadDocument: (file: File, metadata?: Partial<DocumentMetadata>) => Promise<any>;
  getDocument: (documentId: string) => Promise<DocumentWithVersions>;
  listDocuments: (page?: number, pageSize?: number, filters?: Record<string, any>) => Promise<any>;
  updateDocument: (documentId: string, updates: Partial<DocumentMetadata>) => Promise<any>;
  deleteDocument: (documentId: string) => Promise<any>;
  
  // Version Control
  getVersionHistory: (documentId: string, page?: number, pageSize?: number) => Promise<any>;
  getDocumentVersion: (documentId: string, versionId: string) => Promise<DocumentWithVersions>;
  restoreVersion: (documentId: string, versionId: string) => Promise<any>;
  
  // Document Processing
  summarizeText: (text: string, options?: any) => Promise<any>;
  spellcheckText: (text: string, language?: string) => Promise<any>;
  
  // Utilities
  clearError: () => void;
  
  // Pagination
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  
  versionPagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

const DocumentApiContext = createContext<DocumentApiContextType | undefined>(undefined);

interface DocumentApiProviderProps {
  children: ReactNode;
}

export const DocumentApiProvider: React.FC<DocumentApiProviderProps> = ({ children }) => {
  const documentApi = useDocuments();

  return (
    <DocumentApiContext.Provider value={documentApi}>
      {children}
    </DocumentApiContext.Provider>
  );
};

export const useDocumentApi = (): DocumentApiContextType => {
  const context = useContext(DocumentApiContext);
  if (context === undefined) {
    throw new Error('useDocumentApi must be used within a DocumentApiProvider');
  }
  return context;
};

export default DocumentApiContext;

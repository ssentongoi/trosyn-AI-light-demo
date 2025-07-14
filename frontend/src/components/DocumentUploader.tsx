import React, { useRef, useState } from 'react';
import { uploadDocument, UploadResponse } from '../services/documentApi';

export const DocumentUploader: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const content = ev.target?.result as string;
        const fileType = file.name.split('.').pop() || 'txt';
        const res = await uploadDocument(content, fileType);
        setResult(res);
        if (res.status !== 'success') setError(res.error || 'Unknown error');
      };
      reader.onerror = () => setError('Failed to read file');
      reader.readAsText(file);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: '24px 0' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept=".txt,.md,.json,.csv,.docx,.rtf,.html"
        onChange={handleFileChange}
        disabled={loading}
      />
      {loading && <span style={{ marginLeft: 8 }}>Uploading...</span>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {result && (
        <pre style={{ background: '#f8f8f8', padding: 12, borderRadius: 4, marginTop: 12 }}>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
};

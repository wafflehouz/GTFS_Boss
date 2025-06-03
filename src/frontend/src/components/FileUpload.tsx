import React, { useState } from 'react';
import type { ValidationResults } from '../types';

interface FileUploadProps {
  onValidationResults: (result: ValidationResults | null) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onValidationResults }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.zip')) {
        setError('Please select a ZIP file');
        setFile(null);
      } else {
        setFile(selectedFile);
        setError(null);
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/v1/validate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to validate GTFS feed');
      }

      const result = await response.json();
      console.log('Validation result received:', result);
      onValidationResults(result);
    } catch (err) {
      console.error('Error during validation:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while validating the feed');
      onValidationResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="upload-section">
      <h2>Upload GTFS Feed</h2>
      <form onSubmit={handleSubmit}>
        <div className="file-input-container">
          <input
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            disabled={isLoading}
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={!file || isLoading}>
          {isLoading ? 'Validating...' : 'Validate GTFS Feed'}
        </button>
      </form>
    </div>
  );
};

export default FileUpload; 
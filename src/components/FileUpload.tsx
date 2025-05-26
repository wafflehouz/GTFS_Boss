import React, { useState } from 'react';

interface FileUploadProps {
  onValidationComplete: (result: any) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onValidationComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/v1/validate', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      onValidationComplete(data);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Upload GTFS Feed</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" accept=".zip" onChange={handleFileChange} />
        <button type="submit" disabled={!file || loading}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  );
};

export default FileUpload; 
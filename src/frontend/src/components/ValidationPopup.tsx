import React from 'react';
import FileUpload from './FileUpload';
import ValidationResults from './ValidationResults';
import './ValidationPopup.css';

interface ValidationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  validationResults: any;
  onValidationResults: (results: any) => void;
}

const ValidationPopup: React.FC<ValidationPopupProps> = ({
  isOpen,
  onClose,
  validationResults,
  onValidationResults
}) => {
  if (!isOpen) return null;

  const handleValidationResults = (results: any) => {
    onValidationResults(results);
  };

  return (
    <div className="validation-popup-overlay" onClick={onClose}>
      <div className="validation-popup" onClick={e => e.stopPropagation()}>
        <button className="validation-popup-close" onClick={onClose}>×</button>
        <div className="upload-section">
          <FileUpload onValidationResults={handleValidationResults} />
          {validationResults && <ValidationResults result={validationResults} />}
        </div>
      </div>
    </div>
  );
};

export default ValidationPopup; 
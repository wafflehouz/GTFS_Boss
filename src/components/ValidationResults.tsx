import React from 'react';

interface ValidationResultsProps {
  result: {
    is_valid: boolean;
    errors: Array<{ message: string }>;
    warnings: Array<{ message: string }>;
  } | null;
}

const ValidationResults: React.FC<ValidationResultsProps> = ({ result }) => {
  if (!result) return null;

  return (
    <div>
      <h3>Validation Results</h3>
      <p>Feed is valid: {result.is_valid ? 'Yes' : 'No'}</p>
      {result.errors.length > 0 && (
        <div>
          <h4>Errors:</h4>
          <ul>
            {result.errors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}
      {result.warnings.length > 0 && (
        <div>
          <h4>Warnings:</h4>
          <ul>
            {result.warnings.map((warning, index) => (
              <li key={index}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ValidationResults; 
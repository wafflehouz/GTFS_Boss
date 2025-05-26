import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import ValidationResults from './components/ValidationResults';

function App() {
  const [validationResult, setValidationResult] = useState<any>(null);

  return (
    <div>
      <h1>GTFS Boss</h1>
      <FileUpload onValidationComplete={setValidationResult} />
      <ValidationResults result={validationResult} />
    </div>
  );
}

export default App; 
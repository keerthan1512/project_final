import React, { useState } from 'react';
import { Upload, X, FileCheck, AlertCircle, Cpu } from 'lucide-react'; // Added Cpu for analyzing state

function AiAnalysisFileUpload({
  // Adjusted props for clarity
  title = "AI Scene Analysis",
  description = "Upload a single image for analysis",
  acceptedTypes = ".jpg,.jpeg,.png", // Only accept image types
  maxSize = 10
}) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null); // Changed to handle a single file for simplicity
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Renamed from 'classifying'

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (fileToValidate) => {
    if (fileToValidate.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return false;
    }
    const fileType = fileToValidate.name.split('.').pop()?.toLowerCase();
    const validTypes = acceptedTypes.split(',').map(type => type.replace('.', ''));
    if (!fileType || !validTypes.includes(fileType)) {
      setError(`Invalid file type. Accepted types: ${acceptedTypes}`);
      return false;
    }
    return true;
  };

  const handleFileSelect = (files) => {
    setError("");
    if (files && files[0]) {
      const selectedFile = files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(Array.from(e.dataTransfer.files));
  };

  const handleChange = (e) => {
    e.preventDefault();
    handleFileSelect(Array.from(e.target.files));
    e.target.value = null; // Reset input to allow re-selecting the same file
  };

  const removeFile = () => {
    setFile(null);
  };

  // --- THIS IS THE MAIN MODIFIED FUNCTION ---
  const handleGenerateReport = async () => {
    if (!file) {
      setError("Please select a file to analyze.");
      return;
    }

    setError("");
    setIsAnalyzing(true);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Point to your Node.js proxy server
      const response = await fetch("http://localhost:5000/api/generate-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // Try to parse error from backend, otherwise throw generic error
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to generate PDF. Server responded with status ${response.status}`);
      }
      
      // 2. Get filename from the response header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'crime_report.pdf'; // Default filename
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      // 3. Get the PDF as a blob and create a download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename; // Use the dynamic filename from the server
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Error during report generation:", err);
      setError(err.message || "An unexpected error occurred. Please check the console.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
          dragActive ? 'border-blue-500 bg-blue-50/10' : 'border-gray-600'
        }`}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
      >
        <input
          type="file"
          className="hidden"
          accept={acceptedTypes}
          onChange={handleChange}
          id="file-upload"
        />
        <div className="flex flex-col items-center">
          <Upload className="w-12 h-12 text-blue-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">{title}</h3>
          <p className="text-gray-400 mb-4">{description}</p>
          <button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            onClick={() => document.getElementById('file-upload').click()}
          >
            Select Image
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center gap-2">
          <AlertCircle className="text-red-500" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {file && !isAnalyzing && (
        <div className="mt-6 space-y-4">
          <h4 className="font-semibold">Selected File:</h4>
          <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center gap-3 w-full">
              <FileCheck className="text-green-500 shrink-0" />
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-12 h-12 object-cover rounded shrink-0"
              />
              <div className="truncate w-full">
                <span className="block truncate">{file.name}</span>
                <span className="text-gray-400 text-sm block">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <button
            type="button"
            className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-bold text-lg"
            onClick={handleGenerateReport}
          >
            Generate PDF Report
          </button>
        </div>
      )}
      
      {isAnalyzing && (
        <div className="mt-6 p-6 bg-yellow-500/10 border border-yellow-500 rounded-xl shadow-lg flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <Cpu className="text-yellow-400 animate-spin" size={32}/>
            <h4 className="text-2xl font-bold text-yellow-400">Analyzing Image...</h4>
          </div>
          <p className="text-yellow-600">Please wait while the AI generates the report. This may take a moment.</p>
        </div>
      )}
    </div>
  );
}

export default AiAnalysisFileUpload;
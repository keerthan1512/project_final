import React, { useState, useEffect } from 'react'; // <-- Import useEffect
import { Upload, X, FileCheck, AlertCircle } from 'lucide-react'; 
import magnifyingGlassIcon from '../assets/realistic-magnifying-glass.svg';

function AiAnalysisFileUpload({
  title = "AI Scene Analysis",
  description = "Upload a single image for analysis",
  acceptedTypes = ".jpg,.jpeg,.png",
  maxSize = 10
}) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- NEW: State to hold the magnifying glass position ---
  const [position, setPosition] = useState({ top: '50%', left: '50%' });

  // --- NEW: useEffect hook to control the random animation ---
  useEffect(() => {
    let intervalId = null;

    // Only run the animation if analysis is in progress
    if (isAnalyzing) {
      // Set an interval to update the position every 2 seconds (2000 milliseconds)
      intervalId = setInterval(() => {
        const newTop = Math.floor(Math.random() * 80) + 10; // Random top between 10% and 90%
        const newLeft = Math.floor(Math.random() * 80) + 10; // Random left between 10% and 90%
        setPosition({ top: `${newTop}%`, left: `${newLeft}%` });
      }, 2000); // Adjust timing here
    }

    // This is a crucial cleanup function.
    // It runs when isAnalyzing becomes false or when the component unmounts.
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAnalyzing]); // This effect depends on the 'isAnalyzing' state

  // --- The rest of your handler functions remain the same ---
  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") setDragActive(true); else if (e.type === "dragleave") setDragActive(false); };
  const validateFile = (fileToValidate) => { if (fileToValidate.size > maxSize * 1024 * 1024) { setError(`File size must be less than ${maxSize}MB`); return false; } const fileType = fileToValidate.name.split('.').pop()?.toLowerCase(); const validTypes = acceptedTypes.split(',').map(type => type.replace('.', '')); if (!fileType || !validTypes.includes(fileType)) { setError(`Invalid file type. Accepted types: ${acceptedTypes}`); return false; } return true; };
  const handleFileSelect = (files) => { setError(""); if (files && files[0]) { const selectedFile = files[0]; if (validateFile(selectedFile)) { setFile(selectedFile); } } };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); handleFileSelect(Array.from(e.dataTransfer.files)); };
  const handleChange = (e) => { e.preventDefault(); handleFileSelect(Array.from(e.target.files)); e.target.value = null; };
  const removeFile = () => { setFile(null); };

  const handleGenerateReport = async () => {
    if (!file) { setError("No file selected."); return; }
    setError("");
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("http://localhost:5000/api/generate-pdf", { method: "POST", body: formData });
      if (!response.ok) { const errData = await response.json().catch(() => ({})); throw new Error(errData.error || `Server responded with status ${response.status}`); }
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'crime_report.pdf';
      if (contentDisposition) { const match = contentDisposition.match(/filename="?([^"]+)"?/); if (match && match[1]) { filename = match[1]; } }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error("Error during report generation:", err); setError(err.message || "An unexpected error occurred."); }
    finally { setIsAnalyzing(false); }
  };

  return (
    <div className="w-full">
      {/* Upload Dropzone (no changes) */}
      {!file && (
        <div className={`relative border-2 border-dashed rounded-lg p-8 text-center ${dragActive ? 'border-blue-500 bg-blue-50/10' : 'border-gray-600'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
          <input type="file" className="hidden" accept={acceptedTypes} onChange={handleChange} id="file-upload" />
          <div className="flex flex-col items-center"><Upload className="w-12 h-12 text-blue-500 mb-4" /><h3 className="text-xl font-bold mb-2">{title}</h3><p className="text-gray-400 mb-4">{description}</p><button type="button" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors" onClick={() => document.getElementById('file-upload').click()}>Select Image</button></div>
        </div>
      )}

      {/* Error Message (no changes) */}
      {error && (<div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center gap-2"><AlertCircle className="text-red-500" /><p className="text-red-500">{error}</p></div>)}

      {/* Image Preview and Analysis Section */}
      {file && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between"><h4 className="font-semibold">Analysis Preview:</h4><button onClick={removeFile} disabled={isAnalyzing} className="text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"><X size={24} /></button></div>
          <div className="relative w-full aspect-w-16 aspect-h-9 border-2 border-gray-700 rounded-lg overflow-hidden shadow-lg">
            <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-contain" />
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white transition-opacity duration-300">
                {/* --- The moving magnifying glass --- */}
                <div 
                  className="absolute transition-all duration-1000 ease-in-out" // No animation class needed
                  style={{ top: position.top, left: position.left }} // Position is now controlled by state
                >
                  <img src={magnifyingGlassIcon} alt="Analyzing..." className="w-24 h-24 drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 10px rgb(56 189 248 / 0.7))' }} />
                </div>
                <p className="absolute bottom-8 text-lg font-semibold animate-pulse tracking-wider">ANALYZING SCENE...</p>
              </div>
            )}
          </div>
          {!isAnalyzing && (<button type="button" className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-bold text-lg" onClick={handleGenerateReport}>Generate PDF Report</button>)}
        </div>
      )}
    </div>
  );
}

export default AiAnalysisFileUpload;
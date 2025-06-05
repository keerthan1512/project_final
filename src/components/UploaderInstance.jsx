// src/components/UploaderInstance.jsx
import React, { useState, useRef, useEffect } from "react";
import { Upload, X, FileCheck, AlertCircle } from "lucide-react";
import { Client, handle_file } from "@gradio/client";

function UploaderInstance({
  instanceType,
  title,
  description,
  maxSize,
  acceptMimeTypes,
  validationStartsWith,
  gradioSpaceUrl,
  gradioApiName,
  onClassificationComplete,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingFileIndex, setProcessingFileIndex] = useState(0);
  const [results, setResults] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const fileInputRef = useRef(null);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      files.forEach(({ url }) => URL.revokeObjectURL(url));
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [files]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return false;
    }
    if (!file.type.startsWith(validationStartsWith)) {
      setError(`Invalid file type. Please select ${instanceType} files.`);
      return false;
    }
    return true;
  };

  const handleFilesSelected = (selectedFiles) => {
    setError("");
    const validFiles = [];
    Array.from(selectedFiles).forEach((file) => {
      if (validateFile(file)) {
        validFiles.push({ file, url: URL.createObjectURL(file) });
      }
    });
    setFiles((prev) => [...prev, ...validFiles.slice(0, 10 - prev.length)]);
    setResults(null);
    setUploadProgress(0);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
      e.target.value = null;
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
    if (files.length -1 === 0) {
        setResults(null);
        setError("");
        setUploadProgress(0);
    }
  };

  const handleUploadAndClassify = async () => {
    if (files.length === 0) return;

    setError("");
    setResults(null);
    setClassifying(true);
    setProcessingFileIndex(0);

    const totalFiles = files.length;
    const resultsArray = [];
    const historyItemsArray = [];
    let overallErrorOccurred = false;

    const isLocalApiCall = instanceType === "video" && gradioSpaceUrl.startsWith("http://localhost");
    let gradioClient;
    if (!isLocalApiCall) {
      try {
        gradioClient = await Client.connect(gradioSpaceUrl);
      } catch (connectError) {
        console.error(`Gradio client connection error (${instanceType}):`, connectError);
        setError(`Failed to connect to ${instanceType} classification service: ${connectError.message || connectError}`);
        setClassifying(false);
        return;
      }
    }

    for (let i = 0; i < totalFiles; i++) {
      setProcessingFileIndex(i);
      const currentFile = files[i];
      const fileObject = currentFile.file;
      let classificationOutcome = "Unknown result format";

      setUploadProgress(0); 
      const startSimulatedProgress = () => {
        setUploadProgress(5); 
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 95) { 
              if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
              return prev;
            }
            return prev + (totalFiles > 1 ? 3 : 1); 
          });
        }, totalFiles > 1 ? 150: 250); 
      };

      const stopSimulatedProgress = (finalProgress = 100) => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setUploadProgress(finalProgress);
      };
      
      startSimulatedProgress();

      try {
        if (isLocalApiCall) {
          const formData = new FormData();
          formData.append('video', fileObject);
          const response = await fetch(gradioSpaceUrl, { method: 'POST', body: formData });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Server error: ${response.status}` }));
            throw new Error(errorData.message || `Classification failed for ${fileObject.name}`);
          }
          const predictionData = await response.json();
          classificationOutcome = predictionData.prediction
          historyItemsArray.push({
            filename: fileObject.name, featureType: instanceType,
            classificationResult: JSON.stringify(predictionData.prediction), timestamp: new Date().toISOString(),
          });
        } else {
          let payload = instanceType === "video" ? [{ video: handle_file(fileObject), subtitles: null }] : [handle_file(fileObject)];
          const result = await gradioClient.predict(gradioApiName, payload);
          classificationOutcome = result?.data?.[0] ?? "Unknown result format from Gradio";
          historyItemsArray.push({
            filename: fileObject.name, featureType: instanceType,
            classificationResult: typeof classificationOutcome === 'object' ? JSON.stringify(classificationOutcome) : String(classificationOutcome),
            timestamp: new Date().toISOString(),
          });
        }
        stopSimulatedProgress(100); 
        resultsArray.push({ name: fileObject.name, result: classificationOutcome });
      } catch (uploadError) {
        stopSimulatedProgress(0); 
        console.error(`${instanceType} classification error for ${fileObject.name}:`, uploadError);
        const errorMessage = `Error: ${uploadError.message || "Classification failed"}`;
        resultsArray.push({ name: fileObject.name, result: errorMessage });
        historyItemsArray.push({
            filename: fileObject.name, featureType: instanceType,
            classificationResult: errorMessage, timestamp: new Date().toISOString(), error: true
        });
        overallErrorOccurred = true;
        if (totalFiles === 1) { 
          break;
        }
      }
    } 

    setResults(resultsArray);
    if (onClassificationComplete && historyItemsArray.length > 0) {
      onClassificationComplete(historyItemsArray);
    }

    files.forEach(({ url }) => URL.revokeObjectURL(url));
    setFiles([]);
    setClassifying(false);
    
    if (overallErrorOccurred && resultsArray.length > 0) { 
      setError(`Some ${instanceType}s could not be classified. Check results.`);
    } else if (overallErrorOccurred) { 
       setError(`Classification failed for the ${instanceType}. Please try again.`);
    } else if (resultsArray.length > 0) {
      setError("");
    }
  };

  const getButtonText = () => {
    if (classifying) {
      const totalFilesForButton = files.length || 1; 
      if (totalFilesForButton > 1) {
        return `Classifying file ${processingFileIndex + 1} of ${totalFilesForButton}... (${uploadProgress}%)`;
      }
      return `Classifying ${instanceType}... (${uploadProgress}%)`;
    }
    if (files.length > 0) {
      return `Upload & Classify ${files.length} ${instanceType}${files.length !== 1 ? "s" : ""}`;
    }
    return `Select ${instanceType}${instanceType === "image" || instanceType === "video" ? "(s)" : ""}`;
  };


  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
          // Keeping drag active border yellow as it matches the upload icon
          dragActive ? "border-yellow-500 bg-yellow-50/10" : "border-gray-600" 
        }`}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
      >
        <input
          type="file" multiple className="hidden"
          accept={acceptMimeTypes}
          onChange={handleChange} ref={fileInputRef}
          aria-label={`Select ${instanceType} files`}
          disabled={classifying}
        />
        <div className="flex flex-col items-center">
          <Upload className="w-12 h-12 text-blue-500 mb-4" /> 
          <h3 className="text-xl font-bold mb-2">{title}</h3>
          <p className="text-gray-400 mb-4">{description}</p>
          <button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors" 
            onClick={() => fileInputRef.current?.click()}
            aria-label={`Open file picker for ${instanceType}s`}
            disabled={classifying}
          >
            {files.length === 0 ? `Select ${instanceType}${instanceType === "image" || instanceType === "video" ? "(s)" : ""}` : `Add more ${instanceType}(s)`}
          </button>
          {files.length > 0 && (
            <button
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors mt-4" 
              onClick={handleUploadAndClassify}
              aria-label={`Upload and classify selected ${instanceType}s`}
              disabled={classifying || files.length === 0}
            >
              {getButtonText()}
            </button>
          )}
          {classifying && (
             // --- Progress Bar Styling Changes (Option 4: Teal on Dark Gray) ---
             <div className="w-full bg-gray-700 rounded-full mt-4 h-5"> {/* Outer bar: Dark Gray, height h-5 */}
              <div
                className="bg-teal-500 h-5 rounded-full transition-all duration-150 ease-linear" // Inner bar: Teal, height h-5
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
           {classifying && <p className="text-sm text-gray-400 mt-1">{uploadProgress}%</p>} 
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center gap-2">
          <AlertCircle className="text-red-500" /> <p className="text-red-500">{error}</p>
        </div>
      )}

      {files.length > 0 && !classifying && (
        <div className="mt-6 space-y-3 max-h-60 overflow-auto">
          <h4 className="font-semibold">Selected {instanceType === "image" ? "Images" : "Videos"}: ({files.length})</h4>
          {files.map(({ file, url }, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center gap-3 w-full min-w-0">
                {instanceType === "image" ? (
                  <img className="w-20 h-12 object-cover rounded shrink-0" src={url} alt={`Preview of ${file.name}`} />
                ): (
                  <video className="w-20 h-12 object-cover rounded shrink-0" src={url} />
                )}
                <div className="truncate flex-grow">
                  <span className="block truncate" title={file.name}>{file.name}</span>
                  <span className="text-gray-400 text-sm block">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              </div>
              <button onClick={() => removeFile(index)} className="text-gray-400 hover:text-red-500 transition-colors ml-2 shrink-0" aria-label={`Remove file ${file.name}`}>
                <X size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      {results && (
        <div className="mt-6 p-6 bg-gray-800 border border-gray-700 rounded-xl shadow-lg">
          <h4 className="text-2xl font-bold text-white mb-4">{instanceType.charAt(0).toUpperCase() + instanceType.slice(1)} Classification Results:</h4>
          <div className="space-y-4">
            {results.map((r, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg shadow-md transition-colors ${
                  r.result && String(r.result).toLowerCase().startsWith("error:")
                    ? "bg-red-500/20 border border-red-500"
                    : "bg-green-500/20 border border-green-500 hover:bg-green-400/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-base truncate pr-2 ${r.result && String(r.result).toLowerCase().startsWith("error:") ? "text-red-300" : "text-white"}`} title={r.name}>{r.name}</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold min-w-[100px] text-center ${
                      r.result && String(r.result).toLowerCase().startsWith("error:")
                        ? "bg-red-600 text-white"
                        : "bg-green-600 text-white"
                    }`}
                  >
                    {typeof r.result === 'object' ? JSON.stringify(r.result) : r.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UploaderInstance;

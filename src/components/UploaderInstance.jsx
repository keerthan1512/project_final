// src/components/UploaderInstance.jsx
import React, { useState, useRef, useEffect } from "react";
import { Upload, X, FileCheck, AlertCircle } from "lucide-react";
import { Client, handle_file } from "@gradio/client";

function UploaderInstance({
  instanceType, // "image" or "video"
  title,
  description,
  maxSize, // Max size in MB
  acceptMimeTypes, // e.g., "image/*" or "video/*"
  validationStartsWith, // e.g., "image/" or "video/"
  gradioSpaceUrl,
  gradioApiName,
  onClassificationComplete, // <<<< NEW PROP
}) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]); // { file, url }
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      files.forEach(({ url }) => URL.revokeObjectURL(url));
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
    setFiles((prev) => [...prev, ...validFiles]);
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
  };

  const handleUploadAndClassify = async () => {
    if (files.length === 0) return;
    setUploadProgress(0);
    setError("");
    setResults(null);
    setClassifying(true);

    let client;
    try {
      client = await Client.connect(gradioSpaceUrl);
    } catch (connectError) {
      console.error(`Gradio client connection error (${instanceType}):`, connectError);
      setError(`Failed to connect to ${instanceType} classification service: ${connectError.message || connectError}`);
      setClassifying(false);
      return;
    }

    const totalFiles = files.length;
    const resultsArray = [];
    const historyItemsArray = []; // <<<< For collecting items to send to history
    let overallErrorOccurred = false;

    for (let i = 0; i < totalFiles; i++) {
      const currentFile = files[i];
      const fileObject = currentFile.file;
      let classificationOutcome = "Unknown result format"; // Default

      try {
        let payload;
        if (instanceType === "video") {
          payload = [{
            video: handle_file(fileObject),
            subtitles: null
          }];
        } else {
          payload = [handle_file(fileObject)];
        }

        const result = await client.predict(gradioApiName, payload);
        classificationOutcome = result?.data?.[0] ?? "Unknown result format";
        resultsArray.push({ name: fileObject.name, result: classificationOutcome });

        // Prepare item for history (only successful classifications or specify error)
        historyItemsArray.push({
            filename: fileObject.name,
            featureType: instanceType, // "image" or "video"
            classificationResult: typeof classificationOutcome === 'object' ? JSON.stringify(classificationOutcome) : String(classificationOutcome),
            timestamp: new Date().toISOString(),
            // Add other fields your history schema might need, e.g., confidence if available
        });

      } catch (uploadError) {
        console.error(`${instanceType} classification error for ${fileObject.name}:`, uploadError);
        const errorMessage = `Error: ${uploadError.message || "Classification failed"}`;
        resultsArray.push({
          name: fileObject.name,
          result: errorMessage,
        });
        // Optionally, still log it to history but with the error
         historyItemsArray.push({
            filename: fileObject.name,
            featureType: instanceType,
            classificationResult: errorMessage, // Log the error
            timestamp: new Date().toISOString(),
            error: true // Indicate it was an error
        });
        overallErrorOccurred = true;
      }
      setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
    }

    setResults(resultsArray);

    // Call the callback with the processed results for history
    if (onClassificationComplete && historyItemsArray.length > 0) { // <<<< CALL THE CALLBACK
      onClassificationComplete(historyItemsArray);
    }

    files.forEach(({ url }) => URL.revokeObjectURL(url));
    setFiles([]);
    setClassifying(false);
    setUploadProgress(0);

    if (overallErrorOccurred) {
      setError(`Some ${instanceType}s could not be classified. Check results.`);
    } else if (resultsArray.length > 0) {
      setError(""); // Clear previous errors if current batch is successful
    }
  };

  return (
    <div className="w-full">
      {/* ... existing JSX for uploader UI ... */}
      {/* No changes needed in the JSX part for this functionality */}
       <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
          dragActive ? "border-blue-500 bg-blue-50/10" : "border-gray-600"
        }`}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
      >
        <input
          type="file" multiple className="hidden"
          accept={acceptMimeTypes}
          onChange={handleChange} ref={fileInputRef}
          aria-label={`Select ${instanceType} files`}
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
          >
            Select {instanceType === "image" ? "Images" : "Videos"}
          </button>
          {files.length > 0 && (
            <button
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors mt-4"
              onClick={handleUploadAndClassify}
              aria-label={`Upload and classify selected ${instanceType}s`}
              disabled={classifying}
            >
              {classifying ? `Classifying ${instanceType}s... (${uploadProgress}%)` : `Upload & Classify ${instanceType === "image" ? "Images" : "Videos"}`}
            </button>
          )}
          {uploadProgress > 0 && !classifying && ( // Show progress bar only if classifying
             <div className="w-full bg-gray-700 rounded-full mt-4">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
              <p className="text-sm text-gray-400 mt-1">{uploadProgress}%</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center gap-2">
          <AlertCircle className="text-red-500" /> <p className="text-red-500">{error}</p>
        </div>
      )}

      {files.length > 0 && !results && (
        <div className="mt-6 space-y-3 max-h-60 overflow-auto">
          <h4 className="font-semibold">Selected {instanceType === "image" ? "Images" : "Videos"}:</h4>
          {files.map(({ file, url }, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center gap-3 w-full">
                <FileCheck className="text-green-500 shrink-0" />
                {instanceType === "image" ? (
                  <img className="w-20 h-12 object-cover rounded shrink-0" src={url} alt={`Preview of ${file.name}`} />
                ): (
                  <video className="w-20 h-12 object-cover rounded shrink-0" src={url} controls />
                )}
                <div className="truncate w-full">
                  <span className="block truncate">{file.name}</span>
                  <span className="text-gray-400 text-sm block">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              </div>
              <button onClick={() => removeFile(index)} className="text-gray-400 hover:text-red-500 transition-colors" aria-label={`Remove file ${file.name}`}>
                <X size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      {classifying && !results && ( // Message while actively classifying
         <div className="mt-6 p-6 bg-yellow-500/10 border border-yellow-500 rounded-xl shadow-lg">
           <h4 className="text-2xl font-bold text-yellow-400 mb-4">Classifying {instanceType === "image" ? "Images" : "Videos"}...</h4>
           <p className="text-yellow-300">Please wait while the {instanceType}s are being processed. This may take a few moments depending on the file size and number of files.</p>
           {uploadProgress > 0 && ( // Show progress bar during classification here too
            <div className="w-full bg-gray-700 rounded-full mt-4">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
              <p className="text-sm text-gray-400 mt-1">{uploadProgress}% complete</p>
            </div>
          )}
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
                  r.result && String(r.result).startsWith("Error:")
                    ? "bg-red-500/20 border border-red-500"
                    : "bg-green-500/20 border border-green-500 hover:bg-green-400/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-base truncate pr-2 ${r.result && String(r.result).startsWith("Error:") ? "text-red-300" : "text-white"}`}>{r.name}</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      r.result && String(r.result).startsWith("Error:")
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
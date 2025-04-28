import React, { useState } from 'react';
import { Upload, X, FileCheck, AlertCircle } from 'lucide-react';
import { Client } from "@gradio/client";

function CrimeClassificationFileUpload({
  title = "Upload Crime Reports",
  description = "Drag and drop or click to select files",
  acceptedTypes = ".jpg,.jpeg,.png,.pdf,.doc,.docx",
  maxSize = 10
}) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [classifying, setClassifying] = useState(false);

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

    const fileType = file.name.split('.').pop()?.toLowerCase();
    const validTypes = acceptedTypes.split(',').map(type => type.replace('.', ''));

    if (!fileType || !validTypes.includes(fileType)) {
      setError(`Invalid file type. Accepted types: ${acceptedTypes}`);
      return false;
    }

    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError("");

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(validateFile);
    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleChange = (e) => {
    e.preventDefault();
    setError("");

    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(validateFile);
      setFiles(prev => [...prev, ...validFiles]);
      e.target.value = null; // Reset input
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    setUploadProgress(0);
    setError("");
    setResults(null);
    setClassifying(true);

    try {
      const client = await Client.connect("JonSnow1512/clip-model");
      const totalFiles = files.length;
      const resultsArray = [];

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const result = await client.predict("/predict", {
          image: file,
        });

        resultsArray.push({ name: file.name, result: result.data });
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }

      setResults(resultsArray);
      setFiles([]);
      setUploadProgress(0);
      setClassifying(false);
    } catch (error) {
      setError(`Upload failed: ${error.message}`);
      setUploadProgress(0);
      setResults(null);
      setClassifying(false);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
          dragActive ? 'border-blue-500 bg-blue-50/10' : 'border-gray-600'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
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
            Select Files
          </button>

          {files.length > 0 && (
            <button
              type="button"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors mt-4"
              onClick={handleUpload}
            >
              Upload Files
            </button>
          )}

          {uploadProgress > 0 && (
            <div className="w-full bg-gray-700 rounded-full mt-4">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <p className="text-sm text-gray-400 mt-1">{uploadProgress}%</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center gap-2">
          <AlertCircle className="text-red-500" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-6 space-y-3 max-h-60 overflow-auto">
          <h4 className="font-semibold">Selected Files:</h4>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-800 p-3 rounded-lg"
            >
              <div className="flex items-center gap-3 w-full">
                <FileCheck className="text-green-500 shrink-0" />
                {file.type.startsWith("image/") && (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-12 h-12 object-cover rounded shrink-0"
                  />
                )}
                <div className="truncate w-full">
                  <span className="block truncate">{file.name}</span>
                  <span className="text-gray-400 text-sm block">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
      {classifying && (
        <div className="mt-6 p-6 bg-yellow-500/10 border border-yellow-500 rounded-xl shadow-lg">
          <h4 className="text-2xl font-bold text-yellow-400 mb-4">Classifying...</h4>
        </div>
      )}
{results && (
  <div className="mt-6 p-6 bg-green-500/10 border border-green-500 rounded-xl shadow-lg">
    <h4 className="text-2xl font-bold text-green-400 mb-4">Classification Results:</h4>
    <div className="space-y-4">
      {results.map((r, index) => (
        <div
          key={index}
          className="p-4 bg-green-400/20 rounded-lg hover:bg-green-400/30 transition-colors text-white shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-base">{r.name}</span>
            <span className="px-4 py-2 rounded-full bg-green-500 text-white font-bold text-lg">
              {r.result}
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

export default CrimeClassificationFileUpload;

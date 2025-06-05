// src/components/CrimeClassificationFileUpload.jsx
import React from 'react';
import UploaderInstance from './UploaderInstance'; // Adjust path if necessary
import toast from 'react-hot-toast';

function CrimeClassificationFileUpload() {
  const imageModelApiUrl = "JonSnow1512/clip-model";
  // Updated to point to your local Flask video model server
  const videoModelApiUrl = "http://localhost:5001/predict_video";

  const handleSaveToHistory = async (historyItems) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error("User not authenticated. Cannot save to history.");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const item of historyItems) {
      try {
        const response = await fetch(`https://project-final-a377.onrender.com/api/auth/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(item)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Server error: ${response.status}` }));
          throw new Error(errorData.message || `Failed to save ${item.filename} to history.`);
        }
        successCount++;
      } catch (error) {
        console.error("Error saving item to history:", error);
        toast.error(`Could not save ${item.filename}: ${error.message}`);
        errorCount++;
      }
    }

    if (successCount > 0) {
        toast.success(`${successCount} item(s) saved to history successfully!`);
    }
    if (errorCount > 0 && successCount === 0) {
        toast.error(`Failed to save ${errorCount} item(s) to history.`);
    } else if (errorCount > 0) {
        toast.warn(`${errorCount} item(s) could not be saved to history. Check console for details.`);
    }
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-16">
         <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Crime Scene Evidence Analysis
        </h1>
        <p className="text-gray-400 mt-4 text-lg">
          Upload image and video evidence for automated classification.
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-16">
        <section className="bg-gray-800 p-8 rounded-2xl shadow-2xl lg:w-1/2 flex flex-col mb-12 lg:mb-0">
          <h2 className="text-2xl lg:text-3xl font-semibold mb-8 text-blue-300 border-b-2 border-blue-400 pb-3">
            Image Analysis
          </h2>
          <div className="flex-grow flex flex-col">
            <UploaderInstance
              instanceType="image"
              title="Upload Crime Scene Images"
              description="Select or drag image files (PNG, JPG, etc.)"
              maxSize={20}
              acceptMimeTypes="image/*"
              validationStartsWith="image/"
              gradioSpaceUrl={imageModelApiUrl}
              gradioApiName="/predict"
              onClassificationComplete={handleSaveToHistory}
            />
          </div>
        </section>

        <section className="bg-gray-800 p-8 rounded-2xl shadow-2xl lg:w-1/2 flex flex-col mb-12 lg:mb-0">
          <h2 className="text-2xl lg:text-3xl font-semibold mb-8 text-green-300 border-b-2 border-green-400 pb-3">
            Video Analysis
          </h2>
          <div className="flex-grow flex flex-col">
            <UploaderInstance
              instanceType="video"
              title="Upload Crime Scene Videos"
              description="Select or drag video files (MP4, AVI, etc.)"
              maxSize={100} // Consider adjusting if your local model has different constraints or processing time
              acceptMimeTypes="video/*"
              validationStartsWith="video/"
              gradioSpaceUrl={videoModelApiUrl} // This now points to your local server
              // gradioApiName is not strictly needed for the local fetch but kept for consistency if UploaderInstance uses it
              gradioApiName="/predict_video" // Or an empty string if the full path is in gradioSpaceUrl
              onClassificationComplete={handleSaveToHistory}
            />
          </div>
        </section>
      </div>

      <footer className="text-center mt-20 text-gray-500">
        <p>&copy; {new Date().getFullYear()} Crime Analysis Unit. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default CrimeClassificationFileUpload;
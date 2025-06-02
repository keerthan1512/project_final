// src/components/CrimeClassificationFileUpload.jsx
import React from 'react';
import UploaderInstance from './UploaderInstance'; // Adjust path if necessary
import toast from 'react-hot-toast'; // <<<< IMPORT TOAST

function CrimeClassificationFileUpload() {
  const imageModelApiUrl = "JonSnow1512/clip-model";
  const videoModelApiUrl = "https://shreyas27-video-class.hf.space";

  // Function to handle saving classification results to history
  const handleSaveToHistory = async (historyItems) => { // historyItems is an array
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error("User not authenticated. Cannot save to history.");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const item of historyItems) {
      try {
        // IMPORTANT: Replace 'https://project-final-a377.onrender.com/api/auth/history'
        // with your ACTUAL BACKEND ENDPOINT for SAVING a history item.
        // This likely needs to be a POST request.
        const response = await fetch(`https://project-final-a377.onrender.com/api/auth/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(item) // Send one item at a time
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Server error: ${response.status}` }));
          throw new Error(errorData.message || `Failed to save ${item.filename} to history.`);
        }
        // const savedItem = await response.json();
        // console.log('Saved to history:', savedItem);
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
        {/* ... header content ... */}
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
              onClassificationComplete={handleSaveToHistory} // <<<< PASS THE HANDLER
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
              maxSize={100}
              acceptMimeTypes="video/*"
              validationStartsWith="video/"
              gradioSpaceUrl={videoModelApiUrl}
              gradioApiName="/predict"
              onClassificationComplete={handleSaveToHistory} // <<<< PASS THE HANDLER
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
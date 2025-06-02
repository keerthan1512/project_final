import os
from flask import Flask, request, jsonify
from flask_cors import CORS # For handling Cross-Origin Resource Sharing
from transformers import AutoImageProcessor, AutoModelForVideoClassification
import torch
import av # PyAV library for video processing
import numpy as np
from werkzeug.utils import secure_filename # For handling filenames securely
import logging

# --- Configuration ---
UPLOAD_FOLDER = 'uploads_video_model' # Use a distinct upload folder
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'} # Define allowed video extensions
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- CORS Configuration ---
# Allow requests from your React frontend's origin.
# Replace "http://localhost:3000" with the actual origin of your React app if it's different (e.g., http://localhost:5173 for Vite)
# For development, allowing all origins "*" is often convenient, but be more restrictive for production.
CORS(app, resources={r"/predict_video": {"origins": ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"]}})
# Alternatively, for wide open during dev: CORS(app)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Model Loading ---
# Load the processor and model from Hugging Face
# Using trust_remote_code=True might be necessary for some custom models/processors
MODEL_NAME = "OPear/videomae-large-finetuned-UCF-Crime"
image_processor = None
model = None
device = None

try:
    logger.info(f"Loading image processor for {MODEL_NAME}...")
    image_processor = AutoImageProcessor.from_pretrained(MODEL_NAME, trust_remote_code=True)
    logger.info(f"Loading model {MODEL_NAME}...")
    model = AutoModelForVideoClassification.from_pretrained(MODEL_NAME, trust_remote_code=True)
    logger.info("Model and processor loaded successfully.")

    # If you have a GPU, move the model to GPU
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    logger.info(f"Model moved to {device}.")
except Exception as e:
    logger.error(f"Error loading model or processor: {e}", exc_info=True)
    # The application will still run but /predict_video will return an error.

def allowed_file(filename):
    """Checks if the uploaded file has an allowed extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_frames_from_video(video_path, num_frames=16, target_fps=None):
    """
    Extracts a specific number of frames, evenly spaced, from a video file.
    Tries to resample to a target FPS if specified, otherwise uses original FPS.
    """
    frames = []
    try:
        container = av.open(video_path)
        video_stream = container.streams.video[0]
        
        # Get total frames and original FPS
        total_frames_in_video = video_stream.frames
        original_fps = video_stream.average_rate # This is a Fraction (e.g., 30/1 or 29.97)
        if original_fps is None or original_fps.denominator == 0:
            original_fps = video_stream.guessed_rate # Fallback
        if original_fps is None or original_fps.denominator == 0:
            logger.warning("Could not determine original FPS. Assuming 25.")
            original_fps = 25.0 
        else:
            original_fps = float(original_fps)

        logger.info(f"Video properties: Total frames: {total_frames_in_video}, Original FPS: {original_fps:.2f}")

        if total_frames_in_video == 0: # If metadata is missing
            logger.warning("Total frames reported as 0. Attempting to decode frames directly.")
            decoded_count = 0
            temp_frames = []
            for frame in container.decode(video=0):
                temp_frames.append(frame.to_ndarray(format='rgb24'))
                decoded_count += 1
                if decoded_count >= num_frames * 5: # Heuristic: decode more frames than needed
                    break
            if not temp_frames:
                raise ValueError("Could not decode any frames from video (total_frames was 0).")
            
            # If we decoded frames, select num_frames from them
            if len(temp_frames) >= num_frames:
                indices = np.linspace(0, len(temp_frames) - 1, num_frames, dtype=int)
                frames = [temp_frames[i] for i in indices]
            else: # Fallback if still not enough
                frames = temp_frames
                logger.warning(f"Decoded only {len(frames)} frames, less than requested {num_frames}.")

        else: # Normal case with frame count
            # Determine indices of frames to capture
            indices = np.linspace(0, total_frames_in_video - 1, num_frames, dtype=int)
            
            frames_captured = 0
            current_frame_idx = 0
            
            # Iterate through frames and pick the ones at specified indices
            # This is more robust than seeking which can be inaccurate
            for frame_idx_target_ptr, frame_idx_target in enumerate(indices):
                for frame in container.decode(video=0): # Restart decoding for each target frame if necessary
                    if current_frame_idx == frame_idx_target:
                        frames.append(frame.to_ndarray(format='rgb24'))
                        frames_captured += 1
                        current_frame_idx +=1 # Move to next frame in video
                        break # Move to next target index
                    current_frame_idx +=1
                if frames_captured == num_frames:
                    break
                # Reset for next targeted frame index if seeking is not precise enough or stream ends
                if current_frame_idx >= total_frames_in_video and frames_captured < num_frames :
                    logger.warning(f"Reached end of stream but only captured {frames_captured}/{num_frames} frames. Restarting decode for remaining.")
                    container.seek(-1) # Rewind stream
                    current_frame_idx = 0


        container.close()

        if not frames:
             raise ValueError("No frames were extracted from the video.")

        # Pad if not enough frames were extracted
        if len(frames) < num_frames:
            logger.warning(f"Extracted {len(frames)} frames, less than requested {num_frames}. Padding with last frame.")
            padding_needed = num_frames - len(frames)
            if frames: # If there's at least one frame
                for _ in range(padding_needed):
                    frames.append(frames[-1])
            else: # If no frames at all, create black frames (or handle error differently)
                 raise ValueError(f"Could not extract any frames to pad up to {num_frames}.")


        logger.info(f"Successfully extracted and prepared {len(frames)} frames.")
        return frames

    except Exception as e:
        logger.error(f"Error extracting frames: {e}", exc_info=True)
        if 'container' in locals() and container:
            container.close()
        raise # Re-raise the exception to be caught by the route handler


@app.route('/')
def home():
    """Home route to check if the server is running."""
    return jsonify({"message": "VideoMAE Crime Detection Model Server is Running!",
                    "model_status": "Loaded" if model and image_processor else "Error loading model"}), 200

@app.route('/predict_video', methods=['POST'])
def predict_video_route():
    """Handles video upload, processing, and prediction."""
    if model is None or image_processor is None or device is None:
        logger.error("Model or processor not loaded properly.")
        return jsonify({"error": "Model not loaded. Check server logs."}), 500

    if 'video' not in request.files:
        logger.warning("No video file part in request.")
        return jsonify({"error": "No video file provided in 'video' part"}), 400

    file = request.files['video']
    if file.filename == '':
        logger.warning("No file selected in video part.")
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        video_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        try:
            file.save(video_path)
            logger.info(f"Video saved to {video_path}")

            # Extract frames from the video
            num_expected_frames = getattr(model.config, "num_frames", 16) # Default to 16 if not in config
            logger.info(f"Attempting to extract {num_expected_frames} frames...")
            video_frames = extract_frames_from_video(video_path, num_frames=num_expected_frames)

            logger.info("Processing frames with image_processor...")
            inputs = image_processor(video_frames, return_tensors="pt")
            inputs = {k: v.to(device) for k, v in inputs.items()}

            logger.info("Making prediction with the model...")
            with torch.no_grad():
                outputs = model(**inputs)
                logits = outputs.logits

            predicted_class_idx = logits.argmax(-1).item()
            predicted_class_label = model.config.id2label[predicted_class_idx]
            
            probabilities = torch.softmax(logits, dim=-1)[0] # Get probabilities for the first (and only) item in batch
            confidence = probabilities[predicted_class_idx].item()

            all_scores = {model.config.id2label[i]: prob.item() for i, prob in enumerate(probabilities)}

            logger.info(f"Prediction: {predicted_class_label}, Confidence: {confidence:.4f}")

            return jsonify({
                "prediction": predicted_class_label,
                "confidence": confidence,
                "all_scores": all_scores,
                "filename": filename
            }), 200

        except Exception as e:
            logger.error(f"Error during processing or prediction for {filename}: {e}", exc_info=True)
            return jsonify({"error": str(e), "filename": filename}), 500
        finally:
            # Clean up the uploaded file
            if os.path.exists(video_path):
                try:
                    os.remove(video_path)
                    logger.info(f"Cleaned up uploaded file: {video_path}")
                except Exception as e_remove:
                    logger.error(f"Error removing uploaded file {video_path}: {e_remove}")
    else:
        logger.warning(f"File type not allowed: {file.filename}")
        return jsonify({"error": "File type not allowed. Allowed types: " + ", ".join(ALLOWED_EXTENSIONS)}), 400


if __name__ == '__main__':
    # Make sure the port matches what your frontend expects (e.g., 5001)
    app.run(debug=True, port=5001, host='0.0.0.0') # host='0.0.0.0' makes it accessible on your network

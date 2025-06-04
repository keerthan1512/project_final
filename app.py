import os
from flask import Flask, request, jsonify
from flask_cors import CORS # For handling Cross-Origin Resource Sharing
from transformers import AutoImageProcessor, AutoModelForVideoClassification
import torch
import av # PyAV library for video processing
import numpy as np
from werkzeug.utils import secure_filename # For handling filenames securely
import logging
import socket # For getting local hostname/IP hint

# --- Essential Setup for Running on Any Laptop ---
# 1. Python Environment:
#    - Ensure Python 3.8+ is installed.
#    - Create a requirements.txt file with the following content:
#      """
#      flask
#      flask_cors
#      transformers
#      torch
#      av-py
#      numpy
#      werkzeug
#      """
#    - Install dependencies: pip install -r requirements.txt
#
# 2. FFmpeg (Crucial for video processing with PyAV):
#    - FFmpeg MUST be installed on the system and accessible in the PATH.
#    - Windows: Download from gyan.dev or ffmpeg.org, extract, add bin folder to PATH.
#    - macOS: brew install ffmpeg
#    - Linux: sudo apt update && sudo apt install ffmpeg (Debian/Ubuntu) or similar for other distros.
#
# 3. Model Download:
#    - The first time this script runs, it will download the VideoMAE model (can be large).
#    - An active internet connection is required for this initial download.
# ---

# --- Configuration ---
UPLOAD_FOLDER = 'uploads_video_model' # Use a distinct upload folder
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'} # Define allowed video extensions
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- CORS Configuration ---
# To make the API accessible from any device on your local network (e.g., your phone, another laptop
# accessing your React frontend that then calls this backend), allow all origins.
# For production, you'd restrict this to specific domains.
CORS(app)
# Previous more restrictive CORS:
# CORS(app, resources={r"/predict_video": {"origins": ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"]}})


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
    image_processor = AutoImageProcessor.from_pretrained(MODEL_NAME,token = "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", trust_remote_code=True)
    logger.info(f"Loading model {MODEL_NAME}...")
    model = AutoModelForVideoClassification.from_pretrained(MODEL_NAME,token="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", trust_remote_code=True)
    logger.info("Model and processor loaded successfully.")

    # If you have a GPU, move the model to GPU
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    logger.info(f"Model moved to {device}.")
except Exception as e:
    logger.error(f"Error loading model or processor: {e}", exc_info=True)
    logger.error("The application will still run, but the /predict_video endpoint will likely fail.")
    logger.error("Ensure you have an internet connection for the first download and sufficient disk space.")

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
    container = None # Initialize container to None for finally block
    try:
        container = av.open(video_path)
        video_stream = container.streams.video[0]

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
            logger.warning("Total frames reported as 0 from video metadata. Attempting to decode frames directly.")
            decoded_count = 0
            temp_frames = []
            # Try to decode a certain number of frames to estimate duration or get enough frames
            # This limit prevents extremely long processing for videos with bad metadata
            max_frames_to_decode_blindly = num_frames * 10 # Heuristic: decode more frames than needed
            for frame in container.decode(video=0):
                temp_frames.append(frame.to_ndarray(format='rgb24'))
                decoded_count += 1
                if decoded_count >= max_frames_to_decode_blindly:
                    logger.warning(f"Stopped decoding after {decoded_count} frames due to missing total_frames metadata.")
                    break
            if not temp_frames:
                raise ValueError("Could not decode any frames from video (total_frames metadata was 0 and direct decode failed).")

            if len(temp_frames) >= num_frames:
                indices = np.linspace(0, len(temp_frames) - 1, num_frames, dtype=int)
                frames = [temp_frames[i] for i in indices]
            else: # Fallback if still not enough
                frames = temp_frames # Take what we got
                logger.warning(f"Decoded only {len(frames)} frames, less than requested {num_frames} (total_frames was 0).")

        else: # Normal case with frame count from metadata
            indices = np.linspace(0, total_frames_in_video - 1, num_frames, dtype=int)
            
            frames_map = {} # Store frames by their index to avoid issues with non-monotonic pts
            # First pass: decode frames and store them by index
            # More robust to weird video seeking issues or non-sequential frame iteration for some codecs
            # This might be memory intensive for very long videos if num_frames is large, but typical for models.
            
            # Efficiently seek to near the target frames if possible, then decode.
            # However, simple iteration is often more robust than complex seeking logic with PyAV for varied files.
            
            # Let's try a more direct approach for indexed access if possible,
            # but iterate if seeking is problematic or not precise.
            # For simplicity and robustness across formats, iterating and picking is safer than seeking.
            
            current_frame_disk_idx = 0
            target_indices_set = set(indices) # For quick lookup
            
            # Restart decoding to iterate from the beginning
            container.seek(-1, stream=video_stream) # Rewind stream to the beginning

            for frame in container.decode(video_stream):
                if current_frame_disk_idx in target_indices_set:
                    frames_map[current_frame_disk_idx] = frame.to_ndarray(format='rgb24')
                current_frame_disk_idx += 1
                if len(frames_map) == len(target_indices_set): # Got all required frames
                    break
            
            # Assemble frames in the correct order
            for idx in indices:
                if idx in frames_map:
                    frames.append(frames_map[idx])
                else:
                    # This case should ideally not happen if total_frames_in_video was accurate
                    # and all target_indices_set were less than total_frames_in_video
                    logger.warning(f"Frame index {idx} was targeted but not found during decoding. This might indicate an issue with video metadata or seeking.")

        if not frames:
            raise ValueError("No frames were successfully extracted from the video.")

        # Pad if not enough frames were extracted
        if len(frames) < num_frames:
            logger.warning(f"Extracted {len(frames)} frames, less than requested {num_frames}. Padding with the last extracted frame.")
            padding_needed = num_frames - len(frames)
            if frames: # If there's at least one frame
                for _ in range(padding_needed):
                    frames.append(frames[-1]) # Pad with the last valid frame
            else: # If somehow no frames were extracted at all (should have been caught by previous check)
                raise ValueError(f"Could not extract any frames to pad up to {num_frames}.")


        logger.info(f"Successfully extracted and prepared {len(frames)} frames.")
        return frames

    except Exception as e:
        logger.error(f"Error extracting frames: {e}", exc_info=True)
        raise # Re-raise the exception to be caught by the route handler
    finally:
        if container:
            try:
                container.close()
            except Exception as e_close:
                logger.error(f"Error closing video container: {e_close}")


@app.route('/')
def home():
    """Home route to check if the server is running."""
    return jsonify({"message": "VideoMAE Crime Detection Model Server is Running!",
                    "model_status": "Loaded" if model and image_processor else "Error loading model"}), 200

@app.route('/predict_video', methods=['POST'])
def predict_video_route():
    """Handles video upload, processing, and prediction."""
    if model is None or image_processor is None or device is None:
        logger.error("Model or processor not loaded properly. Check server startup logs.")
        return jsonify({"error": "Model not loaded. Check server logs for details."}), 500

    if 'video' not in request.files:
        logger.warning("No video file part in request.")
        return jsonify({"error": "No video file provided in 'video' part"}), 400

    file = request.files['video']
    if file.filename == '':
        logger.warning("No file selected in video part.")
        return jsonify({"error": "No selected file"}), 400

    video_path = None # Initialize for finally block
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
            return jsonify({"error": str(e), "filename": filename if 'filename' in locals() else 'unknown'}), 500
        finally:
            # Clean up the uploaded file
            if video_path and os.path.exists(video_path):
                try:
                    os.remove(video_path)
                    logger.info(f"Cleaned up uploaded file: {video_path}")
                except Exception as e_remove:
                    logger.error(f"Error removing uploaded file {video_path}: {e_remove}")
    else:
        logger.warning(f"File type not allowed: {file.filename}")
        return jsonify({"error": "File type not allowed. Allowed types: " + ", ".join(ALLOWED_EXTENSIONS)}), 400


if __name__ == '__main__':
    # --- How to Access This Server ---
    # When you run this script, Flask will start a development server.
    # It will listen on all available network interfaces because of host='0.0.0.0'.
    # In your terminal, Flask will print messages like:
    #  * Running on all addresses.
    #  * Running on http://127.0.0.1:5001/
    #  * Running on http://<YOUR_LAPTOP_LOCAL_IP>:5001/  <-- USE THIS ONE from other devices
    #
    # To access from THE SAME LAPTOP: http://127.0.0.1:5001 or http://localhost:5001
    # To access from OTHER DEVICES ON THE SAME NETWORK (e.g., phone, another laptop):
    #   1. Find your server laptop's Local IP address (the one Flask shows, e.g., 192.168.1.10).
    #   2. On the other device, use: http://<YOUR_LAPTOP_LOCAL_IP>:5001
    #   3. Ensure your server laptop's firewall allows incoming connections on port 5001.
    #
    # Your local IP address can be found using:
    #   - Windows: ipconfig in Command Prompt (look for IPv4 Address).
    #   - macOS: System Settings > Network, or ifconfig in Terminal.
    #   - Linux: ip addr show or hostname -I in Terminal.
    #
    # A hint for your machine's primary hostname IP (might not always be the one for LAN access):
    try:
        hostname = socket.gethostname()
        local_ip_hint = socket.gethostbyname(hostname)
        logger.info(f"Hint: This machine's hostname is '{hostname}' and an associated IP might be '{local_ip_hint}'.")
        logger.info("However, rely on the IP address Flask reports as 'Running on http://<YOUR_LAPTOP_LOCAL_IP>:5001/' for network access.")
    except socket.gaierror:
        logger.warning("Could not determine hostname IP. Check Flask's output for the correct access URLs.")

    app.run(debug=True, port=5001, host='0.0.0.0')
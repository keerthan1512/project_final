from fastapi import FastAPI, File, UploadFile, Request
from fastapi.responses import StreamingResponse,JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
from datetime import datetime

# Assuming your AI logic is in a 'main.py' file with a 'CrimeSceneAnalyzer' class
from main import CrimeSceneAnalyzer 

app = FastAPI()

# Standard CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = CrimeSceneAnalyzer()

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        image_pil = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid or corrupted image file. Details: {str(e)}"}
        )

    # Your PDF generation now works perfectly and returns bytes
    pdf_bytes = analyzer.analyze_scene(image_pil)

    if not pdf_bytes:
        return JSONResponse(
            status_code=500,
            content={"error": "The AI model failed to generate a PDF report."}
        )
    
    # --- THIS IS THE FINAL FIX ---
    # Wrap the raw bytes in an in-memory file-like object
    pdf_stream = io.BytesIO(pdf_bytes)
    
    filename = f"CSR_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

    # Return the stream directly. StreamingResponse is optimized for this.
    return StreamingResponse(
        content=pdf_stream,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
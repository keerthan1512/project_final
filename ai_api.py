from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from main import CrimeSceneAnalyzer  # Your custom function
from fastapi.middleware.cors import CORSMiddleware
import tempfile

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For testing, allow everything
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


analyzer = CrimeSceneAnalyzer()
@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    # Save uploaded bytes to a temp file
    suffix = '.' + file.filename.split('.')[-1] if '.' in file.filename else ''
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    result = analyzer.analyze_scene(tmp_path)

    # Optionally delete temp file here or later

    return JSONResponse(content=result)
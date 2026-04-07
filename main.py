import torch
import os
import numpy as np
import traceback
import time
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
from ultralytics import YOLO
from google import genai
from fpdf import FPDF
from dotenv import load_dotenv

load_dotenv()

class CrimeSceneAnalyzer:
    def __init__(self):
        # Using YOLOv8x (the largest/most accurate model)
        self.yolo_model = YOLO('yolov8x.pt')

        # UPDATED MAP: Matches standard YOLO class names exactly
        self.EVIDENCE_MAP = {
            "handgun": {"type": "weapon", "priority": 1},
            "knife": {"type": "weapon", "priority": 1},
            "scissors": {"type": "weapon", "priority": 1},
            "cell phone": {"type": "electronic", "priority": 2},
            "laptop": {"type": "electronic", "priority": 2},
            "person": {"type": "person", "priority": 3},
            "suitcase": {"type": "clothing", "priority": 3},
            "handbag": {"type": "clothing", "priority": 3},
            "bottle": {"type": "container", "priority": 3}
        }

        self.colors = {
            "weapon": "#FF0000",      # Red
            "electronic": "#0000FF",  # Blue
            "person": "#800080",      # Purple
            "clothing": "#FFC0CB",    # Pink
            "default": "#FFFF00"      # Yellow
        }

        try:
            self.font = ImageFont.truetype("arial.ttf", 20)
        except:
            self.font = ImageFont.load_default()

        api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key) if api_key else None

    def analyze_scene(self, image_pil: Image.Image):
        try:
            # Lowered confidence to 0.2 to catch the gun in shadows
            detections = self._detect_objects(image_pil)
            evidence = self._classify_evidence(detections)

            visual_img = self._visualize_results(image_pil.copy(), evidence)
            
            report_text = self._generate_report(evidence) if evidence else "No evidence detected."

            pdf_bytes = self._generate_pdf(evidence, report_text, visual_img)

            return {
                "pdf_bytes": pdf_bytes,
                "evidence": evidence,
                "visualization": visual_img,
                "report": report_text
            }
        except Exception as e:
            traceback.print_exc()
            return {"error": str(e)}

    def _detect_objects(self, image):
        # Lowered conf to 0.2 and set iou to 0.5 for better sensitivity
        results = self.yolo_model(image, conf=0.2, iou=0.5, verbose=False)
        detections = []
        for r in results:
            for box in r.boxes:
                label = self.yolo_model.names[int(box.cls[0])]
                detections.append({
                    "label": label,
                    "score": float(box.conf[0]),
                    "box": box.xyxy[0].tolist()
                })
        return detections

    def _classify_evidence(self, detections):
        classified = []
        for d in detections:
            label_lower = d["label"].lower()
            match = None
            # Check for exact matches or partial strings
            for key in self.EVIDENCE_MAP:
                if key in label_lower or label_lower in key:
                    match = self.EVIDENCE_MAP[key]
                    break
            
            if match:
                classified.append({**d, **match})
        return sorted(classified, key=lambda x: x["priority"])

    def _generate_report(self, evidence):
        if not self.client: return "API Key missing."
        
        items = [f"{e['label']} ({e['type']})" for e in evidence]
        prompt = f"Act as a Forensic Tech. Summarize these findings in a professional report: {', '.join(items)}."
        
        try:
            # Use the 2026 preview endpoint
            response = self.client.models.generate_content(
                model="gemini-3-flash-preview", 
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"Narrative error: {str(e)}"

    def _visualize_results(self, image, evidence):
        draw = ImageDraw.Draw(image)
        for item in evidence:
            box = item["box"]
            color = self.colors.get(item["type"], self.colors["default"])
            
            # Thick box for visibility
            draw.rectangle(box, outline=color, width=8)
            
            # Label background for readability
            txt = f"{item['label'].upper()} ({item['score']:.0%})"
            draw.rectangle([box[0], box[1]-35, box[0]+280, box[1]], fill=color)
            draw.text((box[0]+10, box[1]-32), txt, fill="white", font=self.font)
        return image

    def _generate_pdf(self, evidence, report_text, visual_img):
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", "B", 16)
        pdf.cell(0, 10, "FORENSIC EVIDENCE REPORT", ln=True, align="C")
        pdf.ln(10)

        temp_fn = f"temp_csi_{time.time()}.jpg"
        visual_img.convert("RGB").save(temp_fn)
        pdf.image(temp_fn, x=10, w=190)
        os.remove(temp_fn)

        pdf.ln(10)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 10, "EVIDENCE CATALOG:", ln=True)
        pdf.set_font("Arial", "", 10)
        for e in evidence:
            pdf.cell(0, 7, f"- {e['label'].upper()} ({e['type']}) | Confidence: {e['score']:.2f}", ln=True)

        pdf.ln(10)
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 10, "AI ANALYSIS:", ln=True)
        pdf.set_font("Arial", "", 10)
        clean_txt = report_text.encode('latin-1', 'replace').decode('latin-1')
        pdf.multi_cell(0, 6, clean_txt)

        return pdf.output(dest='S').encode('latin-1')

# --- RUN ---
if __name__ == "__main__":
    analyzer = CrimeSceneAnalyzer()
    img_path = "crime_scene_2.jpg" 

    if os.path.exists(img_path):
        image = Image.open(img_path)
        res = analyzer.analyze_scene(image)
        
        if "error" in res:
            print(res["error"])
        else:
            with open("final_csi_report.pdf", "wb") as f:
                f.write(res["pdf_bytes"])
            print("Success! Gun should now be included in 'final_csi_report.pdf'")
            res["visualization"].show()
    else:
        print("Image not found.")
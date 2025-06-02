import torch
import requests
import google.generativeai as genai
from PIL import Image, ImageDraw, ImageFont
import matplotlib.pyplot as plt
from transformers import (
    DetrImageProcessor, DetrForObjectDetection,
    ViTImageProcessor, ViTForImageClassification,
    AutoModelForCausalLM, AutoTokenizer,
    pipeline
)
from ultralytics import YOLO
import cv2
import numpy as np
from datetime import datetime
from fpdf import FPDF
import os
import io


# ======================
# 1. INITIALIZATION 
# ======================
class CrimeSceneAnalyzer:
    def __init__(self):
        self.yolo_model = YOLO('yolov8x.pt')  # Automatically downloads if missing
        
        # Object Detection (DETR)
        self.detr_processor = DetrImageProcessor.from_pretrained("facebook/detr-resnet-50")
        self.detr_model = DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50")
        # Add these to your initialization:
        self.detr_model.config.auxiliary_loss = True  # Helps training
        self.detr_model.config.num_queries = 150  # Default is 100 (more object proposals)
        
        # Evidence Classification (ViT)
        self.vit_processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224')
        self.vit_model = ViTForImageClassification.from_pretrained('google/vit-base-patch16-224')
        
        # Report Generation (GPT-2 fine-tuned)
        # self.report_tokenizer = AutoTokenizer.from_pretrained("gpt2")
        # self.report_model = AutoModelForCausalLM.from_pretrained("gpt2")
        gemini_api_key = "AIzaSyAgtSMlji0S_2wRqhm9YERB2EDpAnOEvNM"
        if not gemini_api_key:
            print("⚠️ GEMINI_API_KEY environment variable not set. Report/Summary generation will be affected.")
            self.gemini_model = None
        else:
            genai.configure(api_key=gemini_api_key)
            # Choose the model best suited for report generation. 
            # gemini-1.5-flash is fast and cost-effective.
            # gemini-1.0-pro or gemini-1.5-pro for potentially more detailed/nuanced reports.
            self.gemini_model = genai.GenerativeModel('gemini-1.5-flash') 
        # Evidence Mapping
        self.EVIDENCE_MAP = {
            # Weapons
            "knife": {"type": "weapon", "priority": 1},
"gun": {"type": "weapon", "priority": 1},
"pistol": {"type": "weapon", "priority": 1},
"revolver": {"type": "weapon", "priority": 1},
"rifle": {"type": "weapon", "priority": 1},
"shotgun": {"type": "weapon", "priority": 1},
"sword": {"type": "weapon", "priority": 1},
"machete": {"type": "weapon", "priority": 1},
"brass knuckles": {"type": "weapon", "priority": 1},
"taser": {"type": "weapon", "priority": 1},
"pepper spray": {"type": "weapon", "priority": 1},
"crossbow": {"type": "weapon", "priority": 1},
"axe": {"type": "weapon", "priority": 1},
"hammer": {"type": "weapon", "priority": 1},
"scissors": {"type": "weapon", "priority": 1},
            
            # Electronics
            "phone": {"type": "electronic", "priority": 2},
"laptop": {"type": "electronic", "priority": 2},
"tablet": {"type": "electronic", "priority": 2},
"camera": {"type": "electronic", "priority": 2},
"usb": {"type": "electronic", "priority": 2},
"hard drive": {"type": "electronic", "priority": 2},
"sd card": {"type": "electronic", "priority": 2},
"dvr": {"type": "electronic", "priority": 2},
"router": {"type": "electronic", "priority": 2},
"sim card": {"type": "electronic", "priority": 2},
            # Biological
            "blood": {"type": "biological", "priority": 1},
"hair": {"type": "biological", "priority": 1},
"fingerprint": {"type": "biological", "priority": 1},
"dna": {"type": "biological", "priority": 1},
"saliva": {"type": "biological", "priority": 1},
"semen": {"type": "biological", "priority": 1},
"tissue": {"type": "biological", "priority": 1},
"bone": {"type": "biological", "priority": 1},
"tooth": {"type": "biological", "priority": 1},
            # Containers
            "bottle": {"type": "container", "priority": 3},
            "syringe": {"type": "container", "priority": 1},
"needle": {"type": "drug", "priority": 1},
"pill": {"type": "drug", "priority": 1},
"powder": {"type": "drug", "priority": 1},
"marijuana": {"type": "drug", "priority": 1},
"cocaine": {"type": "drug", "priority": 1},
"heroin": {"type": "drug", "priority": 1},
"meth": {"type": "drug", "priority": 1},
"pipe": {"type": "drug", "priority": 1},
"scale": {"type": "drug", "priority": 1},
            # Add more as needed
            "paper": {"type": "document", "priority": 2},
            "key": {"type": "tool", "priority": 2},
            "id": {"type": "document", "priority": 2},
"passport": {"type": "document", "priority": 2},
"license": {"type": "document", "priority": 2},
"credit card": {"type": "document", "priority": 2},
"money": {"type": "document", "priority": 2},
"note": {"type": "document", "priority": 2},
"letter": {"type": "document", "priority": 2},
"diary": {"type": "document", "priority": 2},
"map": {"type": "document", "priority": 2},
"blueprint": {"type": "document", "priority": 2},
"shoe": {"type": "clothing", "priority": 3},
"glove": {"type": "clothing", "priority": 3},
"mask": {"type": "clothing", "priority": 3},
"hat": {"type": "clothing", "priority": 3},
"jacket": {"type": "clothing", "priority": 3},
"backpack": {"type": "clothing", "priority": 3},
"watch": {"type": "clothing", "priority": 3},
"jewelry": {"type": "clothing", "priority": 3},
"eyeglasses": {"type": "clothing", "priority": 3},
"crowbar": {"type": "tool", "priority": 2},
"screwdriver": {"type": "tool", "priority": 2},
"wrench": {"type": "tool", "priority": 2},
"pliers": {"type": "tool", "priority": 2},
"lockpick": {"type": "tool", "priority": 2},
"shovel": {"type": "tool", "priority": 2},
"rope": {"type": "tool", "priority": 2},
"duct tape": {"type": "tool", "priority": 2},
"wire": {"type": "tool", "priority": 2},
"car": {"type": "vehicle", "priority": 3},
"bicycle": {"type": "vehicle", "priority": 3},
"motorcycle": {"type": "vehicle", "priority": 3},
"license plate": {"type": "vehicle", "priority": 2},
"key": {"type": "vehicle", "priority": 3},
            # People can be evidence in certain contexts
            "person": {"type": "person", "priority": 3}
        }
        # Visualization
        
        try:
            self.font = ImageFont.truetype("arial.ttf", 12)
        except:
            try:
                self.font = ImageFont.truetype("LiberationSans-Regular.ttf", 12)
            except:
                self.font = ImageFont.load_default()
        
        # Color scheme
        self.colors = {
            "weapon": "red",
            "electronic": "blue",
            "biological": "green",
            "drug":"orange",
            "person": "purple",
            "document":"black",
            "tool":"brown",
            "clothing":"pink",
            "vehicle":"gold",
            "default": "yellow"
        }

# ======================
# 2. CORE FUNCTIONALITY
# ======================
    def analyze_scene(self, image_pil: Image.Image): # <-- MODIFIED: Accept a PIL Image object
        try:
            # MODIFICATION: Image is now passed directly, so no need for _load_image
            # image = self._load_image(image_path_or_url)
            image = image_pil # Use the passed-in PIL image

            # Detection and classification (This part remains the same)
            detections = self._detect_objects(image)
            evidence = self._classify_evidence(image, detections)
            
            # Generate visualization (This part remains the same)
            # Ensure _visualize_results returns a PIL Image object
            visualization = self._visualize_results(image.copy(), evidence if evidence else detections)
            
            # Generate report text (This part remains the same)
            if evidence:
                report_text = self._generate_report(evidence, image.size)
            else:
                report_text = "No forensic evidence detected. Detected objects:\n" + \
                            "\n".join(f"- {d['label']} (confidence: {d['score']:.2f})" for d in detections)
            
            # --- MODIFICATION: Create PDF in-memory ---
            pdf_bytes = None
            if evidence or detections:
                # Call your new in-memory PDF generation function
                pdf_bytes = self._generate_pdf_report_in_memory( # <-- Call the new function
                    evidence=evidence or [],
                    report_text=report_text,
                    visualization_img=visualization
                    # No output_dir argument needed anymore
                )
            
            # --- MODIFICATION: Return PDF bytes directly ---
            # The FastAPI endpoint will now expect the raw PDF bytes.
            return pdf_bytes 
    
        except Exception as e:
            print(f"Analysis failed: {str(e)}")
            # Return None if analysis or PDF generation fails
            return None
# ======================
# 3. HELPER METHODS
# ======================
    def _load_image(self, source):
        if source.startswith(('http:', 'https:')):
            return Image.open(requests.get(source, stream=True).raw)
        return Image.open(source)

    def _detect_objects(self, image):
        # Convert PIL image to numpy array (required by YOLO)
        img_array = np.array(image)
        
        # Perform YOLO detection
        results = self.yolo_model(img_array)
        
        # Process results
        detections = []
        for result in results:
            for detection in result.boxes.data.tolist():
                x1, y1, x2, y2, confidence, class_id = detection
                label = self.yolo_model.names[int(class_id)]  # Get the class label from YOLO
                detections.append({
                    "label": label,
                    "score": confidence,
                    "box": [x1, y1, x2, y2]
                })
        
        # Debug output
        print(f"\nDetection results (showing >40% confidence):")
        for obj in detections:
            if obj["score"] > 0.4:
                print(f"- {obj['label']}: {obj['score']:.2f} at {[round(x,1) for x in obj['box']]}")

        return detections

    def _classify_evidence(self, image, detections):
        # Expanded evidence mapping
        EVIDENCE_MAP = {
            # Weapons
            "knife": {"type": "weapon", "priority": 1},
"gun": {"type": "weapon", "priority": 1},
"pistol": {"type": "weapon", "priority": 1},
"revolver": {"type": "weapon", "priority": 1},
"rifle": {"type": "weapon", "priority": 1},
"shotgun": {"type": "weapon", "priority": 1},
"sword": {"type": "weapon", "priority": 1},
"machete": {"type": "weapon", "priority": 1},
"brass knuckles": {"type": "weapon", "priority": 1},
"taser": {"type": "weapon", "priority": 1},
"pepper spray": {"type": "weapon", "priority": 1},
"crossbow": {"type": "weapon", "priority": 1},
"axe": {"type": "weapon", "priority": 1},
"hammer": {"type": "weapon", "priority": 1},
"scissors": {"type": "weapon", "priority": 1},
            
            # Electronics
            "phone": {"type": "electronic", "priority": 2},
"laptop": {"type": "electronic", "priority": 2},
"tablet": {"type": "electronic", "priority": 2},
"camera": {"type": "electronic", "priority": 2},
"usb": {"type": "electronic", "priority": 2},
"hard drive": {"type": "electronic", "priority": 2},
"sd card": {"type": "electronic", "priority": 2},
"dvr": {"type": "electronic", "priority": 2},
"router": {"type": "electronic", "priority": 2},
"sim card": {"type": "electronic", "priority": 2},
            # Biological
            "blood": {"type": "biological", "priority": 1},
"hair": {"type": "biological", "priority": 1},
"fingerprint": {"type": "biological", "priority": 1},
"dna": {"type": "biological", "priority": 1},
"saliva": {"type": "biological", "priority": 1},
"semen": {"type": "biological", "priority": 1},
"tissue": {"type": "biological", "priority": 1},
"bone": {"type": "biological", "priority": 1},
"tooth": {"type": "biological", "priority": 1},
            # Containers
            "bottle": {"type": "container", "priority": 3},
            "syringe": {"type": "container", "priority": 1},
"needle": {"type": "drug", "priority": 1},
"pill": {"type": "drug", "priority": 1},
"powder": {"type": "drug", "priority": 1},
"marijuana": {"type": "drug", "priority": 1},
"cocaine": {"type": "drug", "priority": 1},
"heroin": {"type": "drug", "priority": 1},
"meth": {"type": "drug", "priority": 1},
"pipe": {"type": "drug", "priority": 1},
"scale": {"type": "drug", "priority": 1},
            # Add more as needed
            "paper": {"type": "document", "priority": 2},
            "key": {"type": "tool", "priority": 2},
            "id": {"type": "document", "priority": 2},
"passport": {"type": "document", "priority": 2},
"license": {"type": "document", "priority": 2},
"credit card": {"type": "document", "priority": 2},
"money": {"type": "document", "priority": 2},
"note": {"type": "document", "priority": 2},
"letter": {"type": "document", "priority": 2},
"diary": {"type": "document", "priority": 2},
"map": {"type": "document", "priority": 2},
"blueprint": {"type": "document", "priority": 2},
"shoe": {"type": "clothing", "priority": 3},
"glove": {"type": "clothing", "priority": 3},
"mask": {"type": "clothing", "priority": 3},
"hat": {"type": "clothing", "priority": 3},
"jacket": {"type": "clothing", "priority": 3},
"backpack": {"type": "clothing", "priority": 3},
"watch": {"type": "clothing", "priority": 3},
"jewelry": {"type": "clothing", "priority": 3},
"eyeglasses": {"type": "clothing", "priority": 3},
"crowbar": {"type": "tool", "priority": 2},
"screwdriver": {"type": "tool", "priority": 2},
"wrench": {"type": "tool", "priority": 2},
"pliers": {"type": "tool", "priority": 2},
"lockpick": {"type": "tool", "priority": 2},
"shovel": {"type": "tool", "priority": 2},
"rope": {"type": "tool", "priority": 2},
"duct tape": {"type": "tool", "priority": 2},
"wire": {"type": "tool", "priority": 2},
"car": {"type": "vehicle", "priority": 3},
"bicycle": {"type": "vehicle", "priority": 3},
"motorcycle": {"type": "vehicle", "priority": 3},
"license plate": {"type": "vehicle", "priority": 2},
"key": {"type": "vehicle", "priority": 3},
            # People can be evidence in certain contexts
            "person": {"type": "person", "priority": 3}
        }

        evidence = []
        for obj in detections:
            obj_name = obj["label"].lower()
            
            # Check both exact matches and partial matches
            matched = False
            for key in EVIDENCE_MAP:
                if key in obj_name:  # Partial match (e.g. "knife" matches "knife block")
                    evidence.append({
                        **obj,
                        **EVIDENCE_MAP[key],
                        "exact_match": key == obj_name
                    })
                    matched = True
                    break
            
            # Debug unmatched objects
            if not matched and obj["score"] > 0.1:
                print(f"⚠️ Unclassified object: {obj_name} (score: {obj['score']:.2f})")

        return sorted(evidence, key=lambda x: (-x["priority"], -x["score"]))
    
    def _debug_visualization(self, image, detections):
        debug_img = image.copy()
        draw = ImageDraw.Draw(debug_img)
        
        for obj in detections:
            box = obj["box"]
            draw.rectangle(box, outline="red", width=3)
            label = f"{obj['label']} ({obj['score']:.2f})"
            draw.text((box[0], box[1]), label, fill="red")
        
        debug_img.show()
        return debug_img

    def _generate_report(self, evidence, image_size): # Renamed for clarity if you keep separate summary
        if not self.gemini_model:
            return "Report generation skipped: Gemini API key not configured."
        if not evidence:
            return "No evidence provided to generate a report."

        evidence_text = "\n".join(
            f"- Object: {e.get('label', 'Unknown')}\n  Type: {e.get('type', 'N/A').upper()}\n  Confidence: {e.get('score', 0):.0%}\n  Assessed Priority: {e.get('priority', 'N/A')}"
            for e in evidence
        )
        
        # You can add image_size or other context to the prompt if needed
        # image_context = f"The analysis was performed on an image of size: {image_size[0]}x{image_size[1]} pixels."

        prompt = f"""
        You are a professional detective providing a detailed forensic analysis report.
        Based *only* on the evidence items listed below, generate a plausible narrative of what could have happened at the scene.
        Structure your report clearly. Be objective and stick to the facts presented by the evidence.
        Do not invent evidence not listed.

        EVIDENCE FOUND:
        {evidence_text}

        ANALYSIS OF WHAT COULD HAVE HAPPENED:
        """
        
        try:
            print("Generating detailed report with Gemini...")
            response = self.gemini_model.generate_content(prompt)
            
            report_text = ""
            if response.parts:
                report_text = "".join(part.text for part in response.parts if hasattr(part, 'text'))
            elif response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                report_text = "".join(part.text for part in response.candidates[0].content.parts if hasattr(part, 'text'))
            
            if not report_text.strip():
                 return "Gemini generated an empty report for the provided evidence."
            
            # The prompt is already part of the generated text by Gemini,
            # so we usually don't need to prepend it. 
            # If Gemini's response *only* contains the analysis part, and not the "EVIDENCE FOUND" preamble,
            # then you might want to structure the final return differently.
            # For now, let's assume Gemini's response is the full text you need.
            return report_text

        except Exception as e:
            print(f"‼️ Error calling Gemini API for report generation: {str(e)}")
            return f"Detailed report generation failed due to an API error: {str(e)}"

    # Your other methods like analyze_scene, _generate_pdf_report_in_memory, 
    # _call_external_ai_model (if you implemented it), etc. will remain.
    # Ensure analyze_scene calls this updated _generate_report method.
    # Example:
    # async def analyze_scene(self, image_pil: Image.Image):
    #     # ... (code to get evidence from external AI API or local processing) ...
    #     if evidence:
    #         report_text_main = self._generate_report(evidence, image_pil.size) 
    #     else:
    #         report_text_main = "No significant evidence detected."
    #


    def _visualize_results(self, image, items):
        draw = ImageDraw.Draw(image)
        
        for item in items:
            box = item["box"]
            
            # Handle both evidence and raw detections
            if "type" in item:  # Evidence items
                color = self.colors.get(item["type"], self.colors["default"])
                label = f"{item['label']} ({item['score']:.0%})"
            else:  # Raw detections
                color = "gray"
                label = f"{item['label']} ({item['score']:.2f})"
            
            # Draw bounding box
            draw.rectangle(box, outline=color, width=3)
            
            # Calculate text size (modern method)
            try:
                # For newer Pillow versions
                bbox = draw.textbbox((0, 0), label, font=self.font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
            except AttributeError:
                # Fallback for older versions
                text_width, text_height = draw.textsize(label, font=self.font)
            
            # Draw label background
            draw.rectangle(
                [box[0], box[1], box[0] + text_width + 4, box[1] + text_height],
                fill=color
            )
            
            # Draw label text
            draw.text(
                (box[0] + 2, box[1]),
                label,
                fill="white",
                font=self.font
            )
        
        return image
    
    def _generate_pdf_report_in_memory(self, evidence, report_text, visualization_img):
        """
        Generates a professional PDF report entirely in memory and returns it as bytes.
        This version uses the modern fpdf2 library's direct byte output.
        """
        try:
            # Initialize PDF
            pdf = FPDF(format='A4', unit='mm')
            pdf.set_auto_page_break(auto=True, margin=15)
            pdf.add_page()
            
            # ===== 1. PROFESSIONAL HEADER =====
            logo_path = "SceneX_logo.png"
            if os.path.exists(logo_path):
                pdf.image(logo_path, x=10, y=8, w=25, h=25)
            
            pdf.set_font("Courier", 'B', 18)
            pdf.set_text_color(0, 51, 102)
            pdf.cell(0, 20, "OFFICIAL CRIME SCENE REPORT", ln=1, align='C')
            
            pdf.set_font("Courier", '', 12)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 6, f"Case Reference: CSR-{datetime.now().strftime('%Y%m%d-%H%M%S')}", ln=1)
            pdf.cell(0, 6, f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=1)
            pdf.ln(15)
            
            # ===== 2. VISUALIZATION SECTION (IN-MEMORY) =====
            img = visualization_img.convert('RGB')
            
            with io.BytesIO() as img_buffer:
                img.save(img_buffer, format="JPEG", quality=95)
                # .getvalue() is correct for getting bytes from the buffer
                pdf.image(img_buffer.getvalue(), x=12, y=pdf.get_y()+2, w=186, type='JPEG')
                
            pdf.ln(125)
            
            # ===== 3. EVIDENCE CATALOG =====
            if evidence:
                pdf.set_font("Courier", 'B', 14)
                pdf.set_fill_color(220, 230, 242)
                pdf.cell(0, 10, "EVIDENCE CATALOG", ln=1, fill=True)
                pdf.ln(5)
                
                pdf.set_font("Courier", 'B', 12)
                col_widths = [70, 40, 40, 40]
                headers = ["Item Description", "Evidence Type", "Confidence", "Priority"]
                for i, header in enumerate(headers):
                    pdf.cell(col_widths[i], 8, header, border=1, fill=True)
                pdf.ln()
                
                pdf.set_font("Courier", '', 10)
                row_fill = False
                for item in evidence:
                    pdf.set_fill_color(255, 255, 255) if row_fill else pdf.set_fill_color(240, 240, 240)
                    pdf.cell(col_widths[0], 8, item['label'], border=1, fill=True)
                    pdf.cell(col_widths[1], 8, item['type'].upper(), border=1, fill=True)
                    pdf.cell(col_widths[2], 8, f"{item['score']:.0%}", border=1, fill=True)
                    pdf.cell(col_widths[3], 8, str(item['priority']), border=1, ln=1, fill=True)
                    row_fill = not row_fill
                pdf.ln(10)
            else:
                pdf.set_font("Courier", 'B', 12)
                pdf.set_text_color(255, 0, 0)
                pdf.cell(0, 10, "NO FORENSIC EVIDENCE DETECTED", ln=1, align='C')
                pdf.set_text_color(0, 0, 0)
                pdf.ln(10)
            
            # ===== 4. ANALYSIS REPORT =====
            pdf.set_font("Courier", 'B', 14)
            pdf.set_text_color(0, 51, 102)
            pdf.cell(0, 10, "DIGITAL FORENSIC ANALYSIS", ln=1)
            pdf.set_draw_color(200, 200, 200)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(5)
            
            pdf.set_font("Courier", '', 12)
            # We must encode the report text to 'latin-1' to handle any special characters
            # that FPDF might not support in its default font. 'replace' will substitute any
            # unsupported characters.
            cleaned_report_text = report_text.encode('latin-1', 'replace').decode('latin-1')
            paragraphs = cleaned_report_text.split('\n')
            for para in paragraphs:
                if para.strip():
                    pdf.multi_cell(0, 6, para)
                    pdf.ln(3)
            
            # ===== 5. SECURITY FOOTER =====
            pdf.set_y(-20)
            pdf.set_font("Courier", 'I', 8)
            pdf.set_text_color(100, 100, 100)
            pdf.cell(0, 5, "CONFIDENTIAL - Law Enforcement Use Only", 0, 0, 'L')
            pdf.cell(0, 5, f"Page {pdf.page_no()}", 0, 0, 'R')
            
            # ===== 6. FINALIZE DOCUMENT =====
            print("✓ Professional report generated in-memory.")
            # The modern fpdf2 .output() method directly returns bytes.
            # This is the simplest and most robust way, avoiding all encoding errors.
            return pdf.output()

        except Exception as e:
            print(f"‼️ Critical PDF generation error: {str(e)}")
            traceback.print_exc()
            return None

    def _add_watermark(self, img):
        """Optional: Add watermark to visualization image"""
        try:
            draw = ImageDraw.Draw(img)
            font = ImageFont.load_default()
            text = f"SceneX Analysis {datetime.now().strftime('%Y-%m-%d')}"
            
            # Semi-transparent watermark
            for i in range(0, img.width, 200):
                for j in range(0, img.height, 200):
                    draw.text((i, j), text, fill=(200, 200, 200, 128), font=font)
            return img
        except:
            return img  # Return original if watermark fails
# ======================
# 4. EXAMPLE USAGE              
# ======================
# In your main execution block:
if __name__ == "__main__":
    analyzer = CrimeSceneAnalyzer()
    
    # Test with an image
    results = analyzer.analyze_scene("crime_scene_4.jpg")
    
    if results.get("error"):
        print(f"Error: {results['error']}")
    else:
        print("=== Results ===")
        if results["evidence"]:
            print("Evidence found:")
            for item in results["evidence"]:
                print(f"- {item['type']}: {item['label']} ({item['score']:.0%})")
        else:
            print("No evidence found")
        
        if results["pdf_path"]:
            print(f"\nPDF report saved to: {results['pdf_path']}")
        
        # Show visualization
        if results["visualization"]:
            results["visualization"].show()
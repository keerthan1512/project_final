import torch
import requests
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
        self.report_tokenizer = AutoTokenizer.from_pretrained("gpt2")
        self.report_model = AutoModelForCausalLM.from_pretrained("gpt2")
        
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
    def analyze_scene(self, image_path_or_url):
        try:
            image = self._load_image(image_path_or_url)
            
            # Detection and classification
            detections = self._detect_objects(image)
            evidence = self._classify_evidence(image, detections)
            
            # Generate visualization
            visualization = self._visualize_results(image.copy(), evidence if evidence else detections)
            
            # Generate report
            if evidence:
                report = self._generate_report(evidence, image.size)
            else:
                report = "No forensic evidence detected. Detected objects:\n" + \
                        "\n".join(f"- {d['label']} (confidence: {d['score']:.2f})" for d in detections)
            
            # Create PDF
            pdf_path = None
            if evidence or detections:
                pdf_path = self._save_pdf_report(
                    evidence or [],
                    report,
                    visualization,
                    "crime_reports"
                )
            
            return {
                "evidence": evidence or [],
                "report": report,
                "visualization": visualization,
                "pdf_path": pdf_path,
                "timestamp": datetime.now().isoformat()
            }
        
        except Exception as e:
            print(f"Analysis failed: {str(e)}")
            return {
                "error": str(e),
                "evidence": [],
                "report": "Analysis failed",
                "visualization": None,
                "pdf_path": None
            }
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

    def _generate_report(self, evidence, image_size):
        evidence_text = "\n".join(
            f"- {e['type'].upper()}: {e['label']} (Confidence: {e['score']:.0%})"
            for e in evidence
        )
        
        prompt = f"""CRIME SCENE ANALYSIS REPORT\n\nEVIDENCE FOUND:\n{evidence_text}\n\nANALYSIS:"""
        
        inputs = self.report_tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            outputs = self.report_model.generate(
                **inputs,
                max_length=500,
                temperature=0.7,
                do_sample=True
            )
        
        return self.report_tokenizer.decode(outputs[0], skip_special_tokens=True)

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
    
    def _save_pdf_report(self, evidence, report_text, visualization_img, output_dir="reports"):
        try:
            # Create output directory with proper permissions
            os.makedirs(output_dir, exist_ok=True)
            if not os.access(output_dir, os.W_OK):
                raise PermissionError(f"Cannot write to directory: {output_dir}")
            
            # Initialize PDF with metadata
            pdf = FPDF(format='A4', unit='mm')
            pdf.set_auto_page_break(auto=True, margin=15)
            pdf.add_page()
            
            # ===== 1. PROFESSIONAL HEADER =====
            # Add logo if exists
            logo_path = "SceneX_logo.png"
            if os.path.exists(logo_path):
                pdf.image(logo_path, x=10, y=8, w=25, h=25)  # Fixed aspect ratio
                
            # Main header
            pdf.set_font("Courier", 'B', 18)
            pdf.set_text_color(0, 51, 102)  # Dark blue
            pdf.cell(0, 20, "OFFICIAL CRIME SCENE REPORT", ln=1, align='C')
            
            # Case metadata with better spacing
            pdf.set_font("Courier", '', 10)
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 6, f"Case Reference: CSR-{datetime.now().strftime('%Y%m%d-%H%M%S')}", ln=1)
            pdf.cell(0, 6, f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=1)
            pdf.ln(12)  # Extra space after header
            
            # ===== 2. ENHANCED VISUALIZATION SECTION =====
            # Process image for optimal PDF display
            img = visualization_img.convert('RGB')  # Ensure RGB mode
            img = self._add_watermark(img)  # Optional watermark function
            
            # Save temp image with timestamp
            temp_img_path = os.path.join(output_dir, f"temp_vis_{datetime.now().strftime('%H%M%S')}.jpg")
            img.save(temp_img_path, quality=95, dpi=(300, 300))
            
            # Add to PDF with border and caption
            pdf.set_font("Courier", 'B', 12)
            pdf.cell(0, 8, "SCENE VISUALIZATION ANALYSIS", ln=1)
            pdf.set_draw_color(150, 150, 150)
            pdf.rect(10, pdf.get_y(), 190, 120)  # Border rectangle
            pdf.image(temp_img_path, x=12, y=pdf.get_y()+2, w=186)  # Image inside border
            pdf.ln(124)  # Space after image
            
            # ===== 3. EVIDENCE CATALOG =====
            if evidence:
                pdf.set_font("Courier", 'B', 14)
                pdf.set_fill_color(220, 230, 242)
                pdf.cell(0, 10, "EVIDENCE CATALOG", ln=1, fill=True)
                pdf.ln(5)
                
                # Table header
                pdf.set_font("Courier", 'B', 10)
                col_widths = [70, 40, 40, 40]
                headers = ["Item Description", "Evidence Type", "Confidence", "Priority"]
                for i, header in enumerate(headers):
                    pdf.cell(col_widths[i], 8, header, border=1, fill=True)
                pdf.ln()
                
                # Table content
                pdf.set_font("Courier", '', 9)
                for item in evidence:
                    pdf.cell(col_widths[0], 8, item['label'], border=1)
                    pdf.cell(col_widths[1], 8, item['type'].upper(), border=1)
                    pdf.cell(col_widths[2], 8, f"{item['score']:.0%}", border=1)
                    pdf.cell(col_widths[3], 8, str(item['priority']), border=1, ln=1)
                pdf.ln(10)
            else:
                pdf.set_font("Courier", 'B', 12)
                pdf.set_text_color(255, 0, 0)  # Red for emphasis
                pdf.cell(0, 10, "NO FORENSIC EVIDENCE DETECTED", ln=1, align='C')
                pdf.set_text_color(0, 0, 0)  # Reset color
                pdf.ln(10)
            
            # ===== 4. ANALYSIS REPORT =====
            pdf.set_font("Courier", 'B', 14)
            pdf.cell(0, 10, "DIGITAL FORENSIC ANALYSIS", ln=1)
            pdf.set_draw_color(200, 200, 200)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(5)
            
            # Format text with proper paragraphs
            pdf.set_font("Courier", '', 10)
            paragraphs = report_text.split('\n')
            for para in paragraphs:
                if para.strip():  # Skip empty lines
                    pdf.multi_cell(0, 6, para)
                    pdf.ln(3)
            
            # ===== 5. SECURITY FOOTER =====
            pdf.set_y(-20)
            pdf.set_font("Courier", 'I', 8)
            pdf.set_text_color(100, 100, 100)
            pdf.cell(0, 5, "CONFIDENTIAL - Law Enforcement Use Only", 0, 0, 'L')
            pdf.cell(0, 5, f"Page {pdf.page_no()}", 0, 0, 'R')
            
            # ===== 6. FINALIZE DOCUMENT =====
            filename = f"CSR_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            output_path = os.path.join(output_dir, filename)
            pdf.output(output_path)
            
            # Cleanup
            if os.path.exists(temp_img_path):
                os.remove(temp_img_path)
            
            print(f"✓ Professional report generated: {output_path}")
            return output_path
            
        except Exception as e:
            print(f"‼️ Critical PDF generation error: {str(e)}")
            if 'temp_img_path' in locals() and os.path.exists(temp_img_path):
                os.remove(temp_img_path)
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
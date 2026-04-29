import json
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import gemini_service as ai

load_dotenv()

app = FastAPI(title="WasteGuard AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://wasteguard-ai.vercel.app",
        "https://wasteguard-ai-theta.vercel.app"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load initial data (will use Firebase if enabled)
MOCK_DATA = {"stores": [], "ngos": []}
DATA_PATH = Path(__file__).parent.parent / "data" / "mock_stores.json"
if os.path.exists(DATA_PATH):
    with open(DATA_PATH) as f:
        MOCK_DATA = json.load(f)

# Firebase — optional, graceful fallback
try:
    from firebase_config import get_db
    _firebase_enabled = True
except Exception:
    _firebase_enabled = False

# ── Pydantic models ──────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str

class MessageRequest(BaseModel):
    store_name: str
    item_name: str
    quantity: float
    expiry_days: int
    ngo_name: str

class ReportRequest(BaseModel):
    store_id: int
    store_name: str
    issue_type: str
    description: str
    location: str
    photo_filename: str = ""

class SummarizeRequest(BaseModel):
    store_id: int

class MedicalAnalyzeRequest(BaseModel):
    medicine_name: str
    expiry_date: str
    quantity: str
    unit: str = "units"

class InsightsRequest(BaseModel):
    medicines: list[dict]

# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api/stores")
def get_stores():
    if _firebase_enabled:
        try:
            db = get_db()
            stores_docs = db.collection("stores").stream()
            ngos_docs = db.collection("ngos").stream()
            return {
                "stores": [d.to_dict() for d in stores_docs],
                "ngos": [d.to_dict() for d in ngos_docs]
            }
        except Exception as e:
            print(f"Firebase fetch failed: {e}")
    return MOCK_DATA

@app.post("/api/chat")
def chat(req: ChatRequest):
    # Fetch live store data for context if possible
    context_data = get_stores()
    response = ai.chat_with_context(req.message, context_data)
    return {"response": response}

@app.post("/api/generate-message")
def generate_message(req: MessageRequest):
    """Generate NGO message with AI first, fallback to rule-based generator"""
    try:
        # Try AI-powered message first
        msg = ai.generate_ngo_message(
            req.store_name, req.item_name, req.quantity, req.expiry_days, req.ngo_name
        )
        
        # Check if Gemini API returned an error
        if msg.startswith("ERROR"):
            raise Exception(msg)
        
        return {"message": msg, "method": "ai"}
    except Exception as e:
        # Fallback to rule-based message generator
        print(f"AI message generation failed: {str(e)}, using fallback")
        fallback_result = ai.generate_fallback_message(
            req.store_name, req.item_name, req.quantity, req.expiry_days, req.ngo_name
        )
        return {
            "message": fallback_result["message"],
            "method": "fallback",
            "urgency": fallback_result.get("urgency", "UNKNOWN")
        }

@app.post("/api/report")
def submit_report(req: ReportRequest):
    report = {
        "store_id": req.store_id,
        "store_name": req.store_name,
        "issue_type": req.issue_type,
        "description": req.description,
        "location": req.location,
        "photo_filename": req.photo_filename,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "open",
    }
    if _firebase_enabled:
        try:
            db = get_db()
            db.collection("citizen_reports").add(report)
        except Exception as e:
            print(f"Firebase write failed: {e}")
    return {"success": True, "report": report}

@app.get("/api/reports/{store_id}")
def get_reports(store_id: int):
    if _firebase_enabled:
        try:
            db = get_db()
            docs = db.collection("citizen_reports").where("store_id", "==", store_id).stream()
            return {"reports": [d.to_dict() for d in docs]}
        except Exception as e:
            print(f"Firebase read failed: {e}")
    # Fallback mock reports
    store = next((s for s in MOCK_DATA["stores"] if s["id"] == store_id), None)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    mock_reports = [
        {
            "store_id": store_id,
            "store_name": store["name"],
            "issue_type": "Spoiled stock",
            "description": "Rice bags found damaged and smelling bad near the back shelf.",
            "timestamp": "2025-01-10T09:30:00",
            "status": "open",
        },
        {
            "store_id": store_id,
            "store_name": store["name"],
            "issue_type": "Overstock not reported",
            "description": "Large quantity of wheat sitting for over 2 weeks, not redistributed.",
            "timestamp": "2025-01-12T14:00:00",
            "status": "open",
        },
    ] if store["complaints"] > 0 else []
    return {"reports": mock_reports}

@app.post("/api/summarize-reports")
def summarize_reports(req: SummarizeRequest):
    reports_data = get_reports(req.store_id)
    reports = reports_data["reports"]
    if not reports:
        return {"summary": "No complaints found for this store."}
    summary = ai.summarize_reports(reports)
    return {"summary": summary}

@app.post("/api/city-report")
def city_report():
    report = ai.generate_city_report(MOCK_DATA)
    return {"report": report}


@app.post("/api/medical-analyze")
def medical_analyze(req: MedicalAnalyzeRequest):
    result = ai.analyze_medical_waste(
        req.medicine_name, req.expiry_date, req.quantity, req.unit
    )
    return result


@app.post("/api/medical-insights")
def medical_insights(req: InsightsRequest):
    if not req.medicines:
        raise HTTPException(status_code=400, detail="No medicines provided")
    insight = ai.generate_waste_insights(req.medicines)
    return {"insight": insight}

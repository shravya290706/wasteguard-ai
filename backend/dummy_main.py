import json
import re
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import gemini_service as ai

app = FastAPI(title="WasteGuard AI API - Dummy Mode")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = Path(__file__).parent.parent / "data" / "mock_stores.json"
with open(DATA_PATH) as f:
    MOCK_DATA = json.load(f)

STORES = MOCK_DATA["stores"]
NGOS   = MOCK_DATA["ngos"]

# ── In-memory report store ────────────────────────────────────────────────────
_reports: list[dict] = []

# ── Pydantic models ───────────────────────────────────────────────────────────
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

# ── Helpers ───────────────────────────────────────────────────────────────────
def _risk(days: int) -> str:
    if days <= 3:  return "HIGH"
    if days <= 7:  return "MEDIUM"
    return "LOW"

def _high_risk_items():
    return [
        (s, item)
        for s in STORES
        for item in s["items"]
        if _risk(item["expiry_days"]) == "HIGH"
    ]

def _store_risk(store):
    levels = [_risk(i["expiry_days"]) for i in store["items"]]
    if "HIGH"   in levels: return "HIGH"
    if "MEDIUM" in levels: return "MEDIUM"
    return "LOW"

def _best_ngo():
    avail = [n for n in NGOS if n["availability"]]
    return max(avail, key=lambda n: n["reliability"]) if avail else NGOS[0]

# ── Smart chat engine ─────────────────────────────────────────────────────────
def _smart_chat(message: str) -> str:
    msg = message.lower()

    # ── store-specific queries ────────────────────────────────────────────────
    for store in STORES:
        sname = store["name"].lower()
        sid   = str(store["id"])
        if sname in msg or f"store {sid}" in msg or f"store #{sid}" in msg or store["zone"].lower() in msg:
            risk  = _store_risk(store)
            items = store["items"]
            hi    = [i for i in items if _risk(i["expiry_days"]) == "HIGH"]
            med   = [i for i in items if _risk(i["expiry_days"]) == "MEDIUM"]
            lines = [f"📦 **{store['name']}** — {store['zone']} | Overall Risk: **{risk}**\n"]
            for i in items:
                r = _risk(i["expiry_days"])
                icon = "🔴" if r=="HIGH" else "🟡" if r=="MEDIUM" else "🟢"
                lines.append(f"  {icon} {i['name']}: {i['quantity_kg']}kg, expires in {i['expiry_days']} days ({r})")
            lines.append(f"\n💬 Complaints: {store['complaints']}")
            lines.append(f"📋 Pattern: {store['past_waste_pattern']}")
            if hi:
                ngo = _best_ngo()
                lines.append(f"\n⚡ SUGGESTED ACTION: Contact {ngo['name']} immediately for {hi[0]['name']} ({hi[0]['quantity_kg']}kg expiring in {hi[0]['expiry_days']}d). Reliability: {ngo['reliability']}%.")
            elif med:
                lines.append(f"\n⚠️ Monitor {med[0]['name']} closely — expires in {med[0]['expiry_days']} days.")
            else:
                lines.append("\n✅ All items are within safe expiry range. No immediate action needed.")
            return "\n".join(lines)

    # ── highest / worst risk store ────────────────────────────────────────────
    if any(w in msg for w in ["highest risk", "worst", "most critical", "most urgent", "critical store"]):
        ranked = sorted(STORES, key=lambda s: min(i["expiry_days"] for i in s["items"]))
        s = ranked[0]
        worst_item = min(s["items"], key=lambda i: i["expiry_days"])
        return (
            f"🔴 **{s['name']}** is at highest risk right now.\n\n"
            f"Critical item: **{worst_item['name']}** — {worst_item['quantity_kg']}kg expiring in just **{worst_item['expiry_days']} day(s)**.\n"
            f"Zone: {s['zone']} | Complaints: {s['complaints']}\n"
            f"Pattern: {s['past_waste_pattern']}\n\n"
            f"⚡ Immediate redistribution recommended. Contact {_best_ngo()['name']} ({_best_ngo()['reliability']}% reliable)."
        )

    # ── NGO queries ───────────────────────────────────────────────────────────
    if any(w in msg for w in ["ngo", "redistribute", "redistribution", "pickup", "partner"]):
        avail = [n for n in NGOS if n["availability"]]
        lines = [f"🤝 **{len(avail)} NGOs available** for redistribution:\n"]
        for n in sorted(avail, key=lambda x: -x["reliability"]):
            lines.append(f"  ✅ {n['name']} — {n['location']} | {n['capacity_kg']}kg capacity | {n['reliability']}% reliable | {n['distance_km']}km away")
        unavail = [n for n in NGOS if not n["availability"]]
        if unavail:
            lines.append(f"\n⏸️ Currently unavailable: {', '.join(n['name'] for n in unavail)}")
        lines.append(f"\n💡 Best match: **{_best_ngo()['name']}** (highest reliability at {_best_ngo()['reliability']}%)")
        return "\n".join(lines)

    # ── summary / overview ────────────────────────────────────────────────────
    if any(w in msg for w in ["summary", "overview", "status", "all stores", "network", "report"]):
        high_stores  = [s for s in STORES if _store_risk(s) == "HIGH"]
        med_stores   = [s for s in STORES if _store_risk(s) == "MEDIUM"]
        total_hi_kg  = sum(i["quantity_kg"] for s, i in _high_risk_items())
        total_comp   = sum(s["complaints"] for s in STORES)
        return (
            f"📊 **Bengaluru PDS Network — Live Summary**\n\n"
            f"🏪 Total Stores: {len(STORES)}\n"
            f"🔴 HIGH Risk Stores: {len(high_stores)} ({', '.join(s['name'].replace('Store #','#') for s in high_stores)})\n"
            f"🟡 MEDIUM Risk Stores: {len(med_stores)}\n"
            f"🟢 LOW Risk Stores: {len(STORES)-len(high_stores)-len(med_stores)}\n"
            f"⚖️ Total kg at HIGH risk: {total_hi_kg}kg\n"
            f"💬 Total complaints: {total_comp}\n\n"
            f"⚡ Top priority: {sorted(STORES, key=lambda s: min(i['expiry_days'] for i in s['items']))[0]['name']}"
        )

    # ── expiry / expiring soon ────────────────────────────────────────────────
    if any(w in msg for w in ["expir", "today", "tomorrow", "urgent", "immediate"]):
        hi = _high_risk_items()
        if not hi:
            return "✅ No items expiring within 3 days across all stores. Network is in good shape!"
        lines = [f"🔴 **{len(hi)} HIGH RISK items** expiring within 3 days:\n"]
        for s, item in sorted(hi, key=lambda x: x[1]["expiry_days"]):
            lines.append(f"  • {item['name']} at {s['name']}: {item['quantity_kg']}kg — expires in **{item['expiry_days']}d**")
        lines.append(f"\n⚡ Recommended: Contact {_best_ngo()['name']} for emergency pickup.")
        return "\n".join(lines)

    # ── complaints ────────────────────────────────────────────────────────────
    if any(w in msg for w in ["complaint", "report", "citizen", "issue"]):
        top = sorted(STORES, key=lambda s: -s["complaints"])[:3]
        lines = ["💬 **Stores with most citizen complaints:**\n"]
        for s in top:
            lines.append(f"  • {s['name']}: {s['complaints']} complaint(s) — {s['past_waste_pattern']}")
        lines.append(f"\n📋 Total complaints across network: {sum(s['complaints'] for s in STORES)}")
        return "\n".join(lines)

    # ── rice / wheat / dal / sugar / oil specific ─────────────────────────────
    for commodity in ["rice", "wheat", "dal", "sugar", "oil"]:
        if commodity in msg:
            matches = [
                (s, item)
                for s in STORES
                for item in s["items"]
                if item["name"].lower() == commodity
            ]
            if matches:
                lines = [f"🌾 **{commodity.title()} across all stores:**\n"]
                for s, item in sorted(matches, key=lambda x: x[1]["expiry_days"]):
                    r = _risk(item["expiry_days"])
                    icon = "🔴" if r=="HIGH" else "🟡" if r=="MEDIUM" else "🟢"
                    lines.append(f"  {icon} {s['name']}: {item['quantity_kg']}kg — {item['expiry_days']}d left ({r})")
                total = sum(i["quantity_kg"] for _, i in matches)
                lines.append(f"\n📦 Total {commodity}: {total}kg across {len(matches)} stores")
                return "\n".join(lines)

    # ── what should I do / action ─────────────────────────────────────────────
    if any(w in msg for w in ["what should", "action", "recommend", "suggest", "plan", "do"]):
        hi = _high_risk_items()
        ngo = _best_ngo()
        lines = ["💡 **Recommended Actions — Right Now:**\n"]
        if hi:
            lines.append(f"1. 🔴 URGENT: Contact {ngo['name']} for emergency pickup of {len(hi)} high-risk items ({sum(i['quantity_kg'] for _,i in hi)}kg total)")
            lines.append(f"2. 📲 Send WhatsApp alerts to all available NGOs for items expiring today/tomorrow")
            lines.append(f"3. 📋 Schedule inspection at {sorted(STORES, key=lambda s:-s['complaints'])[0]['name']} — highest complaints")
            lines.append(f"4. 🔄 Review demand forecasting for stores with recurring waste patterns")
        else:
            lines.append("✅ No critical actions needed right now. All items are within safe expiry range.")
            lines.append("📊 Continue monitoring medium-risk items and maintain NGO partnerships.")
        return "\n".join(lines)

    # ── zone queries ──────────────────────────────────────────────────────────
    for zone in ["zone a", "zone b", "zone c", "zone d", "zone e"]:
        if zone in msg:
            zone_stores = [s for s in STORES if s["zone"].lower() == zone]
            lines = [f"🗺️ **{zone.upper()} — {len(zone_stores)} stores:**\n"]
            for s in zone_stores:
                r = _store_risk(s)
                icon = "🔴" if r=="HIGH" else "🟡" if r=="MEDIUM" else "🟢"
                lines.append(f"  {icon} {s['name']}: {r} risk | {s['complaints']} complaints")
            return "\n".join(lines)

    # ── about / what is wasteguard ────────────────────────────────────────────
    if any(w in msg for w in ["what is", "about", "wasteguard", "pds", "system", "how"]):
        return (
            "🌿 **WasteGuard AI** is an AI-powered food waste reduction system for India's Public Distribution System (PDS).\n\n"
            "**What it does:**\n"
            "• 📦 Monitors inventory across 10 Bengaluru ration shops in real-time\n"
            "• 🔴 Flags HIGH/MEDIUM/LOW risk items based on expiry dates\n"
            "• 🤖 Provides AI-driven redistribution recommendations\n"
            "• ✉️ Auto-generates NGO alert messages for urgent pickups\n"
            "• 📱 Accepts citizen reports on food waste issues\n"
            "• 🏛️ Generates district officer reports\n"
            "• 🏥 Analyzes medical waste disposal\n\n"
            f"**Current network:** {len(STORES)} stores, {len(NGOS)} NGO partners, 5 zones across Bengaluru."
        )

    # ── default fallback ──────────────────────────────────────────────────────
    hi = _high_risk_items()
    ngo = _best_ngo()
    return (
        f"🤖 **WasteGuard AI — Network Status**\n\n"
        f"I can help you with:\n"
        f"• Store-specific inventory (e.g. 'Show Store 7' or 'Yelahanka status')\n"
        f"• Risk analysis (e.g. 'Which store is at highest risk?')\n"
        f"• NGO redistribution (e.g. 'Which NGOs are available?')\n"
        f"• Commodity tracking (e.g. 'How much rice is expiring?')\n"
        f"• Action plans (e.g. 'What should I do right now?')\n\n"
        f"📊 Quick snapshot: {len(hi)} HIGH-risk items across network. "
        f"Best NGO contact: **{ngo['name']}** ({ngo['reliability']}% reliable)."
    )

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/stores")
def get_stores():
    return MOCK_DATA

@app.post("/api/chat")
def chat(req: ChatRequest):
    # Pass MOCK_DATA as context to match the "dummy" mode's expectations
    return {"response": ai.chat_with_context(req.message, MOCK_DATA)}

@app.post("/api/generate-message")
def generate_message(req: MessageRequest):
    urgency = "CRITICAL" if req.expiry_days <= 3 else "HIGH" if req.expiry_days <= 7 else "PLANNED"
    icon    = "🔴" if urgency == "CRITICAL" else "🟡" if urgency == "HIGH" else "🟢"
    msg = (
        f"{icon} {urgency} REDISTRIBUTION REQUEST\n\n"
        f"Dear {req.ngo_name} Coordinator,\n\n"
        f"We have {'an urgent' if urgency != 'PLANNED' else 'a'} redistribution request from {req.store_name}:\n\n"
        f"📦 Item: {req.item_name}\n"
        f"📊 Quantity: {req.quantity}kg\n"
        f"⏰ Expires in: {req.expiry_days} day{'s' if req.expiry_days != 1 else ''}\n"
        f"📍 Location: {req.store_name}, Bengaluru\n\n"
        f"{'⚡ IMMEDIATE pickup required — stock will be wasted without your help!' if urgency == 'CRITICAL' else 'Please confirm pickup within 24 hours.' if urgency == 'HIGH' else 'Please schedule at your convenience.'}\n\n"
        f"Thank you for your partnership in reducing food waste.\n\n"
        f"— WasteGuard AI System | Bengaluru PDS Network"
    )
    return {"message": msg, "method": "dummy", "urgency": urgency}

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
    _reports.append(report)
    return {"success": True, "report": report}

@app.get("/api/reports/{store_id}")
def get_reports(store_id: int):
    store = next((s for s in STORES if s["id"] == store_id), None)
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    saved = [r for r in _reports if r["store_id"] == store_id]
    if saved:
        return {"reports": saved}
    if store["complaints"] == 0:
        return {"reports": []}
    return {"reports": [
        {"store_id": store_id, "store_name": store["name"], "issue_type": "Spoiled stock",
         "description": "Rice bags found damaged near the back shelf.", "timestamp": "2025-01-10T09:30:00", "status": "open"},
        {"store_id": store_id, "store_name": store["name"], "issue_type": "Overstock not reported",
         "description": "Large quantity of wheat sitting for over 2 weeks, not redistributed.", "timestamp": "2025-01-12T14:00:00", "status": "open"},
    ]}

@app.post("/api/summarize-reports")
def summarize_reports(req: SummarizeRequest):
    store = next((s for s in STORES if s["id"] == req.store_id), None)
    if not store:
        return {"summary": "Store not found."}
    reports = get_reports(req.store_id)["reports"]
    if not reports:
        return {"summary": f"No complaints on record for {store['name']}. Store appears to be well-managed."}
    issue_types = [r["issue_type"] for r in reports]
    most_common = max(set(issue_types), key=issue_types.count)
    risk = _store_risk(store)
    return {"summary": (
        f"📋 AI Analysis for {store['name']}\n\n"
        f"SEVERITY: {'HIGH' if store['complaints'] > 5 else 'MEDIUM' if store['complaints'] > 2 else 'LOW'}\n\n"
        f"SUMMARY: {len(reports)} complaint(s) recorded. Most common issue: '{most_common}'. "
        f"Store has {store['complaints']} total complaints and is currently at {risk} inventory risk.\n\n"
        f"PATTERN: {store['past_waste_pattern']}\n\n"
        f"ACTION: {'Immediate inspection and redistribution required.' if risk == 'HIGH' else 'Schedule a routine inspection within 48 hours.' if risk == 'MEDIUM' else 'Continue monitoring. No urgent action needed.'}"
    )}

@app.post("/api/city-report")
def city_report():
    high_stores = [s for s in STORES if _store_risk(s) == "HIGH"]
    med_stores  = [s for s in STORES if _store_risk(s) == "MEDIUM"]
    hi_items    = _high_risk_items()
    total_hi_kg = sum(i["quantity_kg"] for _, i in hi_items)
    total_comp  = sum(s["complaints"] for s in STORES)
    worst       = sorted(STORES, key=lambda s: min(i["expiry_days"] for i in s["items"]))[0]
    ngo         = _best_ngo()

    report = f"""WASTEGUARD AI — DISTRICT OFFICER REPORT
Bengaluru PDS Network | Generated: {datetime.now().strftime('%d %b %Y, %I:%M %p')}
{'='*60}

EXECUTIVE SUMMARY
-----------------
Total stores monitored : {len(STORES)}
HIGH risk stores       : {len(high_stores)}
MEDIUM risk stores     : {len(med_stores)}
Total kg at HIGH risk  : {total_hi_kg} kg
Total citizen complaints: {total_comp}

CRITICAL STORES (Immediate Action Required)
--------------------------------------------
{chr(10).join(f"• {s['name']} ({s['zone']}) — {min(i['expiry_days'] for i in s['items'])}d to earliest expiry | {s['complaints']} complaints" for s in high_stores) or "None — all stores within safe range."}

TOP PRIORITY: {worst['name']}
Reason: {worst['past_waste_pattern']}

HIGH-RISK ITEMS BREAKDOWN
--------------------------
{chr(10).join(f"• {item['name']} at {s['name']}: {item['quantity_kg']}kg — expires in {item['expiry_days']}d" for s, item in sorted(hi_items, key=lambda x: x[1]['expiry_days'])) or "No high-risk items."}

REDISTRIBUTION PLAN
--------------------
Recommended NGO: {ngo['name']} ({ngo['reliability']}% reliability, {ngo['capacity_kg']}kg capacity)
Action: Deploy emergency pickup for all HIGH-risk items within 24 hours.
Backup NGOs: {', '.join(n['name'] for n in NGOS if n['availability'] and n['name'] != ngo['name'])[:3]}

ZONE-WISE RISK SUMMARY
-----------------------
{chr(10).join(f"• {zone}: {sum(1 for s in STORES if s['zone']==zone and _store_risk(s)=='HIGH')} HIGH / {sum(1 for s in STORES if s['zone']==zone)} total stores" for zone in sorted(set(s['zone'] for s in STORES)))}

KEY RECOMMENDATIONS
--------------------
1. Immediate redistribution of {total_hi_kg}kg at-risk food to partner NGOs
2. Investigate chronic waste patterns at {worst['name']}
3. Review demand forecasting for stores with recurring overstock
4. Increase inspection frequency for stores with >5 complaints
5. Activate all {len([n for n in NGOS if n['availability']])} available NGO partners for emergency response

— WasteGuard AI | Bengaluru PDS Intelligence System
"""
    return {"report": report}

@app.post("/api/medical-analyze")
def medical_analyze(req: MedicalAnalyzeRequest):
    today = datetime.now().date()
    try:
        exp_date = datetime.strptime(req.expiry_date, "%Y-%m-%d").date()
        days_left = (exp_date - today).days
    except Exception:
        days_left = 0

    qty = int(req.quantity) if str(req.quantity).isdigit() else 0

    if days_left < 0:
        risk_level  = "High"
        risk_reason = f"{req.medicine_name} expired {abs(days_left)} days ago. Immediate disposal required."
        disposal    = "Incineration at authorized biomedical waste facility"
        steps = [
            "Do NOT use or distribute this medicine",
            "Seal in a red-coded biomedical waste bag",
            "Label with medicine name, quantity, and date",
            "Contact nearest authorized biomedical waste collector",
            "Obtain disposal certificate for records",
        ]
        precautions = "Do not flush, burn at home, or dispose in regular trash. Risk of environmental contamination."
    elif days_left <= 30:
        risk_level  = "High"
        risk_reason = f"{req.medicine_name} expires in {days_left} days. Urgent action needed to prevent waste."
        disposal    = "Return to manufacturer or authorized collection point"
        steps = [
            "Segregate from active stock immediately",
            "Check if manufacturer has a take-back program",
            "Contact district drug inspector if quantity > 50 units",
            "Store in cool, dry place until disposal",
            "Document in waste register",
        ]
        precautions = "Keep away from patients. Do not redistribute. Maintain cold chain if required."
    elif days_left <= 90:
        risk_level  = "Medium"
        risk_reason = f"{req.medicine_name} expires in {days_left} days. Plan redistribution or return."
        disposal    = "Prioritize for redistribution to high-demand facilities"
        steps = [
            "Flag for priority distribution in next supply cycle",
            "Check nearby health centers for demand",
            "Coordinate with district health officer for transfer",
            "Update inventory management system",
            "Monitor weekly until distributed or disposed",
        ]
        precautions = "Ensure cold chain compliance during transfer. Verify storage conditions."
    else:
        risk_level  = "Low"
        risk_reason = f"{req.medicine_name} has {days_left} days remaining. No immediate action needed."
        disposal    = "Standard stock rotation — use before newer stock"
        steps = [
            "Apply FIFO (First In, First Out) principle",
            "Ensure proper storage conditions are maintained",
            "Schedule next review at 90-day mark",
            "Update inventory records",
        ]
        precautions = "Maintain proper storage temperature and humidity. Keep away from direct sunlight."

    suggestions = [
        f"{'Reduce' if qty > 50 else 'Maintain'} procurement quantity for {req.medicine_name} based on consumption patterns.",
        "Implement digital expiry tracking to prevent future waste.",
        f"{'Consider donating to rural health camps before expiry.' if days_left > 7 else 'Immediate disposal — do not donate expired medicine.'}",
    ]

    return {
        "risk_level": risk_level,
        "risk_reason": risk_reason,
        "disposal_method": disposal,
        "disposal_steps": steps,
        "precautions": precautions,
        "environmental_impact": "High — improper disposal contaminates soil and water" if risk_level == "High" else "Medium — follow Bio-Medical Waste Rules 2016",
        "env_severity": risk_level,
        "suggestions": suggestions,
        "regulatory_note": "As per Bio-Medical Waste Management Rules 2016 (India), expired medicines must be disposed through authorized biomedical waste treatment facilities.",
    }

@app.post("/api/medical-insights")
def medical_insights(req: InsightsRequest):
    if not req.medicines:
        raise HTTPException(status_code=400, detail="No medicines provided")
    high   = [m for m in req.medicines if m.get("risk_level") == "High"]
    medium = [m for m in req.medicines if m.get("risk_level") == "Medium"]
    return {"insight": (
        f"PATTERN: {len(high)} high-risk and {len(medium)} medium-risk medicines detected out of {len(req.medicines)} analyzed.\n\n"
        f"RISK: {'Critical — immediate disposal action required for expired/near-expiry stock.' if high else 'Moderate — plan redistribution for medium-risk items.'}\n\n"
        f"RECOMMENDATION: {'Initiate emergency disposal protocol for high-risk items. Contact authorized biomedical waste collector.' if high else 'Schedule redistribution within 30 days for medium-risk items.'}\n\n"
        f"ENVIRONMENTAL IMPACT: {'High — improper disposal of expired medicines poses serious contamination risk.' if high else 'Moderate — follow standard Bio-Medical Waste Rules 2016 guidelines.'}"
    )}

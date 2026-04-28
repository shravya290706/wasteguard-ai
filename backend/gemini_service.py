import os
import re
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Create Gemini client ONCE
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """You are WasteGuard AI, the official intelligent assistant for India's Public Distribution System (PDS) in Bengaluru.
You are directly connected to the live dashboard data. Your mission is to help users understand inventory risks, analyze waste patterns, and coordinate with NGOs.

GUIDELINES:
1. **Source of Truth**: Always use the 'Context' (Store Data) provided. This matches exactly what the user sees on their dashboard.
2. **Specifics**: If a user asks about a specific store or item, look it up in the data and provide exact numbers.
3. **Structured Responses**: For risk assessments, use these headers:
   - RISK LEVEL: (High/Medium/Low)
   - REASON: (Why it's a risk)
   - SUGGESTED ACTIONS: (What to do now)
   - REDISTRIBUTION MESSAGE: (A draft message for NGOs)
4. **Natural Chat**: For general questions, just answer naturally but keep it professional and data-driven.
"""

def _sanitize(text: str) -> str:
    return re.sub(r'<[^>]+>', '', str(text)).strip()

# ===========================
# GEMINI CORE FUNCTION
# ===========================
def _ask_gemini(prompt: str) -> str:
    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite-preview",
            contents=prompt
        )
        return response.text
    except Exception as e:
        return f"ERROR: Gemini API failed -> {str(e)}"

# ===========================
# CHAT SYSTEM
# ===========================
def chat_with_context(message: str, store_data: dict) -> str:
    safe_msg = _sanitize(message)

    prompt = f"""
    {SYSTEM_PROMPT}

    CONTEXT (Live Dashboard Data):
    {json.dumps(store_data)}

    USER QUESTION:
    {safe_msg}

    INSTRUCTIONS:
    Answer based on the Context. Use specific quantities and dates. 
    Use the structured headers (RISK LEVEL, etc.) ONLY if identifying a specific risk.
    """

    return _ask_gemini(prompt)

# ===========================
# NGO MESSAGE
# ===========================
def generate_ngo_message(store_name, item_name, quantity, expiry_days, ngo_name):
    prompt = f"""
    Generate a short professional WhatsApp message.

    Store: {store_name}
    Item: {item_name}
    Quantity: {quantity}kg
    Expiry: {expiry_days} days
    NGO: {ngo_name}

    Keep it urgent, polite, under 80 words.
    """

    return _ask_gemini(prompt)

# ===========================
# COMPLAINT ANALYSIS
# ===========================
def summarize_reports(complaints):
    prompt = f"""
    Analyze complaints:

    {complaints}

    Give:
    SEVERITY
    SUMMARY
    ACTION
    """

    return _ask_gemini(prompt)

# ===========================
# MEDICAL WASTE ANALYSIS
# ===========================
def analyze_medical_waste(medicine_name, expiry_date, quantity, unit):
    prompt = f"""
    You are a medical waste expert in India.

    Medicine: {medicine_name}
    Expiry: {expiry_date}
    Quantity: {quantity} {unit}

    Return ONLY JSON:

    {{
      "risk_level": "",
      "risk_reason": "",
      "disposal_method": "",
      "disposal_steps": [],
      "precautions": "",
      "environmental_impact": "",
      "env_severity": "",
      "suggestions": [],
      "regulatory_note": ""
    }}
    """

    raw = _ask_gemini(prompt)

    try:
        cleaned = re.sub(r'^```[\w]*\n?|\n?```$', '', raw.strip())
        return json.loads(cleaned)
    except:
        return {
            "error": "Gemini returned invalid JSON",
            "raw_response": raw
        }

# ===========================
# BATCH INSIGHTS
# ===========================
def generate_waste_insights(medicines):
    prompt = f"""
    Analyze medicine waste patterns:

    {medicines}

    Give:
    PATTERN
    RISK
    RECOMMENDATION
    ENVIRONMENTAL IMPACT
    """

    return _ask_gemini(prompt)

# ===========================
# CITY REPORT
# ===========================
def generate_city_report(all_store_data):
    prompt = f"""
    Analyze city-wide waste:

    {json.dumps(all_store_data)}

    Provide:
    - Critical stores
    - Risk summary
    - Redistribution plan
    - Key insight
    """

    return _ask_gemini(prompt)
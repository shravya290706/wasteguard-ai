from flask import Flask, render_template, request
import google.generativeai as genai

app = Flask(__name__)

# ── Replace with your actual Gemini API key ──────────────────────────────────
GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

def get_risk_level(expiry_days):
    if expiry_days <= 3:
        return "HIGH"
    elif expiry_days <= 7:
        return "MEDIUM"
    else:
        return "LOW"

def ask_gemini(product_name, quantity, expiry_days, location, risk_level):
    prompt = f"""
You are a food waste reduction assistant.

Product Details:
- Product Name: {product_name}
- Quantity: {quantity}
- Expiry Days Remaining: {expiry_days}
- Location: {location}
- Risk Level: {risk_level}

Please provide the following in clearly labeled sections:

1. RISK EXPLANATION:
Why is this product at {risk_level} risk of being wasted? (2-3 sentences)

2. SUGGESTED ACTIONS:
What actions should be taken immediately to reduce waste? (3 bullet points)

3. REDISTRIBUTION MESSAGE:
Write a short, friendly message (3-4 sentences) that can be sent to a nearby NGO or store
to offer this product for redistribution before it expires.

Keep the response clear, practical, and concise.
"""
    try:
        response = model.generate_content(prompt)
        return parse_gemini_response(response.text)
    except Exception as e:
        return {
            "explanation": f"Gemini API error: {str(e)}",
            "actions": "Please check your API key and try again.",
            "message": "Unable to generate redistribution message."
        }

def parse_gemini_response(text):
    sections = {"explanation": "", "actions": "", "message": ""}
    current = None
    lines = text.strip().split("\n")

    for line in lines:
        line = line.strip()
        if not line:
            continue
        if "RISK EXPLANATION" in line.upper():
            current = "explanation"
        elif "SUGGESTED ACTIONS" in line.upper():
            current = "actions"
        elif "REDISTRIBUTION MESSAGE" in line.upper():
            current = "message"
        elif current:
            sections[current] += line + "\n"

    # Fallback: if parsing fails, put everything in explanation
    if not any(sections.values()):
        sections["explanation"] = text

    return {k: v.strip() for k, v in sections.items()}

@app.route("/", methods=["GET", "POST"])
def index():
    result = None
    form_data = {}

    if request.method == "POST":
        product_name = request.form.get("product_name", "").strip()
        quantity     = request.form.get("quantity", "").strip()
        location     = request.form.get("location", "").strip()

        try:
            expiry_days = int(request.form.get("expiry_days", 0))
        except ValueError:
            expiry_days = 0

        form_data = {
            "product_name": product_name,
            "quantity": quantity,
            "expiry_days": expiry_days,
            "location": location
        }

        risk_level = get_risk_level(expiry_days)
        gemini_data = ask_gemini(product_name, quantity, expiry_days, location, risk_level)

        result = {
            "risk_level": risk_level,
            "explanation": gemini_data["explanation"],
            "actions": gemini_data["actions"],
            "message": gemini_data["message"],
        }

    return render_template("index.html", result=result, form_data=form_data)

if __name__ == "__main__":
    app.run(debug=True)

# 🌿 WasteGuard AI

**AI-powered food waste reduction system for India's Public Distribution System (PDS)**

Built with React + FastAPI + Gemini 1.5 Flash + Firebase Firestore

---

## Features

| Module | Description |
|--------|-------------|
| 📦 Inventory Dashboard | Real-time risk monitoring for 10 Bengaluru ration shops |
| 🤖 AI Assistant | Gemini-powered chat for redistribution advice |
| ✉️ Auto Communications | AI-generated NGO alert messages with match scoring |
| 🌾 Impact Counter | Live animated tracker of kg saved, meals, CO₂ |
| 📱 Citizen Portal | Public reporting with AI complaint summarization |
| 🏛️ Officer Dashboard | District-level view + AI city report generation |
| 🔔 Alert Panel | Live expiry and redistribution alerts |

---

## Prerequisites

- Python 3.9+
- Node.js 18+ (for frontend)
- A [Gemini API key](https://aistudio.google.com/app/apikey) (free tier works)
- Firebase project (optional — app works without it using mock fallback)

---

## Quick Start

### 1. Clone & Setup Backend

```bash
cd backend
pip install -r requirements.txt

# Copy and fill in your API key
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_key_here
```

### 2. Start Backend

```bash
cd backend
python -m uvicorn main:app --reload --port 8000```

Backend runs at: http://localhost:10000  
API docs at: http://localhost:10000/docs

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

---

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
FIREBASE_CREDENTIALS_PATH=path/to/serviceAccountKey.json  # optional
```

> **Note:** The app works fully without Firebase. Citizen reports will use mock data fallback.

---

## Firebase Setup (Optional)

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Go to Project Settings → Service Accounts → Generate new private key
4. Save the JSON file and set `FIREBASE_CREDENTIALS_PATH` in `.env`

Firestore collection used: `citizen_reports`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stores` | All store + NGO mock data |
| POST | `/api/chat` | Gemini chat with store context |
| POST | `/api/generate-message` | Generate NGO WhatsApp message |
| POST | `/api/report` | Submit citizen report |
| GET | `/api/reports/{store_id}` | Get reports for a store |
| POST | `/api/summarize-reports` | AI summary of store complaints |
| POST | `/api/city-report` | AI district officer report |

---

## Risk Rules

| Level | Condition | Color |
|-------|-----------|-------|
| 🔴 HIGH | expiry_days ≤ 3 | Red |
| 🟡 MEDIUM | expiry_days 4–7 | Yellow |
| 🟢 LOW | expiry_days ≥ 8 | Green |
| 📦 OVERSTOCK | quantity > 90% of max capacity | Orange badge |

---

## Project Structure

```
wasteguard/
├── backend/
│   ├── main.py              # FastAPI app + all routes
│   ├── gemini_service.py    # All Gemini AI calls
│   ├── firebase_config.py   # Firebase Admin SDK init
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx       # Inventory with risk cards
│   │   │   ├── GeminiChat.jsx      # AI chat interface
│   │   │   ├── AutoComms.jsx       # NGO message generator modal
│   │   │   ├── ImpactCounter.jsx   # Animated impact stats
│   │   │   ├── CitizenPortal.jsx   # Public report form
│   │   │   ├── OfficerDashboard.jsx # District officer view
│   │   │   └── AlertPanel.jsx      # Live alerts sidebar
│   │   ├── App.jsx                 # Main app + sidebar nav
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── data/
    └── mock_stores.json     # 10 Bengaluru stores + 5 NGOs
```

---

## Cloud Run Deployment

### Backend

```bash
# Build and deploy
gcloud run deploy wasteguard-backend \
  --source ./backend \
  --region asia-south1 \
  --set-env-vars GEMINI_API_KEY=your_key
```

### Frontend

```bash
cd frontend
npm run build
# Deploy dist/ to Firebase Hosting or Cloud Run
```

---

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Python + FastAPI + Uvicorn
- **AI:** Google Gemini 1.5 Flash
- **Database:** Firebase Firestore (optional)
- **Deployment:** Google Cloud Run ready

import os
import firebase_admin
from firebase_admin import credentials, firestore

db = None

def init_firebase():
    global db
    if firebase_admin._apps:
        db = firestore.client()
        return db

    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        # Use default credentials (for Cloud Run / emulator)
        firebase_admin.initialize_app()

    db = firestore.client()
    return db

def get_db():
    global db
    if db is None:
        init_firebase()
    return db

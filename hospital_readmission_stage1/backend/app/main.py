from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, text, inspect

from .database import Base, engine, get_db
from .models import User, Patient, Visit
from .schemas import RegisterRequest, LoginRequest, PredictionRequest
from .auth import hash_password, verify_password, create_access_token, decode_token
from .ml import predict

Base.metadata.create_all(bind=engine)

# Lightweight SQLite migration for existing demo databases.
def ensure_demo_columns():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if "patients" in tables:
        cols = {c["name"] for c in inspector.get_columns("patients")}
        if "blood_group" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE patients ADD COLUMN blood_group VARCHAR(10)"))

ensure_demo_columns()

app = FastAPI(title="Hospital Readmission Prediction API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def current_user(authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "hospital-readmission-api"}


@app.post("/api/auth/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="Username already exists")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role="patient"
    )
    db.add(user)
    db.flush()

    patient = Patient(
        user_id=user.id,
        patient_id=f"P{uuid4().hex[:8].upper()}",
        name=payload.name,
        age_group=payload.age_group,
        gender=payload.gender,
        phone=payload.phone,
        blood_group=payload.blood_group
    )
    db.add(patient)
    db.commit()

    return {"message": "Registration successful", "patient_id": patient.patient_id}


@app.post("/api/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    patient_id = user.patient.patient_id if user.patient else None
    name = user.patient.name if user.patient else "Administrator"

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "role": user.role,
        "patient_id": patient_id,
        "name": name
    }


@app.post("/api/admin/create-demo")
def create_demo_admin(db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == "admin").first():
        return {"message": "Demo admin already exists", "username": "admin", "password": "Admin@123"}

    admin = User(
        username="admin",
        password_hash=hash_password("Admin@123"),
        role="admin"
    )
    db.add(admin)
    db.commit()
    return {"message": "Demo admin created", "username": "admin", "password": "Admin@123"}


@app.get("/api/patient/me")
def patient_me(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    user = current_user(authorization, db)
    if user.role != "patient" or not user.patient:
        raise HTTPException(status_code=403, detail="Patient access required")
    p = user.patient
    visits = db.query(Visit).filter(Visit.patient_id == p.id).order_by(Visit.visit_date.desc()).all()
    return {
        "patient_id": p.patient_id,
        "name": p.name,
        "age_group": p.age_group,
        "gender": p.gender,
        "phone": p.phone,
        "blood_group": p.blood_group,
        "visits": [
            {
                "assessment_id": v.assessment_id,
                "visit_date": v.visit_date.isoformat(),
                "admission_type": v.admission_type,
                "probability": v.probability,
                "risk_level": v.risk_level
            } for v in visits
        ]
    }


@app.post("/api/patient/predict")
def patient_predict(
    payload: PredictionRequest,
    authorization: str = Header(default=""),
    db: Session = Depends(get_db)
):
    user = current_user(authorization, db)
    if user.role != "patient" or not user.patient:
        raise HTTPException(status_code=403, detail="Patient access required")

    features = payload.model_dump()
    try:
        probability, risk = predict(features)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    assessment_id = f"RA-{datetime.utcnow().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    visit = Visit(
        patient_id=user.patient.id,
        assessment_id=assessment_id,
        admission_type=payload.admission_type,
        time_in_hospital=payload.time_in_hospital,
        num_diagnoses=payload.num_diagnoses,
        num_medications=payload.num_medications,
        num_procedures=payload.num_procedures,
        previous_visits=payload.previous_visits,
        previous_emergency_visits=payload.previous_emergency_visits,
        previous_outpatient_visits=payload.previous_outpatient_visits,
        diabetes_medication=payload.diabetes_medication,
        insulin=payload.insulin,
        notes=(
            "Blood group: " + payload.blood_group + " | "
            "Symptoms: " + (", ".join(payload.symptoms) if payload.symptoms else "None reported") + " | "
            "Severity: " + payload.symptom_severity + " | "
            "Duration: " + payload.symptom_duration + " | "
            "Additional notes: " + (payload.symptom_notes or "None")
        ),
        probability=probability,
        risk_level=risk
    )
    db.add(visit)
    db.commit()

    return {
        "assessment_id": assessment_id,
        "probability": probability,
        "risk_level": risk,
        "created_at": visit.visit_date.isoformat()
    }


@app.get("/api/admin/summary")
def admin_summary(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    user = current_user(authorization, db)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    patients = db.query(Patient).count()
    visits = db.query(Visit).count()
    elevated = db.query(Visit).filter(Visit.risk_level == "Elevated Risk").count()

    return {
        "patients": patients,
        "assessments": visits,
        "elevated_risk": elevated
    }


@app.get("/api/admin/patients")
def admin_patients(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    user = current_user(authorization, db)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    patients = db.query(Patient).all()
    result = []
    for p in patients:
        latest = (
            db.query(Visit)
            .filter(Visit.patient_id == p.id)
            .order_by(Visit.visit_date.desc())
            .first()
        )
        result.append({
            "patient_id": p.patient_id,
            "name": p.name,
            "gender": p.gender,
            "visits": len(p.visits),
            "latest_probability": latest.probability if latest else None,
            "latest_risk": latest.risk_level if latest else None
        })
    return result

from typing import Optional
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6, max_length=100)
    name: str = Field(min_length=2, max_length=150)
    age_group: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class PredictionRequest(BaseModel):
    age_group: str
    gender: str
    admission_type: str
    time_in_hospital: int = Field(ge=1, le=30)
    num_diagnoses: int = Field(ge=0, le=20)
    num_medications: int = Field(ge=0, le=100)
    num_procedures: int = Field(ge=0, le=20)
    previous_visits: int = Field(ge=0, le=100)
    previous_emergency_visits: int = Field(ge=0, le=100)
    previous_outpatient_visits: int = Field(ge=0, le=100)
    diabetes_medication: str
    insulin: str
    blood_group: str
    symptoms: list[str] = []
    symptom_severity: str = "None"
    symptom_duration: str = "Not applicable"
    symptom_notes: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    role: str
    patient_id: Optional[str] = None
    name: Optional[str] = None

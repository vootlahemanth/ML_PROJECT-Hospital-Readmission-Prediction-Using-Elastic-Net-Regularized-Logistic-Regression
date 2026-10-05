from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="patient")
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="user", uselist=False)


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    patient_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    age_group = Column(String(30), nullable=True)
    gender = Column(String(30), nullable=True)
    phone = Column(String(50), nullable=True)
    blood_group = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="patient")
    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    assessment_id = Column(String(80), unique=True, nullable=False)
    visit_date = Column(DateTime, default=datetime.utcnow)

    admission_type = Column(String(80))
    time_in_hospital = Column(Integer)
    num_diagnoses = Column(Integer)
    num_medications = Column(Integer)
    num_procedures = Column(Integer)
    previous_visits = Column(Integer)
    previous_emergency_visits = Column(Integer)
    previous_outpatient_visits = Column(Integer)
    diabetes_medication = Column(String(20))
    insulin = Column(String(20))

    probability = Column(Float)
    risk_level = Column(String(50))
    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="visits")

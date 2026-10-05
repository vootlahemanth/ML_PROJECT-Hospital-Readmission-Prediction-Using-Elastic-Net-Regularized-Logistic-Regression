# Stage 1 Architecture

React frontend
    |
    | HTTP/JSON
    v
FastAPI backend
    |
    +--> JWT authentication
    |
    +--> SQLite database
    |       + users
    |       + patients
    |       + visits
    |
    +--> Elastic Net ML model

Patient:
login -> dashboard -> new prediction -> result -> saved visit

Admin:
login -> dashboard -> patients -> visit records -> model performance

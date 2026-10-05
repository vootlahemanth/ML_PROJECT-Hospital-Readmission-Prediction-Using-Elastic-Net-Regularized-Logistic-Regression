# Hospital Readmission Prediction System — Stage 1

A demonstration full-stack project for the Machine Learning project:
**Hospital Readmission Prediction Using Elastic Net Regularized Logistic Regression**

## Stack
- Frontend: React + Vite
- Backend: FastAPI
- Database: SQLite
- Authentication: JWT + bcrypt password hashing
- ML: scikit-learn Elastic Net Logistic Regression

## Important
This is a classroom demonstration system, not a clinically validated or production hospital system.

## Run backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Create the demo admin once:
```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/admin/create-demo
```

Admin:
- username: `admin`
- password: `Admin@123`

## Run frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally:
`http://localhost:5173`

## ML model
Copy a model named:
`readmission_elastic_net.joblib`
to:
`backend/model/`

The current API deliberately refuses to make a prediction if the bundled model is incompatible with the compact patient form. The next project step is to train the patient-facing Elastic Net model using the selected patient-friendly fields and place the resulting model at that path.

## Database
The application creates:
`backend/hospital.db`

It stores:
- users
- patient profiles
- visit/assessment history
- model probability and risk result

The original UCI Excel/CSV training dataset is not modified by patient submissions.

## Demo flow
1. Start FastAPI.
2. Create demo admin.
3. Start React.
4. Register a patient.
5. Login as patient.
6. View dashboard.
7. Create a new prediction.
8. Prediction is saved to SQLite.
9. Return to My Visits.
10. Logout.
11. Login as admin.
12. View patient and assessment counts.

## Clinical note
The prediction is a machine-learning risk estimate and should not be represented as a diagnosis or autonomous clinical decision.

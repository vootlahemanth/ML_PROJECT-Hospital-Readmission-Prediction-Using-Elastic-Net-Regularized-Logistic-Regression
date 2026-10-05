# Elastic Net Model Training

The bundled model was retrained from the cleaned `Cleaned_Dataset_FULL` sheet of the Diabetes 130-US Hospitals dataset.

## Target
`readmitted`: 1 = readmitted within 30 days; 0 = not within 30 days (`>30` or `NO` in the original project definition).

## Patient-facing model features
- age_group
- gender
- admission_type
- time_in_hospital
- num_diagnoses
- num_medications
- num_procedures
- previous_visits
- previous_emergency_visits
- previous_outpatient_visits
- diabetes_medication
- insulin

## Admission mapping
- 1 -> Emergency
- 2 -> Urgent
- 3 -> Elective
- all other dataset admission IDs -> Other
- the UI label `Casual Check-up` is mapped to `Other` at inference time because the training dataset has no dedicated Casual Check-up class.

Blood group and symptom questions are collected by the application and saved with the assessment, but are not used as ML predictors because those variables are not present in the training dataset.

## Training
- Stratified 80/20 train-test split
- random_state = 42
- Logistic Regression with Elastic Net penalty
- solver = saga
- C = 0.05
- l1_ratio = 0.2
- class_weight = balanced
- max_iter = 2000

## Test metrics
See `backend/model/model_metrics.json` for the exact metrics and confusion matrix.

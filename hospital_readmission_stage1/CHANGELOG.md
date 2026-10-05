# Update: Patient-Friendly Clinical Intake

Changes in this version:
- Age groups are now 0-10 through 90-100 in 10-year intervals.
- Admission type options: Emergency, Urgent, Elective, Casual Check-up.
- Blood group options: A+, A-, B+, B-, AB+, AB-, O+, O-, Unknown.
- Added symptom questions: selectable symptoms, severity, duration, and additional details.
- Symptoms and blood group are stored with the assessment record; they are not silently fed into the Elastic Net model because the supplied UCI training data does not contain these fields.
- "Casual Check-up" is mapped to the model's existing "Other" admission bucket during inference.

from pathlib import Path
import math
import joblib

MODEL_PATH = Path(__file__).resolve().parents[1] / "model" / "readmission_elastic_net.joblib"

_model = None


def load_model():
    global _model
    if _model is None and MODEL_PATH.exists():
        _model = joblib.load(MODEL_PATH)
    return _model


def _normalize_features_for_model(features: dict) -> dict:
    normalized = dict(features)
    # The UCI-derived compact model has an "Other" admission bucket.
    # Keep the patient-facing "Casual Check-up" option while mapping it to
    # the training bucket for inference.
    if normalized.get("admission_type") == "Casual Check-up":
        normalized["admission_type"] = "Other"
    return normalized


def _portable_probability(bundle: dict, features: dict) -> float:
    """Run inference from the saved compact Elastic Net coefficients.

    The artifact stores the fitted one-hot category maps, numeric scaler values,
    coefficients and intercept. This keeps prediction independent of the
    scikit-learn version installed on the demo machine.
    """
    values = []

    # Match ColumnTransformer order: all categorical one-hot columns first.
    for column in bundle["categorical_features"]:
        value = str(features.get(column, ""))
        categories = bundle["categories"][column]
        values.extend(1.0 if value == category else 0.0 for category in categories)

    # Numeric columns were standardized during training.
    means = bundle["numeric_mean"]
    scales = bundle["numeric_scale"]
    for i, column in enumerate(bundle["numeric_features"]):
        value = float(features.get(column, 0))
        scale = scales[i] if scales[i] != 0 else 1.0
        values.append((value - means[i]) / scale)

    score = bundle["intercept"] + sum(c * x for c, x in zip(bundle["coef"], values))
    # Numerically stable sigmoid.
    if score >= 0:
        z = math.exp(-score)
        return 1.0 / (1.0 + z)
    z = math.exp(score)
    return z / (1.0 + z)


def predict(features: dict):
    model = load_model()
    features = _normalize_features_for_model(features)

    if model is None:
        raise RuntimeError(
            "ML model not found. Place a compatible model at "
            "backend/model/readmission_elastic_net.joblib"
        )

    try:
        if isinstance(model, dict) and model.get("format_version") == 1:
            probability = _portable_probability(model, features)
        else:
            # Backward-compatible path for a normal sklearn Pipeline artifact.
            import pandas as pd
            frame = pd.DataFrame([features])
            probability = float(model.predict_proba(frame)[:, 1][0])
    except Exception as exc:
        raise RuntimeError(
            "The bundled Elastic Net model is not compatible with the compact patient form."
        ) from exc

    risk = "Lower Risk" if probability < 0.35 else ("Moderate Risk" if probability < 0.65 else "Elevated Risk")
    return probability, risk

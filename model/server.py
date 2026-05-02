"""
Snake Venom Prediction Service — FastAPI Server
=================================================
Loads the trained snake_venom_classifier.h5 model and serves predictions.

Usage:
    cd project/model
    uvicorn server:app --host 0.0.0.0 --port 8000

Endpoints:
    POST /predict   — accepts { "image_url": "..." }, returns prediction
    GET  /health    — health check
"""

import os
import io
import numpy as np
import tensorflow as tf
import httpx
from urllib.parse import urlparse
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# ── Load Model ─────────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snake_venom_classifier.h5")

model = None

def load_model():
    global model
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model file not found at {MODEL_PATH}. Run train.py first."
        )
    model = tf.keras.models.load_model(MODEL_PATH)
    print(f"Model loaded from {MODEL_PATH}")

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Snake Venom Classifier", version="1.0.0")

@app.on_event("startup")
async def startup():
    load_model()

# ── Schemas ────────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    image_url: str

class PredictResponse(BaseModel):
    species: str
    venom_risk: str
    confidence_score: float

class WoundRequest(BaseModel):
    image_url: str

class WoundResponse(BaseModel):
    is_snakebite: bool
    confidence_score: float
    description: str

# ── Trusted image domains ──────────────────────────────────────────────────────
# Image URLs must originate from Firebase / Google Cloud Storage.
# This prevents SSRF by rejecting arbitrary user-supplied hostnames.
_TRUSTED_HOSTS = {
    "storage.googleapis.com",
    "firebasestorage.googleapis.com",
    "localhost",
    "127.0.0.1",
}

def _validate_image_url(image_url: str) -> None:
    """Raise HTTPException(400) if the URL is not from a trusted host."""
    try:
        parsed = urlparse(image_url)
        hostname = parsed.hostname or ""
        is_local = hostname in ("localhost", "127.0.0.1")
        # Require HTTPS in all cases; HTTP is allowed only for local development.
        if parsed.scheme == "http" and not is_local:
            raise ValueError("HTTPS is required for non-local URLs.")
        if parsed.scheme not in ("https", "http"):
            raise ValueError("Only http/https URLs are allowed.")
        # Allow exact match or subdomain of trusted hosts
        if not any(hostname == h or hostname.endswith("." + h) for h in _TRUSTED_HOSTS):
            raise ValueError(f"Untrusted image host: {hostname}")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image URL: {exc}") from exc


# ── Preprocessing ──────────────────────────────────────────────────────────────
IMG_SIZE = (224, 224)

async def download_and_preprocess(image_url: str) -> np.ndarray:
    """Download image from URL and preprocess for model input."""
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(image_url)
            response.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Failed to download image: HTTP {e.response.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Failed to download image: {str(e)}")

    try:
        img = tf.image.decode_image(response.content, channels=3, expand_animations=False)
        img = tf.image.resize(img, IMG_SIZE)
        # EfficientNet expects its own preprocessing (not simple /255)
        from tensorflow.keras.applications.efficientnet import preprocess_input
        img = tf.expand_dims(img, axis=0)  # batch dimension
        img = preprocess_input(img)
        return img.numpy()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

# ── Endpoints ──────────────────────────────────────────────────────────────────
@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    """Predict whether a snake is venomous or non-venomous."""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    img = await download_and_preprocess(req.image_url)
    prediction = model.predict(img, verbose=0)
    probability = float(prediction[0][0])

    # Determine classification
    # Class indices from training: typically Non Venomous=0, Venomous=1
    # sigmoid output: higher = Venomous
    is_venomous = probability >= 0.5
    confidence = probability if is_venomous else 1.0 - probability

    return PredictResponse(
        species="Venomous Snake" if is_venomous else "Non-Venomous Snake",
        venom_risk="high" if is_venomous else "low",
        confidence_score=round(confidence, 4),
    )

@app.post("/predict/wound", response_model=WoundResponse)
async def predict_wound(req: WoundRequest):
    """Analyse a wound image for snakebite characteristics using colour heuristics."""
    _validate_image_url(req.image_url)

    # Download raw image bytes (reuse the same HTTP client pattern)
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(req.image_url)
            response.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to download image: HTTP {e.response.status_code}",
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to download image: {str(e)}"
        )

    try:
        img = tf.image.decode_image(response.content, channels=3, expand_animations=False)
        img_f = tf.cast(img, tf.float32) / 255.0  # normalise to [0, 1]
        img_np = img_f.numpy()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

    r = img_np[:, :, 0]
    g = img_np[:, :, 1]
    b = img_np[:, :, 2]

    # ── Wound-analysis constants ───────────────────────────────────────────────
    # Normal skin redness ratio (mean_r / (mean_g + mean_b)) is roughly 0.35–0.40.
    # Inflammatory redness typically pushes this above 0.45.
    REDNESS_BASELINE = 0.45      # ratio below which redness_score is 0
    REDNESS_SCALE = 4.0          # 1 / 0.25 — maps [0.45, 0.70] → [0, 1]
    # ~8 % purple pixels (visible bruising) maps to a bruising_score of 1.0.
    BRUISING_SCALE = 12.0

    # ── Inflammation indicator ─────────────────────────────────────────────────
    # Snakebite wounds exhibit localised redness.  Epsilons prevent division by
    # zero when both channels are completely black.
    redness = float(np.mean(r)) / (float(np.mean(g)) + float(np.mean(b)) + 1e-6)

    # ── Bruising / discolouration indicator ────────────────────────────────────
    # Venom-induced bruising produces purple / dark-red pixels: high R, moderate
    # B, suppressed G.  The thresholds (0.30, 0.20, 0.35) are normalised [0,1]
    # equivalents of (77, 51, 89) in uint8 — chosen to isolate purple hues.
    purple_mask = (r > 0.30) & (b > 0.20) & (g < 0.35)
    bruising_ratio = float(np.mean(purple_mask))

    # ── Combined snakebite score ───────────────────────────────────────────────
    # Redness is weighted 60 % and bruising 40 % because systemic redness is a
    # more consistent early indicator than visible bruising, which may be absent
    # in the first minutes after a bite.
    redness_score = min(1.0, max(0.0, (redness - REDNESS_BASELINE) * REDNESS_SCALE))
    bruising_score = min(1.0, bruising_ratio * BRUISING_SCALE)
    snakebite_score = 0.6 * redness_score + 0.4 * bruising_score

    is_snakebite = snakebite_score >= 0.5
    raw_confidence = snakebite_score if is_snakebite else (1.0 - snakebite_score)
    # Clamp to [0.50, 0.95] to avoid over-confident predictions
    confidence = round(max(0.50, min(0.95, raw_confidence)), 4)

    if is_snakebite:
        description = (
            "The wound shows signs of inflammation and discolouration that may be "
            "consistent with a snakebite. Look for two small puncture marks close "
            "together. Seek emergency medical care immediately."
        )
    else:
        description = (
            "No strong visual indicators of a snakebite were detected. "
            "If you have any concerns or are experiencing symptoms, consult a "
            "medical professional immediately."
        )

    return WoundResponse(
        is_snakebite=is_snakebite,
        confidence_score=confidence,
        description=description,
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": MODEL_PATH,
    }

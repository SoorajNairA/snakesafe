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

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": MODEL_PATH,
    }

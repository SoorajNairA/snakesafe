"""
Snake Prediction Service — FastAPI Server
=========================================
Loads the trained snake and wound classifiers and serves predictions.

Usage:
    cd project/model
    uvicorn server:app --host 0.0.0.0 --port 8000

Endpoints:
    POST /predict       — snake venom classification
    POST /predict/wound — wound-vs-snakebite diagnosis
    GET  /health        — health check
"""

import os
import numpy as np
import tensorflow as tf
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from tensorflow.keras.applications.efficientnet import preprocess_input as efficientnet_preprocess_input
from tensorflow.keras.applications.resnet50 import preprocess_input as resnet50_preprocess_input

# ── Load Model ─────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SNAKE_MODEL_PATH = os.path.join(BASE_DIR, "snake_venom_classifier.h5")
WOUND_MODEL_PATH = os.path.join(BASE_DIR, "wound_classifier.h5")

snake_model = None
wound_model = None

def load_model(model_path: str):
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model file not found at {model_path}."
        )
    model = tf.keras.models.load_model(model_path)
    print(f"Model loaded from {model_path}")
    return model


def load_models():
    global snake_model, wound_model
    snake_model = load_model(SNAKE_MODEL_PATH)
    wound_model = load_model(WOUND_MODEL_PATH)

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Snake Venom Classifier", version="1.0.0")

@app.on_event("startup")
async def startup():
    load_models()

# ── Schemas ────────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    image_url: str

class PredictResponse(BaseModel):
    species: str
    venom_risk: str
    confidence_score: float


class WoundPredictRequest(BaseModel):
    image_url: str


class WoundPredictResponse(BaseModel):
    is_snakebite: bool
    confidence_score: float
    description: str

# ── Preprocessing ──────────────────────────────────────────────────────────────
IMG_SIZE = (224, 224)

async def download_and_preprocess(image_url: str, preprocess_fn) -> np.ndarray:
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
        img = tf.expand_dims(img, axis=0)
        img = preprocess_fn(img)
        return img.numpy() if hasattr(img, "numpy") else img
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

# ── Endpoints ──────────────────────────────────────────────────────────────────
@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    """Predict whether a snake is venomous or non-venomous."""
    if snake_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    img = await download_and_preprocess(req.image_url, efficientnet_preprocess_input)
    prediction = snake_model.predict(img, verbose=0)
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


@app.post("/predict/wound", response_model=WoundPredictResponse)
async def predict_wound(req: WoundPredictRequest):
    """Predict whether a wound is likely a snakebite."""
    if wound_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    img = await download_and_preprocess(req.image_url, resnet50_preprocess_input)
    prediction = wound_model.predict(img, verbose=0)
    probability = float(prediction[0][0])

    is_snakebite = probability >= 0.5
    confidence = probability if is_snakebite else 1.0 - probability

    return WoundPredictResponse(
        is_snakebite=is_snakebite,
        confidence_score=round(confidence, 4),
        description=(
            "The image looks consistent with a snakebite. Seek urgent medical care immediately."
            if is_snakebite
            else "The image does not strongly indicate a snakebite, but symptoms can vary. Please consult a clinician if you are concerned."
        ),
    )

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "snake_model_loaded": snake_model is not None,
        "wound_model_loaded": wound_model is not None,
        "snake_model_path": SNAKE_MODEL_PATH,
        "wound_model_path": WOUND_MODEL_PATH,
    }

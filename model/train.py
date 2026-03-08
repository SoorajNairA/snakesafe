"""
Snake Venom Classification Model — Training Pipeline
=====================================================
Binary classifier: Venomous vs Non-Venomous

Uses EfficientNetB0 transfer learning for higher accuracy on limited data.

Usage:
    cd project/model
    python train.py

Produces:
    snake_venom_classifier.h5   — trained model
    training_history.png        — accuracy/loss plots
"""

import os
import numpy as np
import matplotlib
matplotlib.use("Agg")  # non-interactive backend for saving plots
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (
    Conv2D, MaxPooling2D, Flatten, Dense, Dropout, GlobalAveragePooling2D
)
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.applications import EfficientNetB0

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
DATASET_DIR = os.path.join(PROJECT_DIR, "Snake Images")
TRAIN_DIR = os.path.join(DATASET_DIR, "train")
VAL_DIR = os.path.join(DATASET_DIR, "test")  # 'test' folder used as validation
MODEL_OUTPUT = os.path.join(BASE_DIR, "snake_venom_classifier.h5")
PLOT_OUTPUT = os.path.join(BASE_DIR, "training_history.png")

# ── Hyperparameters ────────────────────────────────────────────────────────────
IMG_SIZE = (224, 224)
INPUT_SHAPE = (224, 224, 3)
BATCH_SIZE = 32
EPOCHS = 30
LEARNING_RATE = 0.001  # Higher LR for head-only training (few trainable params)

# ── Data Generators ───────────────────────────────────────────────────────────
print("=" * 60)
print("Snake Venom Classification — Training Pipeline")
print("=" * 60)

# EfficientNet expects pixel values in [0, 255] and applies its own preprocessing.
# Use its built-in preprocessing function instead of rescale=1/255.
from tensorflow.keras.applications.efficientnet import preprocess_input

train_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input,
    rotation_range=20,
    zoom_range=0.15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    horizontal_flip=True,
)

val_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input,
)

print(f"\nLoading training data from: {TRAIN_DIR}")
train_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=IMG_SIZE,
    color_mode="rgb",
    batch_size=BATCH_SIZE,
    class_mode="binary",
    shuffle=True,
)

print(f"Loading validation data from: {VAL_DIR}")
val_generator = val_datagen.flow_from_directory(
    VAL_DIR,
    target_size=IMG_SIZE,
    color_mode="rgb",
    batch_size=BATCH_SIZE,
    class_mode="binary",
    shuffle=False,
)

print(f"\nClass mapping: {train_generator.class_indices}")
print(f"Training samples:   {train_generator.samples}")
print(f"Validation samples: {val_generator.samples}")

# ── Class Weights (handle imbalance) ──────────────────────────────────────────
from sklearn.utils.class_weight import compute_class_weight

class_labels = train_generator.classes
weights = compute_class_weight("balanced", classes=np.unique(class_labels), y=class_labels)
class_weight = dict(enumerate(weights))
print(f"Class weights: {class_weight}")

# ── Model Architecture ────────────────────────────────────────────────────────
# Use Functional API so we can pass training=False to the base model.
# This is CRITICAL: it ensures BatchNorm layers use ImageNet statistics
# (not batch statistics) when the base model is frozen.
print("\nBuilding EfficientNetB0 transfer learning model...")

base_model = EfficientNetB0(
    weights="imagenet",
    include_top=False,
    input_shape=INPUT_SHAPE,
)
base_model.trainable = False  # Freeze pretrained weights

inputs = tf.keras.Input(shape=INPUT_SHAPE)
x = base_model(inputs, training=False)  # BN layers in inference mode
x = GlobalAveragePooling2D()(x)
x = Dense(256, activation="relu")(x)
x = Dropout(0.5)(x)
outputs = Dense(1, activation="sigmoid")(x)
model = tf.keras.Model(inputs, outputs)

model.summary()

# ── Compilation ────────────────────────────────────────────────────────────────
model.compile(
    optimizer=Adam(learning_rate=LEARNING_RATE),
    loss="binary_crossentropy",
    metrics=["accuracy"],
)

# ── Callbacks ──────────────────────────────────────────────────────────────────
callbacks = [
    EarlyStopping(
        monitor="val_loss",
        patience=5,
        restore_best_weights=True,
        verbose=1,
    ),
    ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.3,
        patience=3,
        verbose=1,
    ),
]

# ── Training ───────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("Starting training...")
print("=" * 60)

history = model.fit(
    train_generator,
    epochs=EPOCHS,
    validation_data=val_generator,
    callbacks=callbacks,
    class_weight=class_weight,
)

# ── Fine-tuning: unfreeze top layers of EfficientNet ──────────────────────────
print("\n" + "=" * 60)
print("Fine-tuning: unfreezing top layers of EfficientNet...")
print("=" * 60)

base_model.trainable = True
# Freeze all layers except the last 30
for layer in base_model.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=Adam(learning_rate=1e-4),
    loss="binary_crossentropy",
    metrics=["accuracy"],
)

fine_tune_callbacks = [
    EarlyStopping(
        monitor="val_loss",
        patience=5,
        restore_best_weights=True,
        verbose=1,
    ),
    ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.3,
        patience=3,
        verbose=1,
    ),
]

history_fine = model.fit(
    train_generator,
    epochs=20,
    validation_data=val_generator,
    callbacks=fine_tune_callbacks,
    class_weight=class_weight,
)

# ── Evaluation ─────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("Evaluation")
print("=" * 60)

val_loss, val_acc = model.evaluate(val_generator)
print(f"\nValidation Loss:     {val_loss:.4f}")
print(f"Validation Accuracy: {val_acc:.4f} ({val_acc * 100:.1f}%)")

# ── Sample Predictions ────────────────────────────────────────────────────────
print("\nSample predictions from validation set:")
val_batch, val_labels = next(iter(val_generator))
predictions = model.predict(val_batch, verbose=0)

for i in range(min(5, len(predictions))):
    prob = predictions[i][0]
    predicted = "Venomous" if prob >= 0.5 else "Non-Venomous"
    actual_label = "Venomous" if val_labels[i] == 1 else "Non-Venomous"
    # Adjust based on class indices
    class_indices = train_generator.class_indices
    if class_indices.get("Venomous", 1) == 0:
        predicted = "Non-Venomous" if prob >= 0.5 else "Venomous"
        actual_label = "Non-Venomous" if val_labels[i] == 1 else "Venomous"
    print(f"  Image {i+1}: predicted={predicted} (conf={prob:.3f}), actual={actual_label}")

# ── Training History Plot ──────────────────────────────────────────────────────
# Merge initial + fine-tuning histories
all_acc = history.history["accuracy"] + history_fine.history["accuracy"]
all_val_acc = history.history["val_accuracy"] + history_fine.history["val_accuracy"]
all_loss = history.history["loss"] + history_fine.history["loss"]
all_val_loss = history.history["val_loss"] + history_fine.history["val_loss"]

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
fine_tune_start = len(history.history["accuracy"])

ax1.plot(all_acc, label="Train Accuracy")
ax1.plot(all_val_acc, label="Val Accuracy")
ax1.axvline(x=fine_tune_start, color="gray", linestyle="--", label="Fine-tuning start")
ax1.set_title("Model Accuracy")
ax1.set_xlabel("Epoch")
ax1.set_ylabel("Accuracy")
ax1.legend()
ax1.grid(True)

ax2.plot(all_loss, label="Train Loss")
ax2.plot(all_val_loss, label="Val Loss")
ax2.axvline(x=fine_tune_start, color="gray", linestyle="--", label="Fine-tuning start")
ax2.set_title("Model Loss")
ax2.set_xlabel("Epoch")
ax2.set_ylabel("Loss")
ax2.legend()
ax2.grid(True)

plt.tight_layout()
plt.savefig(PLOT_OUTPUT, dpi=150)
print(f"\nTraining plots saved to: {PLOT_OUTPUT}")

# ── Export Model ───────────────────────────────────────────────────────────────
model.save(MODEL_OUTPUT)
print(f"Model saved to: {MODEL_OUTPUT}")

print("\n" + "=" * 60)
print("Training complete!")
print("=" * 60)

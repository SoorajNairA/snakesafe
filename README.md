# Snakebite Detection & Emergency Assistance System — Backend

A complete Firebase Cloud Functions backend for snakebite detection and emergency response.

---

## 🗂️ Project Structure

```
project/
├── .firebaserc             # Firebase project alias
├── firebase.json           # Firebase config (functions, firestore, storage, emulators)
├── firestore.rules         # Firestore security rules
├── storage.rules           # Firebase Storage security rules
├── firestore.indexes.json  # Composite indexes
│
└── functions/
    ├── index.js                        # Cloud Functions entry point (Express app)
    ├── firebase.js                     # Firebase Admin SDK singleton
    ├── package.json
    ├── .env.example                    # Environment variable template
    │
    ├── middleware/
    │   ├── auth.js                     # JWT token verification middleware
    │   └── errorHandler.js             # Centralized error handler
    │
    ├── routes/
    │   ├── auth.js                     # POST /auth/signup, /auth/login, GET /auth/profile
    │   ├── reports.js                  # POST /report/create, GET /report/history, /report/:id
    │   ├── predict.js                  # POST /predict
    │   ├── hospitals.js                # GET /hospitals/nearby
    │   └── emergency.js                # POST /emergency/send, GET /emergency/status/:id
    │
    ├── services/
    │   ├── imageUpload.js              # Multipart upload → Firebase Storage
    │   ├── predictionService.js        # Proxy to FastAPI AI model server
    │   ├── haversine.js                # Distance calculation utility
    │   ├── locationService.js          # Location validation
    │   └── notificationService.js      # FCM + email notifications
    │
    └── data/
        └── hospitals_seed.js           # One-time Firestore hospital seeder
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with **Firestore**, **Storage**, **Authentication**, and **Functions** enabled

### 1. Clone & install
```bash
cd functions
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env` and fill in:
```
AI_MODEL_URL=http://your-ai-server.com
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your@email.com
EMAIL_PASS=your_app_password
```

### 3. Set your Firebase project
Edit `.firebaserc` and replace `YOUR_FIREBASE_PROJECT_ID` with your actual project ID.

### 4. Start the emulator
```bash
# From the project root (not functions/)
firebase emulators:start --only functions,firestore,storage,auth
```

Emulator UI will be available at: http://localhost:4000

### 5. Seed hospitals
```bash
cd functions
set FIRESTORE_EMULATOR_HOST=localhost:8080
node data/hospitals_seed.js
```

---

## 📡 API Reference

Base URL (emulator): `http://localhost:5001/<project-id>/us-central1/api`

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | None | Create new account |
| POST | `/auth/login` | None | Get custom token |
| GET | `/auth/profile` | ✅ Bearer | Get user profile |

### Reports
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/report/create` | ✅ Bearer | Create report + upload images |
| GET | `/report/history` | ✅ Bearer | List user's reports |
| GET | `/report/:id` | ✅ Bearer | Get single report |

### Prediction
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/predict` | ✅ Bearer | Predict snake species from image URL |

### Hospitals
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/hospitals/nearby?lat=&lng=` | ✅ Bearer | Get 5 nearest hospitals |

### Emergency
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/emergency/send` | ✅ Bearer | Trigger emergency alert |
| GET | `/emergency/status/:alertId` | ✅ Bearer | Get alert status |

---

## 🗄️ Database Schema

### `users/{uid}`
| Field | Type | Description |
|-------|------|-------------|
| name | string | Display name |
| email | string | Email address |
| phone_number | string? | Phone (optional) |
| created_at | ISO string | Account creation time |
| last_login | ISO string | Last login time |
| account_status | string | `active` / `suspended` / `deleted` |

### `reports/{id}`
| Field | Type | Description |
|-------|------|-------------|
| user_id | string | Owner UID |
| snake_image_url | string | Storage URL |
| bite_image_url | string? | Storage URL |
| symptoms | string[] | Symptom list |
| location | object | `{ latitude, longitude, accuracy, timestamp }` |
| prediction_result | string? | Species name |
| venom_risk | string? | Risk level |
| confidence_score | number? | 0–1 |
| timestamp | ISO string | Report creation time |
| emergency_triggered | boolean | Whether emergency was sent |

### `hospitals/{id}`
| Field | Type |
|-------|------|
| name | string |
| latitude / longitude | number |
| emergency_phone | string |
| address | string |
| contact_email | string? |
| fcm_token | string? |

### `emergency_alerts/{id}`
| Field | Type |
|-------|------|
| user_id | string |
| report_id | string |
| hospital_id | string |
| location | object |
| alert_time | ISO string |
| status | `sent` / `received` / `resolved` |
| distance_km | number |

---

## 🔒 Security

- All protected routes require a valid Firebase ID token as `Authorization: Bearer <token>`
- Firestore rules enforce user-level data isolation
- Storage rules deny direct client writes — all uploads go through Admin SDK
- Images: max 5 MB, JPEG/PNG only

---

## ⚠️ Disclaimer

This system is for **emergency assistance only** and does **not** replace professional medical care.
Seek immediate medical attention after any snakebite.

---

## 🚀 Deploy to Production

### Architecture overview

```
Firebase App Hosting  ←→  Cloud Functions (backend API)
                               ↓
                       Google Cloud Run  (FastAPI ML server)
                               ↓
                   Firestore · Storage · Auth  (always Firebase)
```

---

### Step 1 — Deploy the ML server to Cloud Run

```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud config set project YOUR_FIREBASE_PROJECT_ID

# Build and deploy from the model/ directory
# Cloud Run will build the Docker image automatically via Cloud Build
gcloud run deploy snake-model \
  --source ./model \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1
```

Copy the **Service URL** printed after deployment (e.g. `https://snake-model-xxxx-as.a.run.app`).

> **Note:** The `.h5` model file is ~85 MB. First deploy takes ~3–4 minutes while Cloud Build layers it into the image.

---

### Step 2 — Set backend environment variables

The Cloud Functions need to know the FastAPI URL and email credentials:

```bash
# Using Firebase Functions secrets (recommended)
firebase functions:secrets:set AI_MODEL_URL
# Paste: https://snake-model-xxxx-as.a.run.app

firebase functions:secrets:set EMAIL_HOST
firebase functions:secrets:set EMAIL_USER
firebase functions:secrets:set EMAIL_PASS
```

Or via `.env` file in `functions/` for runtime config (see `.env.example`).

---

### Step 3 — Deploy Cloud Functions + Firestore + Storage rules

```bash
firebase deploy --only functions,firestore:rules,firestore:indexes,storage
```

After this completes the Functions URL will be:
`https://asia-south1-YOUR_PROJECT_ID.cloudfunctions.net/api/v1`

---

### Step 4 — Set frontend environment variables in Secret Manager

App Hosting reads secrets from Google Secret Manager (referenced in `frontend/apphosting.yaml`).

```bash
# Create each secret (paste the value when prompted)
firebase apphosting:secrets:set FIREBASE_API_KEY
firebase apphosting:secrets:set FIREBASE_AUTH_DOMAIN
firebase apphosting:secrets:set FIREBASE_PROJECT_ID
firebase apphosting:secrets:set FIREBASE_STORAGE_BUCKET
firebase apphosting:secrets:set FIREBASE_MESSAGING_SENDER_ID
firebase apphosting:secrets:set FIREBASE_APP_ID
firebase apphosting:secrets:set API_URL
# API_URL value: https://asia-south1-YOUR_PROJECT_ID.cloudfunctions.net/api/v1
```

You can also set these in the Firebase Console → **App Hosting** → your backend → **Environment variables**.

---

### Step 5 — Deploy the Next.js frontend via App Hosting

App Hosting deploys from a connected GitHub repository. The one-time setup:

```bash
firebase init apphosting
# Select: Use existing backend → snakesafe-frontend
# Connect your GitHub repo and pick the main branch
```

After that every push to `main` triggers an automatic deployment.  
To deploy manually right now:

```bash
firebase apphosting:backends:list   # confirm backend name
firebase deploy --only apphosting
```

---

### Seeding hospitals in production

```bash
cd functions
# Point at the live Firestore (no emulator env var)
node data/hospitals_seed.js
```

---

### Full one-shot deploy (after initial setup)

```bash
firebase deploy --only functions,firestore:rules,firestore:indexes,storage,apphosting
```


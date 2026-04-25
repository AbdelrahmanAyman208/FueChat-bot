# FueBot Frontend

Production-ready React 18 + TypeScript frontend for the FueBot AI Academic Advising system.

## Quick Start

```bash
cd frontend
npm install
npm start
```

The app will run at `http://localhost:3000`.

## Environment Variables

Create `frontend/.env` using the provided example:

```
REACT_APP_API_BASE_URL=http://localhost:8080
REACT_APP_USE_MOCKS=true
```

- Set `REACT_APP_USE_MOCKS=false` to call the backend.
- Use `REACT_APP_API_BASE_URL` as the backend root URL (e.g., `http://localhost:8080`).

## Backend Integration

Endpoints expected by the frontend:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/chat`
- `GET /api/profile`
- `PUT /api/profile`
- `POST /api/recommendations`
- `GET /api/requirements`

Response shapes are documented in `src/mocks/mockResponses.json`.

## Architecture

Feature-based slices live under `src/features/*`, shared UI under `src/components`, and the API abstraction in `src/services/api.ts`.

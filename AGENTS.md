# AGENTS.md

## Cursor Cloud specific instructions

This is an Event Management full-stack application (FastAPI backend + React/Vite frontend + SQLite).

### Services

| Service | Port | Start Command |
|---------|------|--------------|
| Backend (FastAPI) | 8000 | `cd /workspace && python3 -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000` |
| Frontend (Vite) | 5173 | `cd /workspace/frontend && npm run dev -- --host 0.0.0.0` |

The Vite dev server proxies `/api` requests to the backend at `localhost:8000` (configured in `frontend/vite.config.ts`).

### Running

- Backend must be started from the **workspace root** (`/workspace`) so that the `backend` package resolves correctly.
- SQLite database (`event_management.db`) is auto-created on first backend startup — no migrations needed.
- `~/.local/bin` must be on `PATH` for `uvicorn` (installed via `pip install --user`).

### Lint / Type checks

- **Frontend**: `npx tsc --noEmit` (from `frontend/`)
- **Backend**: No linter/formatter configured in the repo. Python imports work as a package (`backend.main`, `backend.database`, etc.).

### Build

- **Frontend**: `npm run build` (from `frontend/`) — runs `tsc && vite build`.

### Notes

- No test framework is configured for either backend or frontend.
- No ESLint or Prettier configured for frontend; no flake8/ruff/mypy for backend.
- No lockfile exists for either Python or Node dependencies.

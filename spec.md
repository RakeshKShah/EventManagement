# Project Specification: Event Management App

## 1. Overview
A web application to manage events and their associated tasks.

## 2. Requirements

### 2.1 Event Management 
- **Create**: Name, Description, Start date, End date.
- **Read**: List of all events.
- **Update**: Edit details.
- **Delete**: Remove event.
 
### 2.2 Task Management
- **Create**: Title, Description, Status (To Do, In Progress, Completed), Associated Event.
- **Read**: View tasks (grouped by event or filtered).
- **Update**: Edit details, Status, Reassign Event.
- **Delete**: Remove task.
- **Constraint**: Each task must be associated with exactly one event.

## 3. Architecture

### 3.1 Backend (Python)
- **Framework**: FastAPI
- **Database**: SQLite (SQLAlchemy ORM)
- **Layers**:
  - `api`: Routers/Controllers
  - `services`: Business logic (validation, orchestration)
  - `repositories`: DB access
  - `models`: Storage models

### 3.2 Frontend (TypeScript)
- **Framework**: React (Vite)
- **Styling**: Vanilla CSS (Modern/Neat)

## 4. API Specification (Tentative)

### Events
- `GET /api/events`
- `POST /api/events`
- `GET /api/events/{id}`
- `PUT /api/events/{id}`
- `DELETE /api/events/{id}`

### Tasks
- `GET /api/tasks` (optional query param `event_id`)
- `POST /api/tasks`
- `PUT /api/tasks/{id}`
- `DELETE /api/tasks/{id}`

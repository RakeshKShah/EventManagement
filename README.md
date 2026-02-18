# Event Management Application

A full-stack web application for managing events and their associated tasks, built with Python (FastAPI) backend and TypeScript (React) frontend.

## Features

### Event Management
- Create events with name, description, start date, and end date
- View all events
- Edit event details
- Delete events (cascades to associated tasks)
 
### Task Management
- Create tasks with title, description, and status (To Do, In Progress, Completed)
- View all tasks (with optional filtering by event)
- Edit task details
- Delete tasks
- Each task must be associated with exactly one event

### Task Assignment
- Assign tasks to events during creation
- View all tasks for a specific event
- Reassign tasks to different events

## Architecture

### Backend (Python)
- **Framework**: FastAPI
- **Database**: SQLite with SQLAlchemy ORM
- **Layers**:
  - `api/`: API endpoints/routers
  - `services/`: Business logic layer
  - `repositories/`: Data access layer
  - `models/`: Database models
  - `schemas/`: Pydantic schemas for request/response validation

### Frontend (TypeScript)
- **Framework**: React with Vite
- **Styling**: Vanilla CSS (modern, clean design)
- **State Management**: React hooks
- **HTTP Client**: Axios

## Project Structure

```
EventManagement/
├── backend/
│   ├── api/
│   │   ├── events.py      # Event endpoints
│   │   └── tasks.py       # Task endpoints
│   ├── models/
│   │   ├── base.py        # Base model
│   │   ├── event.py       # Event model
│   │   └── task.py        # Task model
│   ├── repositories/
│   │   ├── event_repository.py
│   │   └── task_repository.py
│   ├── schemas/
│   │   ├── event.py       # Event schemas
│   │   └── task.py        # Task schemas
│   ├── services/
│   │   ├── event_service.py
│   │   └── task_service.py
│   ├── database.py        # Database configuration
│   └── main.py            # FastAPI application
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API service layer
│   │   ├── types.ts       # TypeScript types
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   └── vite.config.ts
└── requirements.txt       # Python dependencies
```

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the project root directory
2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the backend server:
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```

The API will be available at `http://localhost:8000`
API documentation (Swagger UI) will be available at `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Events
- `GET /api/events` - Get all events
- `POST /api/events` - Create a new event
- `GET /api/events/{id}` - Get a specific event
- `PUT /api/events/{id}` - Update an event
- `DELETE /api/events/{id}` - Delete an event

### Tasks
- `GET /api/tasks?event_id={id}` - Get all tasks (optionally filtered by event)
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/{id}` - Get a specific task
- `PUT /api/tasks/{id}` - Update a task
- `DELETE /api/tasks/{id}` - Delete a task

## Database

The application uses SQLite database (`event_management.db`) which is automatically created on first run. The database schema includes:

- **events** table: Stores event information
- **tasks** table: Stores task information with foreign key to events

## Development

### Backend Development
- The backend uses SQLAlchemy ORM for database operations
- All business logic is in the service layer
- Repository pattern is used for data access
- Pydantic schemas ensure request/response validation

### Frontend Development
- React components are organized by feature
- API calls are centralized in the `services/api.ts` file
- TypeScript types ensure type safety
- Modern CSS with clean, responsive design

## License

This project is open source and available for use.

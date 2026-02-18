import pytest
from fastapi import status
from fastapi.testclient import TestClient
from backend.main import app
from backend.models.task import TaskStatus
from backend.database import get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base
import string

# Setup test database (SQLite in-memory)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override get_db dependency
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def create_event(client, event_id=1):
    # Create a dummy event for event_id
    # This assumes /api/events endpoint exists and accepts POST
    # If not, manually insert event into DB
    response = client.post("/api/events", json={
        "id": event_id,
        "name": f"Event {event_id}",
        "date": "2023-01-01T00:00:00",
        "location": "Test Location"
    })
    if response.status_code not in (200, 201):
        # Fallback: insert directly if endpoint not available
        db = next(override_get_db())
        from backend.models.event import Event
        event = Event(id=event_id, name=f"Event {event_id}", date="2023-01-01T00:00:00", location="Test Location")
        db.add(event)
        db.commit()
        db.refresh(event)

# Test Case 1: Create Task with Valid 'To Do' Status
def test_create_task_valid_todo_status(setup_database):
    create_event(client, event_id=1)
    response = client.post("/api/tasks", json={
        "title": "Buy groceries",
        "description": "Milk, Bread, Eggs",
        "status": "To Do",
        "event_id": 1
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Buy groceries"
    assert data["description"] == "Milk, Bread, Eggs"
    assert data["status"] == "To Do"
    assert data["id"] == 1

# Test Case 2: Create Task with Valid 'In Progress' Status
def test_create_task_valid_in_progress_status(setup_database):
    create_event(client, event_id=2)
    response = client.post("/api/tasks", json={
        "title": "Write report",
        "description": "Q1 financial summary",
        "status": "In Progress",
        "event_id": 2
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Write report"
    assert data["description"] == "Q1 financial summary"
    assert data["status"] == "In Progress"
    assert data["id"] == 2

# Test Case 3: Create Task with Valid 'Completed' Status
def test_create_task_valid_completed_status(setup_database):
    create_event(client, event_id=3)
    response = client.post("/api/tasks", json={
        "title": "Submit taxes",
        "description": "2023 tax return",
        "status": "Completed",
        "event_id": 3
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Submit taxes"
    assert data["description"] == "2023 tax return"
    assert data["status"] == "Completed"
    assert data["id"] == 3

# Test Case 4: Create Task Missing Title
def test_create_task_missing_title(setup_database):
    create_event(client, event_id=4)
    response = client.post("/api/tasks", json={
        "description": "No title provided",
        "status": "To Do",
        "event_id": 4
    })
    assert response.status_code == 422 or response.status_code == 400
    # Pydantic validation error or custom error
    if response.status_code == 400:
        assert response.json()["error"] == "Missing required field(s): title and/or status."

# Test Case 5: Create Task Missing Status
def test_create_task_missing_status(setup_database):
    create_event(client, event_id=5)
    response = client.post("/api/tasks", json={
        "title": "No status task",
        "description": "Missing status field",
        "event_id": 5
    })
    assert response.status_code == 422 or response.status_code == 400
    if response.status_code == 400:
        assert response.json()["error"] == "Missing required field(s): title and/or status."

# Test Case 6: Create Task Missing Both Title and Status
def test_create_task_missing_both_title_and_status(setup_database):
    create_event(client, event_id=6)
    response = client.post("/api/tasks", json={
        "description": "No title or status",
        "event_id": 6
    })
    assert response.status_code == 422 or response.status_code == 400
    if response.status_code == 400:
        assert response.json()["error"] == "Missing required field(s): title and/or status."

# Test Case 7: Create Task with Invalid Status Value
def test_create_task_invalid_status_value(setup_database):
    create_event(client, event_id=7)
    response = client.post("/api/tasks", json={
        "title": "Invalid status",
        "description": "Trying invalid status",
        "status": "Done",
        "event_id": 7
    })
    assert response.status_code == 422 or response.status_code == 400
    if response.status_code == 400:
        assert response.json()["error"] == "Invalid status value."

# Test Case 8: Create Duplicate Task
def test_create_duplicate_task(setup_database):
    create_event(client, event_id=8)
    payload = {
        "title": "Buy groceries",
        "description": "Milk, Bread, Eggs",
        "status": "To Do",
        "event_id": 8
    }
    response1 = client.post("/api/tasks", json=payload)
    assert response1.status_code == 201
    response2 = client.post("/api/tasks", json=payload)
    # If duplicate logic is implemented, should return 400
    assert response2.status_code == 400
    assert response2.json()["error"] == "Duplicate task not allowed."

# Test Case 9: Create Task with Empty Title
def test_create_task_empty_title(setup_database):
    create_event(client, event_id=9)
    response = client.post("/api/tasks", json={
        "title": "",
        "description": "Description present",
        "status": "To Do",
        "event_id": 9
    })
    assert response.status_code == 400 or response.status_code == 422
    if response.status_code == 400:
        assert response.json()["error"] == "Missing required field(s): title and/or status."

# Test Case 10: Create Task with Empty Status
def test_create_task_empty_status(setup_database):
    create_event(client, event_id=10)
    response = client.post("/api/tasks", json={
        "title": "Task with empty status",
        "description": "Testing status field",
        "status": "",
        "event_id": 10
    })
    assert response.status_code == 400 or response.status_code == 422
    if response.status_code == 400:
        assert response.json()["error"] == "Invalid status value."

# Test Case 11: Create Task with Maximum Length Title
def test_create_task_max_length_title(setup_database):
    create_event(client, event_id=11)
    max_title = "T" * 255
    response = client.post("/api/tasks", json={
        "title": max_title,
        "description": "Long title test",
        "status": "To Do",
        "event_id": 11
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == max_title
    assert data["description"] == "Long title test"
    assert data["status"] == "To Do"
    assert data["id"] == 4

# Test Case 12: Create Task with Very Long Description
def test_create_task_max_length_description(setup_database):
    create_event(client, event_id=12)
    max_desc = "D" * 1000
    response = client.post("/api/tasks", json={
        "title": "Long desc task",
        "description": max_desc,
        "status": "To Do",
        "event_id": 12
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Long desc task"
    assert data["description"] == max_desc
    assert data["status"] == "To Do"
    assert data["id"] == 5

# Test Case 13: Create Task with Null Description
def test_create_task_null_description(setup_database):
    create_event(client, event_id=13)
    response = client.post("/api/tasks", json={
        "title": "Null description task",
        "description": None,
        "status": "To Do",
        "event_id": 13
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Null description task"
    assert data["description"] is None
    assert data["status"] == "To Do"
    assert data["id"] == 6

# Test Case 14: Create Task Without Description Field
def test_create_task_without_description_field(setup_database):
    create_event(client, event_id=14)
    response = client.post("/api/tasks", json={
        "title": "No description field task",
        "status": "To Do",
        "event_id": 14
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "No description field task"
    assert data["description"] is None
    assert data["status"] == "To Do"
    assert data["id"] == 7

# Test Case 15: Create Task with Case-Insensitive Status Value
def test_create_task_case_insensitive_status(setup_database):
    create_event(client, event_id=15)
    response = client.post("/api/tasks", json={
        "title": "Case test",
        "description": "Status case sensitivity",
        "status": "to do",
        "event_id": 15
    })
    assert response.status_code == 400 or response.status_code == 422
    if response.status_code == 400:
        assert response.json()["error"] == "Invalid status value."

# Test Case 16: Create Task with Status Value Containing Whitespace
def test_create_task_status_with_whitespace(setup_database):
    create_event(client, event_id=16)
    response = client.post("/api/tasks", json={
        "title": "Whitespace status",
        "description": "Testing whitespace in status",
        "status": " To Do ",
        "event_id": 16
    })
    assert response.status_code == 400 or response.status_code == 422
    if response.status_code == 400:
        assert response.json()["error"] == "Invalid status value."

# Test Case 17: Task Persists and Is Retrievable
def test_task_persists_and_is_retrievable(setup_database):
    create_event(client, event_id=17)
    response = client.post("/api/tasks", json={
        "title": "Persistent task",
        "description": "Should be retrievable",
        "status": "To Do",
        "event_id": 17
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Persistent task"
    assert data["description"] == "Should be retrievable"
    assert data["status"] == "To Do"
    assert data["id"] == 8

    # Now GET /api/tasks and check for the task
    get_response = client.get("/api/tasks")
    assert get_response.status_code == 200
    tasks = get_response.json()
    found = any(
        t["title"] == "Persistent task" and t["description"] == "Should be retrievable" and t["status"] == "To Do"
        for t in tasks
    )
    assert found
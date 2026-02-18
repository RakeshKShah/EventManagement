import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db, Base, engine
from backend.models.event import Event
from backend.models.task import Task
from sqlalchemy.orm import sessionmaker

client = TestClient(app)

# Use a test database session for setup/teardown
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = TestSessionLocal()
    # Clean up before each test
    db.query(Task).delete()
    db.query(Event).delete()
    db.commit()
    yield
    # Clean up after each test
    db.query(Task).delete()
    db.query(Event).delete()
    db.commit()
    db.close()
    Base.metadata.drop_all(bind=engine)

def create_event(event_id):
    db = TestSessionLocal()
    event = Event(id=event_id, name=f"Event {event_id}")
    db.add(event)
    db.commit()
    db.close()

def create_task(task_id, event_id, title):
    db = TestSessionLocal()
    task = Task(id=task_id, event_id=event_id, title=title)
    db.add(task)
    db.commit()
    db.close()

# Test Case 1: Create Task with Valid Event
def test_create_task_with_valid_event():
    create_event(101)
    response = client.post("/api/tasks", json={"event_id": 101, "title": "Sample Task"})
    assert response.status_code == 201
    assert response.json() == {"event_id": 101, "id": 1, "title": "Sample Task"}

# Test Case 2: Create Task with Non-existent Event
def test_create_task_with_nonexistent_event():
    response = client.post("/api/tasks", json={"event_id": 9999, "title": "Invalid Task"})
    assert response.status_code == 400
    assert response.json() == {"error": "Event does not exist."}

# Test Case 3: Create Task Missing event_id
def test_create_task_missing_event_id():
    create_event(101)
    response = client.post("/api/tasks", json={"title": "No Event Task"})
    assert response.status_code == 400
    assert response.json() == {"error": "event_id is required."}

# Test Case 4: Create Task with Blank Title
def test_create_task_with_blank_title():
    create_event(101)
    response = client.post("/api/tasks", json={"event_id": 101, "title": ""})
    assert response.status_code == 201
    assert response.json() == {"event_id": 101, "id": 2, "title": ""}

# Test Case 5: Create Task with Max Length Title
def test_create_task_with_max_length_title():
    create_event(101)
    max_title = "T" * 255
    response = client.post("/api/tasks", json={"event_id": 101, "title": max_title})
    assert response.status_code == 201
    assert response.json() == {"event_id": 101, "id": 3, "title": max_title}

# Test Case 6: Create Task with Invalid event_id Type
def test_create_task_with_invalid_event_id_type():
    response = client.post("/api/tasks", json={"event_id": "abc", "title": "Invalid Event Type"})
    assert response.status_code == 400
    assert response.json() == {"error": "event_id must be an integer."}

# Test Case 7: Create Task with Duplicate Title
def test_create_task_with_duplicate_title():
    create_event(101)
    client.post("/api/tasks", json={"event_id": 101, "title": "Duplicate Task"})
    response = client.post("/api/tasks", json={"event_id": 101, "title": "Duplicate Task"})
    assert response.status_code == 201
    assert response.json() == {"event_id": 101, "id": 4, "title": "Duplicate Task"}

# Test Case 8: Get Tasks for Event with Tasks
def test_get_tasks_for_event_with_tasks():
    create_event(101)
    client.post("/api/tasks", json={"event_id": 101, "title": "Sample Task"})
    client.post("/api/tasks", json={"event_id": 101, "title": ""})
    max_title = "T" * 255
    client.post("/api/tasks", json={"event_id": 101, "title": max_title})
    client.post("/api/tasks", json={"event_id": 101, "title": "Duplicate Task"})
    response = client.get("/api/tasks?event_id=101")
    assert response.status_code == 200
    assert response.json() == {
        "tasks": [
            {"event_id": 101, "id": 1, "title": "Sample Task"},
            {"event_id": 101, "id": 2, "title": ""},
            {"event_id": 101, "id": 3, "title": max_title},
            {"event_id": 101, "id": 4, "title": "Duplicate Task"},
        ]
    }

# Test Case 9: Get Tasks for Event with No Tasks
def test_get_tasks_for_event_with_no_tasks():
    create_event(102)
    response = client.get("/api/tasks?event_id=102")
    assert response.status_code == 200
    assert response.json() == {"tasks": []}

# Test Case 10: Get Tasks for Non-existent Event
def test_get_tasks_for_nonexistent_event():
    response = client.get("/api/tasks?event_id=9999")
    assert response.status_code == 200
    assert response.json() == {"tasks": []}

# Test Case 11: Reassign Task to Another Valid Event
def test_reassign_task_to_another_valid_event():
    create_event(101)
    create_event(102)
    client.post("/api/tasks", json={"event_id": 101, "title": "Sample Task"})
    response = client.put("/api/tasks/1", json={"event_id": 102})
    assert response.status_code == 200
    assert response.json() == {"event_id": 102, "id": 1, "title": "Sample Task"}

# Test Case 12: Reassign Task to Non-existent Event
def test_reassign_task_to_nonexistent_event():
    create_event(101)
    client.post("/api/tasks", json={"event_id": 101, "title": "Sample Task"})
    response = client.put("/api/tasks/1", json={"event_id": 9999})
    assert response.status_code == 400
    assert response.json() == {"error": "Event does not exist."}

# Test Case 13: Reassign Non-existent Task
def test_reassign_nonexistent_task():
    create_event(101)
    response = client.put("/api/tasks/9999", json={"event_id": 101})
    assert response.status_code == 404
    assert response.json() == {"error": "Task does not exist."}

# Test Case 14: Remove Task from Event by Deletion
def test_remove_task_from_event_by_deletion():
    create_event(102)
    client.post("/api/tasks", json={"event_id": 102, "title": "Sample Task"})
    response = client.delete("/api/tasks/1")
    assert response.status_code == 204
    assert response.content == b""

# Test Case 15: Delete Non-existent Task
def test_delete_nonexistent_task():
    response = client.delete("/api/tasks/9999")
    assert response.status_code == 404
    assert response.json() == {"error": "Task does not exist."}

# Test Case 16: Delete Event and Associated Tasks
def test_delete_event_and_associated_tasks():
    create_event(101)
    client.post("/api/tasks", json={"event_id": 101, "title": ""})
    max_title = "T" * 255
    client.post("/api/tasks", json={"event_id": 101, "title": max_title})
    client.post("/api/tasks", json={"event_id": 101, "title": "Duplicate Task"})
    response = client.delete("/api/events/101")
    assert response.status_code == 204
    assert response.content == b""
    # Check tasks are deleted
    response = client.get("/api/tasks?event_id=101")
    assert response.status_code == 200
    assert response.json() == {"tasks": []}

# Test Case 17: Delete Non-existent Event
def test_delete_nonexistent_event():
    response = client.delete("/api/events/9999")
    assert response.status_code == 404
    assert response.json() == {"error": "Event does not exist."}

# Test Case 18: Task Without Event Association
def test_task_without_event_association():
    response = client.post("/api/tasks", json={"title": "No Event"})
    assert response.status_code == 400
    assert response.json() == {"error": "event_id is required."}

# Test Case 19: Remove Task from Event without Assignment
def test_remove_task_from_event_without_assignment():
    create_event(101)
    client.post("/api/tasks", json={"event_id": 101, "title": ""})
    response = client.put("/api/tasks/2", json={"event_id": None})
    assert response.status_code == 400
    assert response.json() == {"error": "Task must be associated with a valid event."}
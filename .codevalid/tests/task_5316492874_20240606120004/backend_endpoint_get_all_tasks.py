import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.models.event import Event
from backend.models.task import Task
from backend.services.task_service import TaskService
from backend.database import get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_teardown_db(monkeypatch):
    """
    Setup and teardown for each test.
    Mocks TaskService and DB for isolation.
    """
    # Mock DB and TaskService methods
    tasks_data = [
        Task(id=101, event_id=1, name="Task 1"),
        Task(id=102, event_id=1, name="Task 2"),
        Task(id=103, event_id=2, name="Task 3"),
    ]
    events_data = [
        Event(id=1, name="Event 1"),
        Event(id=2, name="Event 2"),
        Event(id=3, name="Event 3"),
        Event(id=4, name="Event 4"),
    ]

    def mock_get_all_tasks(event_id=None):
        if event_id is None:
            return tasks_data
        if not isinstance(event_id, int):
            raise ValueError("Invalid event_id parameter. Must be an integer.")
        return [task for task in tasks_data if task.event_id == event_id]

    monkeypatch.setattr(TaskService, "get_all_tasks", staticmethod(mock_get_all_tasks))
    # No DB teardown needed for mocks

# Test Case 1: Get Tasks By Existing Event
def test_get_tasks_by_existing_event():
    response = client.get("/api/tasks?event_id=1")
    assert response.status_code == 200
    assert response.json() == {
        "tasks": [
            {"event_id": 1, "id": 101, "name": "Task 1"},
            {"event_id": 1, "id": 102, "name": "Task 2"},
        ]
    }

# Test Case 2: Get Tasks By Non-existent Event
def test_get_tasks_by_non_existent_event():
    response = client.get("/api/tasks?event_id=9999")
    assert response.status_code == 200
    assert response.json() == {"tasks": []}

# Test Case 3: Get All Tasks Without Event Filter
def test_get_all_tasks_without_event_filter():
    response = client.get("/api/tasks")
    assert response.status_code == 200
    assert response.json() == {
        "tasks": [
            {"event_id": 1, "id": 101, "name": "Task 1"},
            {"event_id": 2, "id": 103, "name": "Task 3"},
        ]
    }

# Test Case 4: Get Tasks By Event With No Tasks
def test_get_tasks_by_event_with_no_tasks():
    response = client.get("/api/tasks?event_id=3")
    assert response.status_code == 200
    assert response.json() == {"tasks": []}

# Test Case 5: Get Tasks With Invalid Event ID Type
def test_get_tasks_with_invalid_event_id_type():
    response = client.get("/api/tasks?event_id=abc")
    assert response.status_code == 400
    assert response.json() == {"error": "Invalid event_id parameter. Must be an integer."}

# Test Case 6: Get Tasks Without Event ID Parameter
def test_get_tasks_without_event_id_parameter():
    response = client.get("/api/tasks")
    assert response.status_code == 200
    assert response.json() == {
        "tasks": [
            {"event_id": 1, "id": 101, "name": "Task 1"},
            {"event_id": 1, "id": 102, "name": "Task 2"},
            {"event_id": 2, "id": 103, "name": "Task 3"},
        ]
    }

# Test Case 7: Get Tasks By Event After Event Deletion
def test_get_tasks_by_event_after_event_deletion(monkeypatch):
    # Simulate event deletion by removing tasks with event_id=4
    def mock_get_all_tasks(event_id=None):
        if event_id == 4:
            return []
        return [
            Task(id=101, event_id=1, name="Task 1"),
            Task(id=102, event_id=1, name="Task 2"),
            Task(id=103, event_id=2, name="Task 3"),
        ]
    monkeypatch.setattr(TaskService, "get_all_tasks", staticmethod(mock_get_all_tasks))
    response = client.get("/api/tasks?event_id=4")
    assert response.status_code == 200
    assert response.json() == {"tasks": []}

# Test Case 8: Get Tasks By Event with Large Event ID
def test_get_tasks_by_event_with_large_event_id():
    response = client.get("/api/tasks?event_id=999999999")
    assert response.status_code == 200
    assert response.json() == {"tasks": []}

# Test Case 9: Get Tasks With Special Characters in Event ID
def test_get_tasks_with_special_characters_in_event_id():
    response = client.get("/api/tasks?event_id=1!@#")
    assert response.status_code == 400
    assert response.json() == {"error": "Invalid event_id parameter. Must be an integer."}

# Test Case 10: Get Tasks When No Events or Tasks Exist
def test_get_tasks_when_no_events_or_tasks_exist(monkeypatch):
    def mock_get_all_tasks(event_id=None):
        return []
    monkeypatch.setattr(TaskService, "get_all_tasks", staticmethod(mock_get_all_tasks))
    response = client.get("/api/tasks")
    assert response.status_code == 200
    assert response.json() == {"tasks": []}
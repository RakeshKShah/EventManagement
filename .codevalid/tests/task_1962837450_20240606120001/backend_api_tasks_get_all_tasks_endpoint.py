import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.api.tasks import router as tasks_router
from backend.services.task_service import TaskService
from backend.schemas.task import TaskResponse

app = FastAPI()
app.include_router(tasks_router)

@pytest.fixture
def client():
    return TestClient(app)

# Helper: Generate TaskResponse dict
def task_dict(id, title, description, status, event_id):
    return {
        "id": id,
        "title": title,
        "description": description,
        "status": status,
        "event_id": event_id
    }

# Test Case 1: View all tasks - Success
def test_view_all_tasks_success(client):
    tasks = [
        task_dict(1, "Task 1", "First task", "open", 100),
        task_dict(2, "Task 2", "Second task", "closed", 101)
    ]
    with patch.object(TaskService, "get_all_tasks", return_value=[TaskResponse(**t) for t in tasks]):
        response = client.get("/api/tasks")
        assert response.status_code == 200
        assert response.json() == tasks

# Test Case 2: Filter tasks by event_id - Success
def test_filter_tasks_by_event_id_success(client):
    tasks = [
        task_dict(1, "Task 1", "First task", "open", 100)
    ]
    with patch.object(TaskService, "get_all_tasks", return_value=[TaskResponse(**t) for t in tasks]):
        response = client.get("/api/tasks?event_id=100")
        assert response.status_code == 200
        assert response.json() == tasks

# Test Case 3: No tasks in system
def test_no_tasks_in_system(client):
    with patch.object(TaskService, "get_all_tasks", return_value=[]):
        response = client.get("/api/tasks")
        assert response.status_code == 200
        assert response.json() == []

# Test Case 4: Filter by event_id - No tasks found
def test_filter_by_event_id_no_tasks_found(client):
    with patch.object(TaskService, "get_all_tasks", return_value=[]):
        response = client.get("/api/tasks?event_id=999")
        assert response.status_code == 200
        assert response.json() == []

# Test Case 5: Filter by event_id - Invalid type
def test_filter_by_event_id_invalid_type(client):
    response = client.get("/api/tasks?event_id=abc")
    assert response.status_code == 400
    assert "error" in response.json() or "detail" in response.json()
    # Accept either error or detail key depending on FastAPI validation
    assert "event_id" in response.json().get("detail", "") or "Invalid event_id" in str(response.json())

# Test Case 6: Server error during task retrieval
def test_server_error_during_task_retrieval(client):
    with patch.object(TaskService, "get_all_tasks", side_effect=Exception("Internal server error")):
        response = client.get("/api/tasks")
        assert response.status_code == 500
        assert "error" in response.json() or "detail" in response.json()
        assert "Internal server error" in str(response.json())

# Test Case 7: Response Content-Type header
def test_response_content_type_header(client):
    with patch.object(TaskService, "get_all_tasks", return_value=[]):
        response = client.get("/api/tasks")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("application/json")

# Test Case 8: Task fields validation
def test_task_fields_validation(client):
    tasks = [
        task_dict(3, "Task 3", "Third task", "open", 101)
    ]
    with patch.object(TaskService, "get_all_tasks", return_value=[TaskResponse(**t) for t in tasks]):
        response = client.get("/api/tasks")
        assert response.status_code == 200
        for task in response.json():
            assert set(task.keys()) == {"id", "title", "description", "status", "event_id"}

# Test Case 9: Large number of tasks
def test_large_number_of_tasks(client):
    tasks = [
        task_dict(i, f"Task {i}", "Desc", "open", 100)
        for i in range(1, 1001)
    ]
    with patch.object(TaskService, "get_all_tasks", return_value=[TaskResponse(**t) for t in tasks]):
        response = client.get("/api/tasks")
        assert response.status_code == 200
        assert len(response.json()) == 1000
        for i, task in enumerate(response.json()):
            assert task["id"] == i + 1
            assert task["title"] == f"Task {i+1}"
            assert task["description"] == "Desc"
            assert task["status"] == "open"
            assert task["event_id"] == 100

# Test Case 10: Task with long title and description
def test_task_with_long_title_and_description(client):
    long_title = "T" * 255
    long_desc = "D" * 1024
    tasks = [
        task_dict(10, long_title, long_desc, "open", 200)
    ]
    with patch.object(TaskService, "get_all_tasks", return_value=[TaskResponse(**t) for t in tasks]):
        response = client.get("/api/tasks")
        assert response.status_code == 200
        returned = response.json()[0]
        assert returned["title"] == long_title
        assert returned["description"] == long_desc
        assert returned["id"] == 10
        assert returned["status"] == "open"
        assert returned["event_id"] == 200
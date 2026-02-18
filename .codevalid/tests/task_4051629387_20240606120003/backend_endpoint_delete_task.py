import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from backend.api.tasks import router as tasks_router
from backend.services.task_service import TaskService
from backend.models.task import Task
import backend.database as db

app = FastAPI()
app.include_router(tasks_router)

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_teardown_db(monkeypatch):
    # Setup: clear and mock DB for each test
    db._tasks = {}
    db._auth_required = False

    def mock_get_task_service():
        return TaskService()
    monkeypatch.setattr("backend.api.tasks.get_task_service", mock_get_task_service)
    yield
    db._tasks = {}
    db._auth_required = False

def add_task(task_id, title="Sample Task", status="open"):
    db._tasks[task_id] = Task(id=task_id, title=title, status=status)

def enable_auth():
    db._auth_required = True

def disable_auth():
    db._auth_required = False

def auth_headers():
    return {"Authorization": "Bearer validtoken"}

# Test Case 1: Delete Task with Valid ID
def test_delete_task_with_valid_id():
    add_task(123, title="Test Task", status="open")
    response = client.delete("/api/tasks/123", headers=auth_headers())
    assert response.status_code == 204
    assert 123 not in db._tasks

# Test Case 2: Delete Task with Nonexistent ID
def test_delete_task_with_nonexistent_id():
    response = client.delete("/api/tasks/9999", headers=auth_headers())
    assert response.status_code == 404
    assert response.json() == {'detail': 'Task not found'}

# Test Case 3: Retrieve Task After Deletion
def test_retrieve_task_after_deletion():
    add_task(124, title="To Delete", status="open")
    del_response = client.delete("/api/tasks/124", headers=auth_headers())
    assert del_response.status_code == 204
    get_response = client.get("/api/tasks/124", headers=auth_headers())
    assert get_response.status_code == 404
    assert get_response.json() == {'detail': 'Task not found'}

# Test Case 4: Other Tasks Remain After Deletion
def test_other_tasks_remain_after_deletion():
    add_task(125, title="Another Task", status="open")
    add_task(126, title="To Delete", status="open")
    del_response = client.delete("/api/tasks/126", headers=auth_headers())
    assert del_response.status_code == 204
    get_response = client.get("/api/tasks/125", headers=auth_headers())
    assert get_response.status_code == 200
    assert get_response.json() == {'id': 125, 'status': 'open', 'title': 'Another Task'}

# Test Case 5: Delete Task with Invalid ID Format
@pytest.mark.parametrize("invalid_id", ["abc", "1.5", "12a", " "])
def test_delete_task_with_invalid_id_format(invalid_id):
    response = client.delete(f"/api/tasks/{invalid_id}", headers=auth_headers())
    assert response.status_code == 422
    assert response.json() == {'detail': 'Invalid task ID format'}

# Test Case 6: Delete Task with Minimum Allowed ID
def test_delete_task_with_minimum_allowed_id():
    add_task(1, title="Min ID Task", status="open")
    response = client.delete("/api/tasks/1", headers=auth_headers())
    assert response.status_code == 204
    assert 1 not in db._tasks

# Test Case 7: Delete Task with Negative ID
def test_delete_task_with_negative_id():
    response = client.delete("/api/tasks/-10", headers=auth_headers())
    assert response.status_code == 422
    assert response.json() == {'detail': 'Invalid task ID format'}

# Test Case 8: Delete Task with Zero ID
def test_delete_task_with_zero_id():
    response = client.delete("/api/tasks/0", headers=auth_headers())
    assert response.status_code == 422
    assert response.json() == {'detail': 'Invalid task ID format'}

# Test Case 9: Delete Task with ID Having Leading Zeros
def test_delete_task_with_id_leading_zeros():
    add_task(123, title="Task with Leading Zeros", status="open")
    response = client.delete("/api/tasks/000123", headers=auth_headers())
    assert response.status_code == 204
    assert 123 not in db._tasks

# Test Case 10: Delete Task Without Authentication
def test_delete_task_without_authentication():
    add_task(127, title="Auth Required Task", status="open")
    enable_auth()
    response = client.delete("/api/tasks/127")
    assert response.status_code == 401
    assert response.json() == {'detail': 'Authentication credentials were not provided.'}
    disable_auth()
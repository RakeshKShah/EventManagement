import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_tasks(monkeypatch):
    """
    Setup and teardown for tasks in the database.
    Mocks TaskService and authentication as needed.
    """
    from backend.services.task_service import TaskService

    # In-memory task store for mocking
    tasks = {
        1: {"id": 1, "status": "open", "title": "Minimum Task"},
        123: {"id": 123, "status": "open", "title": "Test Task"},
        124: {"id": 124, "status": "open", "title": "To Delete"},
        125: {"id": 125, "status": "open", "title": "Another Task"},
        126: {"id": 126, "status": "open", "title": "Delete Me"},
        127: {"id": 127, "status": "open", "title": "Auth Task"},
        000123: {"id": 123, "status": "open", "title": "Test Task"},  # Leading zeros
    }

    class MockTaskService:
        @staticmethod
        def delete_task(task_id):
            if not isinstance(task_id, int) or task_id <= 0:
                raise ValueError("Invalid task ID format")
            if task_id not in tasks:
                raise KeyError("Task not found")
            del tasks[task_id]

        @staticmethod
        def get_task(task_id):
            if not isinstance(task_id, int) or task_id <= 0:
                raise ValueError("Invalid task ID format")
            if task_id not in tasks:
                raise KeyError("Task not found")
            return tasks[task_id]

    monkeypatch.setattr(TaskService, "delete_task", MockTaskService.delete_task)
    monkeypatch.setattr(TaskService, "get_task", MockTaskService.get_task)

    # Mock authentication dependency if present
    try:
        from backend.api.tasks import get_current_user
        monkeypatch.setattr("backend.api.tasks.get_current_user", lambda: {"id": 1, "username": "testuser"})
    except ImportError:
        pass

    yield

def auth_headers():
    return {"Authorization": "Bearer testtoken"}

# Test Case 1: Delete Task with Valid ID
def test_delete_task_with_valid_id():
    # Given: Task with ID 123 exists
    response = client.delete("/api/tasks/123", headers=auth_headers())
    assert response.status_code == 204
    assert response.content == b""

# Test Case 2: Delete Task with Nonexistent ID
def test_delete_task_with_nonexistent_id():
    response = client.delete("/api/tasks/9999", headers=auth_headers())
    assert response.status_code == 404
    assert response.json() == {"detail": "Task not found"}

# Test Case 3: Retrieve Task After Deletion
def test_retrieve_task_after_deletion():
    # Delete task 124
    del_response = client.delete("/api/tasks/124", headers=auth_headers())
    assert del_response.status_code == 204
    # Try to GET task 124
    get_response = client.get("/api/tasks/124", headers=auth_headers())
    assert get_response.status_code == 404
    assert get_response.json() == {"detail": "Task not found"}

# Test Case 4: Other Tasks Remain After Deletion
def test_other_tasks_remain_after_deletion():
    # Delete task 126
    del_response = client.delete("/api/tasks/126", headers=auth_headers())
    assert del_response.status_code == 204
    # Task 125 should still exist
    get_response = client.get("/api/tasks/125", headers=auth_headers())
    assert get_response.status_code == 200
    assert get_response.json() == {"id": 125, "status": "open", "title": "Another Task"}

# Test Case 5: Delete Task with Invalid ID Format
@pytest.mark.parametrize("invalid_id", ["abc", "1.5", "12a", " "])
def test_delete_task_with_invalid_id_format(invalid_id):
    response = client.delete(f"/api/tasks/{invalid_id}", headers=auth_headers())
    assert response.status_code == 422
    assert response.json() == {"detail": "Invalid task ID format"}

# Test Case 6: Delete Task with Minimum Allowed ID
def test_delete_task_with_minimum_allowed_id():
    response = client.delete("/api/tasks/1", headers=auth_headers())
    assert response.status_code == 204
    assert response.content == b""

# Test Case 7: Delete Task with Negative ID
def test_delete_task_with_negative_id():
    response = client.delete("/api/tasks/-10", headers=auth_headers())
    assert response.status_code == 422
    assert response.json() == {"detail": "Invalid task ID format"}

# Test Case 8: Delete Task with Zero ID
def test_delete_task_with_zero_id():
    response = client.delete("/api/tasks/0", headers=auth_headers())
    assert response.status_code == 422
    assert response.json() == {"detail": "Invalid task ID format"}

# Test Case 9: Delete Task with ID Having Leading Zeros
def test_delete_task_with_id_leading_zeros():
    response = client.delete("/api/tasks/000123", headers=auth_headers())
    assert response.status_code == 204
    assert response.content == b""

# Test Case 10: Delete Task Without Authentication
def test_delete_task_without_authentication():
    response = client.delete("/api/tasks/127")
    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication credentials were not provided."}
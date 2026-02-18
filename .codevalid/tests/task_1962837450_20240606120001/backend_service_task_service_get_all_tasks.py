import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import status
from backend.main import app
from backend.services.task_service import TaskService
from backend.repositories.task_repository import TaskRepository
from backend.schemas.task import TaskResponse, TaskStatus
from backend.models.task import Task
from backend.api.tasks import router as tasks_router

import datetime

client = TestClient(app)

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def sample_tasks():
    now = datetime.datetime.utcnow()
    return [
        Task(
            id=1,
            title="Task 1",
            description="Desc 1",
            status=TaskStatus.TODO,
            event_id=1,
            created_at=now,
            updated_at=now
        ),
        Task(
            id=2,
            title="Task 2",
            description="Desc 2",
            status=TaskStatus.IN_PROGRESS,
            event_id=2,
            created_at=now,
            updated_at=now
        ),
        Task(
            id=3,
            title="Task 3",
            description="Desc 3",
            status=TaskStatus.COMPLETED,
            event_id=1,
            created_at=now,
            updated_at=now
        ),
    ]

@pytest.fixture
def task_service(mock_db):
    return TaskService(mock_db)

# Test Case 1: get_all_tasks_without_event_id_returns_all_tasks
def test_get_all_tasks_without_event_id_returns_all_tasks(task_service, sample_tasks):
    with patch.object(TaskRepository, 'get_all', return_value=sample_tasks):
        responses = task_service.get_all_tasks(event_id=None)
        assert isinstance(responses, list)
        assert len(responses) == len(sample_tasks)
        for resp, task in zip(responses, sample_tasks):
            assert resp.id == task.id
            assert resp.title == task.title
            assert resp.description == task.description
            assert resp.status == task.status
            assert resp.event_id == task.event_id

# Test Case 2: get_all_tasks_with_event_id_filter_returns_only_event_tasks
def test_get_all_tasks_with_event_id_filter_returns_only_event_tasks(task_service, sample_tasks):
    filtered_tasks = [t for t in sample_tasks if t.event_id == 1]
    with patch.object(TaskRepository, 'get_all', return_value=filtered_tasks):
        responses = task_service.get_all_tasks(event_id=1)
        assert all(resp.event_id == 1 for resp in responses)
        assert len(responses) == len(filtered_tasks)

# Test Case 3: get_all_tasks_returns_empty_list_when_no_tasks_exist
def test_get_all_tasks_returns_empty_list_when_no_tasks_exist(task_service):
    with patch.object(TaskRepository, 'get_all', return_value=[]):
        responses = task_service.get_all_tasks(event_id=None)
        assert responses == []

# Test Case 4: get_all_tasks_with_event_id_no_tasks_returns_empty_list
def test_get_all_tasks_with_event_id_no_tasks_returns_empty_list(task_service):
    with patch.object(TaskRepository, 'get_all', return_value=[]):
        responses = task_service.get_all_tasks(event_id=99)
        assert responses == []

# Test Case 5: get_all_tasks_response_includes_all_required_fields(task_service, sample_tasks)
def test_get_all_tasks_response_includes_all_required_fields(task_service, sample_tasks):
    with patch.object(TaskRepository, 'get_all', return_value=sample_tasks):
        responses = task_service.get_all_tasks(event_id=None)
        for resp in responses:
            assert hasattr(resp, "id")
            assert hasattr(resp, "title")
            assert hasattr(resp, "description")
            assert hasattr(resp, "status")
            assert hasattr(resp, "event_id")

# Test Case 6: get_all_tasks_response_has_json_content_type
def test_get_all_tasks_response_has_json_content_type(monkeypatch, sample_tasks):
    def mock_get_all(event_id):
        return sample_tasks
    monkeypatch.setattr(TaskService, "get_all_tasks", lambda self, event_id=None: [
        TaskResponse.model_validate(task) for task in sample_tasks
    ])
    response = client.get("/api/tasks")
    assert response.headers["content-type"].startswith("application/json")

# Test Case 7: get_all_tasks_success_returns_200_status
def test_get_all_tasks_success_returns_200_status(monkeypatch, sample_tasks):
    monkeypatch.setattr(TaskService, "get_all_tasks", lambda self, event_id=None: [
        TaskResponse.model_validate(task) for task in sample_tasks
    ])
    response = client.get("/api/tasks")
    assert response.status_code == status.HTTP_200_OK

# Test Case 8: get_all_tasks_handles_internal_error
def test_get_all_tasks_handles_internal_error(monkeypatch):
    def raise_exception(event_id):
        raise Exception("DB connection failed")
    monkeypatch.setattr(TaskService, "get_all_tasks", raise_exception)
    response = client.get("/api/tasks")
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert "error" in response.json() or "detail" in response.json()

# Test Case 9: get_all_tasks_with_invalid_event_id_type_returns_error
def test_get_all_tasks_with_invalid_event_id_type_returns_error():
    response = client.get("/api/tasks?event_id=invalid")
    assert response.status_code == status.HTTP_400_BAD_REQUEST or response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "error" in response.json() or "detail" in response.json()

# Test Case 10: get_all_tasks_with_large_number_of_tasks
def test_get_all_tasks_with_large_number_of_tasks(monkeypatch):
    now = datetime.datetime.utcnow()
    large_tasks = [
        Task(
            id=i,
            title=f"Task {i}",
            description=f"Desc {i}",
            status=TaskStatus.TODO,
            event_id=1,
            created_at=now,
            updated_at=now
        ) for i in range(1, 1001)
    ]
    monkeypatch.setattr(TaskService, "get_all_tasks", lambda self, event_id=None: [
        TaskResponse.model_validate(task) for task in large_tasks
    ])
    response = client.get("/api/tasks")
    assert response.status_code == status.HTTP_200_OK
    assert isinstance(response.json(), list)
    assert len(response.json()) == 1000
    for item in response.json():
        assert "id" in item
        assert "title" in item
        assert "description" in item
        assert "status" in item
        assert "event_id" in item
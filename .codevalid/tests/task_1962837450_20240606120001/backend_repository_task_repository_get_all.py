import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from backend.main import app
from backend.models.task import Task, TaskStatus
from backend.repositories.task_repository import TaskRepository
from backend.database import get_db
from unittest.mock import MagicMock, patch

client = TestClient(app)

@pytest.fixture
def mock_db_session():
    # Create a MagicMock for Session
    return MagicMock(spec=Session)

@pytest.fixture
def sample_tasks():
    return [
        Task(id=1, title="Task 1", description="Desc 1", status=TaskStatus.TODO, event_id=10),
        Task(id=2, title="Task 2", description="Desc 2", status=TaskStatus.IN_PROGRESS, event_id=20),
        Task(id=3, title="Task 3", description="Desc 3", status=TaskStatus.COMPLETED, event_id=10),
    ]

# --- Repository Tests ---

def test_get_all_tasks_without_event_id_tasks_exist(mock_db_session, sample_tasks):
    # Given: Multiple tasks with different event_ids
    mock_db_session.query.return_value = MagicMock()
    mock_db_session.query.return_value.all.return_value = sample_tasks

    repo = TaskRepository(mock_db_session)
    result = repo.get_all()
    assert len(result) == 3
    assert {t.id for t in result} == {1, 2, 3}
    for task in result:
        assert hasattr(task, "id")
        assert hasattr(task, "title")
        assert hasattr(task, "description")
        assert hasattr(task, "status")
        assert hasattr(task, "event_id")

def test_get_all_tasks_with_event_id_tasks_exist(mock_db_session, sample_tasks):
    # Given: Tasks with event_id=10 exist
    filtered_tasks = [t for t in sample_tasks if t.event_id == 10]
    mock_query = MagicMock()
    mock_query.filter.return_value.all.return_value = filtered_tasks
    mock_db_session.query.return_value = mock_query

    repo = TaskRepository(mock_db_session)
    result = repo.get_all(event_id=10)
    assert len(result) == 2
    for task in result:
        assert task.event_id == 10

def test_get_all_tasks_with_event_id_no_tasks_exist(mock_db_session, sample_tasks):
    # Given: No tasks with event_id=99
    mock_query = MagicMock()
    mock_query.filter.return_value.all.return_value = []
    mock_db_session.query.return_value = mock_query

    repo = TaskRepository(mock_db_session)
    result = repo.get_all(event_id=99)
    assert result == []

def test_get_all_tasks_no_tasks_exist(mock_db_session):
    # Given: No tasks in DB
    mock_db_session.query.return_value = MagicMock()
    mock_db_session.query.return_value.all.return_value = []

    repo = TaskRepository(mock_db_session)
    result = repo.get_all()
    assert result == []

def test_get_all_tasks_event_id_does_not_correspond_to_any_event(mock_db_session):
    # Given: No tasks with event_id=12345
    mock_query = MagicMock()
    mock_query.filter.return_value.all.return_value = []
    mock_db_session.query.return_value = mock_query

    repo = TaskRepository(mock_db_session)
    result = repo.get_all(event_id=12345)
    assert result == []

def test_get_all_tasks_event_id_invalid_type_string(mock_db_session):
    # Given: event_id is a string
    repo = TaskRepository(mock_db_session)
    with pytest.raises(Exception):
        repo.get_all(event_id="abc")

def test_get_all_tasks_event_id_null(mock_db_session, sample_tasks):
    # Given: event_id=None returns all tasks
    mock_db_session.query.return_value = MagicMock()
    mock_db_session.query.return_value.all.return_value = sample_tasks

    repo = TaskRepository(mock_db_session)
    result = repo.get_all(event_id=None)
    assert len(result) == 3

def test_get_all_tasks_database_error(mock_db_session):
    # Given: DB error during retrieval
    mock_db_session.query.side_effect = SQLAlchemyError("DB error")
    repo = TaskRepository(mock_db_session)
    with pytest.raises(SQLAlchemyError):
        repo.get_all()

# --- API Endpoint Tests ---

def test_get_all_tasks_response_format(monkeypatch):
    # Given: Successful API call returns JSON
    sample_response = [
        {
            "id": 1,
            "title": "Task 1",
            "description": "Desc 1",
            "status": "To Do",
            "event_id": 10,
            "created_at": "2024-06-06T12:00:00",
            "updated_at": "2024-06-06T12:00:00"
        }
    ]
    with patch("backend.services.task_service.TaskService.get_all_tasks", return_value=sample_response):
        response = client.get("/api/tasks")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("application/json")
        assert isinstance(response.json(), list)
        assert response.json()[0]["id"] == 1

def test_get_all_tasks_http_status_200(monkeypatch):
    # Given: Successful API call returns HTTP 200
    sample_response = [
        {
            "id": 1,
            "title": "Task 1",
            "description": "Desc 1",
            "status": "To Do",
            "event_id": 10,
            "created_at": "2024-06-06T12:00:00",
            "updated_at": "2024-06-06T12:00:00"
        }
    ]
    with patch("backend.services.task_service.TaskService.get_all_tasks", return_value=sample_response):
        response = client.get("/api/tasks")
        assert response.status_code == 200

def test_get_all_tasks_event_id_invalid_type_string_api(monkeypatch):
    # Given: event_id is a string via API
    response = client.get("/api/tasks?event_id=abc")
    assert response.status_code in (400, 422)
    assert "error" in response.text or "detail" in response.text

def test_get_all_tasks_database_error_api(monkeypatch):
    # Given: DB error during API call
    with patch("backend.services.task_service.TaskService.get_all_tasks", side_effect=SQLAlchemyError("DB error")):
        response = client.get("/api/tasks")
        assert response.status_code == 500 or response.status_code == 422 or response.status_code == 400

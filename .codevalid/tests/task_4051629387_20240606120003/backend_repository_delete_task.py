import pytest
from unittest.mock import MagicMock, patch
from backend.repositories.task_repository import TaskRepository
from backend.models.task import Task
from backend.database import SessionLocal
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture
def db_session():
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture
def task_repository(db_session):
    return TaskRepository(db_session)

@pytest.fixture
def test_client():
    return TestClient(app)

def add_task(session, task_id):
    task = Task(id=task_id, title=f"Task {task_id}", description="Test task")
    session.add(task)
    session.commit()
    return task

def get_task(session, task_id):
    return session.query(Task).filter(Task.id == task_id).first()

# Test Case 1: Delete Task With Valid Task ID
def test_delete_task_with_valid_task_id(task_repository, db_session):
    add_task(db_session, 1)
    assert get_task(db_session, 1) is not None
    task_repository.delete(1)
    assert get_task(db_session, 1) is None

# Test Case 2: Delete Task With Non-Existent Task ID
def test_delete_task_with_non_existent_task_id(task_repository, db_session):
    with pytest.raises(Exception) as excinfo:
        task_repository.delete(999)
    assert "404" in str(excinfo.value) or "Not Found" in str(excinfo.value)
    assert get_task(db_session, 999) is None

# Test Case 3: Deleted Task Cannot Be Retrieved
def test_deleted_task_cannot_be_retrieved(task_repository, db_session):
    add_task(db_session, 2)
    task_repository.delete(2)
    result = task_repository.get(2)
    assert result is None or (hasattr(result, "status_code") and result.status_code == 404)

# Test Case 4: Delete Task Returns Success Response
def test_delete_task_returns_success_response(test_client, db_session):
    add_task(db_session, 3)
    response = test_client.delete("/tasks/3")
    assert response.status_code in (200, 204)

# Test Case 5: Delete Task Does Not Affect Other Tasks
def test_delete_task_does_not_affect_other_tasks(task_repository, db_session):
    add_task(db_session, 4)
    add_task(db_session, 5)
    add_task(db_session, 6)
    task_repository.delete(4)
    assert get_task(db_session, 5) is not None
    assert get_task(db_session, 6) is not None

# Test Case 6: Delete Task Called Multiple Times On Same ID
def test_delete_task_called_multiple_times_on_same_id(task_repository, db_session):
    add_task(db_session, 7)
    task_repository.delete(7)
    with pytest.raises(Exception) as excinfo:
        task_repository.delete(7)
    assert "404" in str(excinfo.value) or "Not Found" in str(excinfo.value)

# Test Case 7: Delete Task With Invalid ID Type
def test_delete_task_with_invalid_id_type(task_repository, db_session):
    with pytest.raises(TypeError):
        task_repository.delete("abc")

# Test Case 8: Delete Task In Empty Database
def test_delete_task_in_empty_database(task_repository, db_session):
    with pytest.raises(Exception) as excinfo:
        task_repository.delete(1)
    assert "404" in str(excinfo.value) or "Not Found" in str(excinfo.value)

# Test Case 9: Delete Task With Database Commit Failure
def test_delete_task_with_database_commit_failure(task_repository, db_session):
    add_task(db_session, 8)
    with patch.object(db_session, "commit", side_effect=Exception("DB commit failed")):
        with pytest.raises(Exception) as excinfo:
            task_repository.delete(8)
        assert "DB commit failed" in str(excinfo.value)
    # Task should still exist after failed commit
    assert get_task(db_session, 8) is not None
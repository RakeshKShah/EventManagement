import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException, status
from backend.services.task_service import TaskService
from backend.models.task import Task
from backend.repositories.task_repository import TaskRepository

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def service(mock_db):
    return TaskService(mock_db)

@pytest.fixture
def mock_repository(service):
    repo = MagicMock(spec=TaskRepository)
    service.repository = repo
    return repo

def make_task(task_id):
    return Task(id=task_id, title="Test", description="Desc", status="TODO", event_id=1)

# Test Case 1: Delete Task with Valid Task ID
def test_delete_task_with_valid_task_id(service, mock_repository):
    task_id = 123
    mock_repository.get_by_id.return_value = make_task(task_id)
    mock_repository.delete.return_value = None

    # Should not raise exception
    service.delete_task(task_id)
    mock_repository.delete.assert_called_once()
    mock_repository.get_by_id.assert_called_with(task_id)

# Test Case 2: Delete Task with Non-existent Task ID
def test_delete_task_with_nonexistent_task_id(service, mock_repository):
    task_id = 999
    mock_repository.get_by_id.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.delete_task(task_id)
    assert exc.value.status_code == status.HTTP_404_NOT_FOUND
    assert "Task with id 999 not found" in exc.value.detail

# Test Case 3: Delete Task with Already Deleted Task ID
def test_delete_task_with_already_deleted_task_id(service, mock_repository):
    task_id = 456
    mock_repository.get_by_id.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.delete_task(task_id)
    assert exc.value.status_code == status.HTTP_404_NOT_FOUND
    assert "Task with id 456 not found" in exc.value.detail

# Test Case 4: Delete Task with Null Task ID
def test_delete_task_with_null_task_id(service, mock_repository):
    task_id = None
    mock_repository.get_by_id.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.delete_task(task_id)
    assert exc.value.status_code == status.HTTP_404_NOT_FOUND

# Test Case 5: Delete Task with Invalid String Task ID
def test_delete_task_with_invalid_string_task_id(service, mock_repository):
    task_id = "abc"
    mock_repository.get_by_id.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.delete_task(task_id)
    assert exc.value.status_code == status.HTTP_404_NOT_FOUND

# Test Case 6: Delete Task with Task ID Zero
def test_delete_task_with_task_id_zero(service, mock_repository):
    task_id = 0
    mock_repository.get_by_id.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.delete_task(task_id)
    assert exc.value.status_code == status.HTTP_404_NOT_FOUND

# Test Case 7: Delete Task with Negative Task ID
def test_delete_task_with_negative_task_id(service, mock_repository):
    task_id = -5
    mock_repository.get_by_id.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.delete_task(task_id)
    assert exc.value.status_code == status.HTTP_404_NOT_FOUND

# Test Case 8: Delete Task Does Not Affect Other Tasks or Events
def test_delete_task_does_not_affect_other_tasks(service, mock_repository):
    tasks = {10: make_task(10), 11: make_task(11), 12: make_task(12)}
    mock_repository.get_by_id.side_effect = lambda tid: tasks.get(tid)
    mock_repository.delete.return_value = None

    service.delete_task(10)
    mock_repository.delete.assert_called_once_with(tasks[10])
    # Ensure other tasks are not deleted
    assert mock_repository.delete.call_count == 1
    assert mock_repository.get_by_id.call_args_list[0][0][0] == 10

# Test Case 9: Delete Task with Maximum Integer Task ID
def test_delete_task_with_max_int_task_id(service, mock_repository):
    import sys
    max_int = sys.maxsize
    mock_repository.get_by_id.return_value = make_task(max_int)
    mock_repository.delete.return_value = None

    service.delete_task(max_int)
    mock_repository.delete.assert_called_once_with(make_task(max_int))

# Test Case 10: Retrieve Task After Deletion Returns 404
def test_retrieve_task_after_deletion_returns_404(service, mock_repository):
    task_id = 77
    # Simulate task exists, then deleted, then retrieval returns None
    mock_repository.get_by_id.side_effect = [make_task(task_id), None]
    mock_repository.delete.return_value = None

    service.delete_task(task_id)
    # Now, retrieval should return 404
    with pytest.raises(HTTPException) as exc:
        service.get_task(task_id)
    assert exc.value.status_code == status.HTTP_404_NOT_FOUND
    assert "Task with id 77 not found" in exc.value.detail
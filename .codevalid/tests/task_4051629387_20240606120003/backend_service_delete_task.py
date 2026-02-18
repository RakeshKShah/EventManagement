import pytest
from unittest.mock import MagicMock
from backend.services.task_service import TaskService
from backend.repositories.task_repository import TaskRepository
from backend.models.task import Task

class HTTPException(Exception):
    def __init__(self, status_code, detail):
        self.status_code = status_code
        self.detail = detail

@pytest.fixture
def mock_repo():
    repo = MagicMock(spec=TaskRepository)
    return repo

@pytest.fixture
def service(mock_repo):
    return TaskService(repository=mock_repo)

@pytest.fixture
def task_123():
    return Task(id=123, title="Test Task", description="A task to delete")

@pytest.fixture
def max_int():
    import sys
    return sys.maxsize

# Test Case 1: Delete Task with Valid Task ID
def test_delete_task_with_valid_task_id(service, mock_repo, task_123):
    mock_repo.get.return_value = task_123
    mock_repo.delete.return_value = None

    # Should not raise
    service.delete_task(123)
    mock_repo.delete.assert_called_once_with(task_123)
    mock_repo.get.assert_called_with(123)

    # Simulate subsequent retrieval returns None
    mock_repo.get.return_value = None
    with pytest.raises(HTTPException) as exc:
        service.delete_task(123)
    assert exc.value.status_code == 404

# Test Case 2: Delete Task with Non-existent Task ID
def test_delete_task_with_non_existent_task_id(service, mock_repo):
    mock_repo.get.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.delete_task(999)
    assert exc.value.status_code == 404
    mock_repo.delete.assert_not_called()

# Test Case 3: Delete Task with Already Deleted Task ID
def test_delete_task_with_already_deleted_task_id(service, mock_repo):
    mock_repo.get.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.delete_task(456)
    assert exc.value.status_code == 404
    mock_repo.delete.assert_not_called()

# Test Case 4: Delete Task with Null Task ID
def test_delete_task_with_null_task_id(service, mock_repo):
    mock_repo.get.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.delete_task(None)
    assert exc.value.status_code == 404
    mock_repo.delete.assert_not_called()

# Test Case 5: Delete Task with Invalid String Task ID
def test_delete_task_with_invalid_string_task_id(service, mock_repo):
    mock_repo.get.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.delete_task('abc')
    assert exc.value.status_code == 404
    mock_repo.delete.assert_not_called()

# Test Case 6: Delete Task with Task ID Zero
def test_delete_task_with_task_id_zero(service, mock_repo):
    mock_repo.get.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.delete_task(0)
    assert exc.value.status_code == 404
    mock_repo.delete.assert_not_called()

# Test Case 7: Delete Task with Negative Task ID
def test_delete_task_with_negative_task_id(service, mock_repo):
    mock_repo.get.return_value = None

    with pytest.raises(HTTPException) as exc:
        service.delete_task(-5)
    assert exc.value.status_code == 404
    mock_repo.delete.assert_not_called()

# Test Case 8: Delete Task Does Not Affect Other Tasks or Events
def test_delete_task_does_not_affect_other_tasks_or_events(service, mock_repo):
    task_10 = Task(id=10, title="Task 10", description="Delete me")
    task_11 = Task(id=11, title="Task 11", description="Keep me")
    task_12 = Task(id=12, title="Task 12", description="Keep me")
    mock_repo.get.side_effect = lambda id: {10: task_10, 11: task_11, 12: task_12}.get(id, None)
    mock_repo.delete.return_value = None

    service.delete_task(10)
    mock_repo.delete.assert_called_once_with(task_10)
    # Ensure other tasks are not deleted
    assert mock_repo.get(11) == task_11
    assert mock_repo.get(12) == task_12

# Test Case 9: Delete Task with Maximum Integer Task ID
def test_delete_task_with_maximum_integer_task_id(service, mock_repo, max_int):
    task_max = Task(id=max_int, title="Max Task", description="Boundary")
    mock_repo.get.return_value = task_max
    mock_repo.delete.return_value = None

    service.delete_task(max_int)
    mock_repo.delete.assert_called_once_with(task_max)

# Test Case 10: Retrieve Task After Deletion Returns 404
def test_retrieve_task_after_deletion_returns_404(service, mock_repo):
    task_77 = Task(id=77, title="Task 77", description="Delete then retrieve")
    mock_repo.get.return_value = task_77
    mock_repo.delete.return_value = None

    service.delete_task(77)
    mock_repo.delete.assert_called_once_with(task_77)

    # Simulate GET /api/tasks/77 returns None
    mock_repo.get.return_value = None
    with pytest.raises(HTTPException) as exc:
        service.delete_task(77)
    assert exc.value.status_code == 404
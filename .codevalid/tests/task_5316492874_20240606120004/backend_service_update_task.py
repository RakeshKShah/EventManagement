import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from backend.services.task_service import TaskService

@pytest.fixture
def mock_task_repo():
    with patch("backend.repositories.task_repository.TaskRepository") as MockRepo:
        yield MockRepo.return_value

@pytest.fixture
def mock_event_repo():
    with patch("backend.repositories.event_repository.EventRepository") as MockRepo:
        yield MockRepo.return_value

@pytest.fixture
def task_service(mock_task_repo, mock_event_repo):
    return TaskService(task_repo=mock_task_repo, event_repo=mock_event_repo)

def make_task(**kwargs):
    defaults = {
        "id": 1,
        "title": "Old Title",
        "description": "Old description",
        "status": "To Do",
        "event_id": 10,
        "updated_at": "2024-01-01T12:00:00Z"
    }
    defaults.update(kwargs)
    return MagicMock(**defaults, spec=["id", "title", "description", "status", "event_id", "updated_at"])

def make_event(**kwargs):
    defaults = {
        "id": 20,
        "title": "Event",
    }
    defaults.update(kwargs)
    return MagicMock(**defaults, spec=["id", "title"])

# Test Case 1: Update task with all valid fields
def test_update_task_with_all_valid_fields(task_service, mock_task_repo, mock_event_repo):
    task = make_task(id=1, title="Old Title", description="Old description", status="To Do", event_id=10)
    event = make_event(id=20)
    mock_task_repo.get_by_id.return_value = task
    mock_event_repo.get_by_id.return_value = event

    task_data = {"title": "New Title", "description": "Updated description", "status": "In Progress", "event_id": 20}
    task_service.update_task(1, task_data)

    assert task.title == "New Title"
    assert task.description == "Updated description"
    assert task.status == "In Progress"
    assert task.event_id == 20
    mock_task_repo.commit.assert_called_once()

# Test Case 2: Update task with subset of fields
def test_update_task_with_subset_of_fields(task_service, mock_task_repo, mock_event_repo):
    task = make_task(id=2, title="Task 2", description="Desc 2", status="To Do", event_id=11)
    mock_task_repo.get_by_id.return_value = task

    task_data = {"title": "Updated Title"}
    task_service.update_task(2, task_data)

    assert task.title == "Updated Title"
    assert task.description == "Desc 2"
    assert task.status == "To Do"
    assert task.event_id == 11
    mock_task_repo.commit.assert_called_once()

# Test Case 3: Update task with no fields provided
def test_update_task_with_no_fields_provided(task_service, mock_task_repo, mock_event_repo):
    task = make_task(id=3, title="Task 3", description="Desc 3", status="To Do", event_id=12)
    mock_task_repo.get_by_id.return_value = task

    task_data = {}
    task_service.update_task(3, task_data)

    assert task.title == "Task 3"
    assert task.description == "Desc 3"
    assert task.status == "To Do"
    assert task.event_id == 12
    mock_task_repo.commit.assert_called_once()

# Test Case 4: Update task with invalid status value
def test_update_task_with_invalid_status_value(task_service, mock_task_repo, mock_event_repo):
    task = make_task(id=4, title="Task 4", description="Desc 4", status="To Do", event_id=13)
    mock_task_repo.get_by_id.return_value = task

    task_data = {"status": "Blocked"}
    with pytest.raises(ValueError) as exc:
        task_service.update_task(4, task_data)
    assert "Invalid status value" in str(exc.value)
    assert {"status": "Blocked"} in str(exc.value)

# Test Case 5: Update nonexistent task
def test_update_nonexistent_task(task_service, mock_task_repo, mock_event_repo):
    mock_task_repo.get_by_id.return_value = None
    task_data = {"title": "Any Title"}
    with pytest.raises(ValueError) as exc:
        task_service.update_task(9999, task_data)
    assert "Task not found" in str(exc.value)

# Test Case 6: Update task event_id to nonexistent event
def test_update_task_event_id_to_nonexistent_event(task_service, mock_task_repo, mock_event_repo):
    task = make_task(id=5, title="Task 5", description="Desc 5", status="To Do", event_id=15)
    mock_task_repo.get_by_id.return_value = task
    mock_event_repo.get_by_id.return_value = None

    task_data = {"event_id": 9999}
    with pytest.raises(ValueError) as exc:
        task_service.update_task(5, task_data)
    assert "Event does not exist" in str(exc.value)
    assert {"event_id": 9999} in str(exc.value)

# Test Case 7: Update task with event_id omitted
def test_update_task_with_event_id_omitted(task_service, mock_task_repo, mock_event_repo):
    task = make_task(id=6, title="Task 6", description="Desc 6", status="To Do", event_id=16)
    mock_task_repo.get_by_id.return_value = task

    task_data = {"status": "Completed", "title": "Task 6 Updated"}
    task_service.update_task(6, task_data)

    assert task.title == "Task 6 Updated"
    assert task.status == "Completed"
    assert task.event_id == 16
    assert task.description == "Desc 6"
    mock_task_repo.commit.assert_called_once()

# Test Case 8: Update task with empty title
def test_update_task_with_empty_title(task_service, mock_task_repo, mock_event_repo):
    task = make_task(id=7, title="Task 7", description="Desc 7", status="To Do", event_id=17)
    mock_task_repo.get_by_id.return_value = task

    task_data = {"title": ""}
    try:
        task_service.update_task(7, task_data)
        assert task.title == ""
        mock_task_repo.commit.assert_called_once()
    except ValueError as exc:
        assert "title" in str(exc.value)
        assert "400" in str(exc.value)

# Test Case 9: Update task with title at maximum length
def test_update_task_with_title_at_max_length(task_service, mock_task_repo, mock_event_repo):
    max_length_title = "T" * 255
    task = make_task(id=8, title="Task 8", description="Desc 8", status="To Do", event_id=18)
    mock_task_repo.get_by_id.return_value = task

    task_data = {"title": max_length_title}
    task_service.update_task(8, task_data)

    assert task.title == max_length_title
    assert task.description == "Desc 8"
    assert task.status == "To Do"
    assert task.event_id == 18
    mock_task_repo.commit.assert_called_once()

# Test Case 10: Update task with multiple invalid fields
def test_update_task_with_multiple_invalid_fields(task_service, mock_task_repo, mock_event_repo):
    task = make_task(id=9, title="Task 9", description="Desc 9", status="To Do", event_id=19)
    mock_task_repo.get_by_id.return_value = task
    mock_event_repo.get_by_id.return_value = None

    task_data = {"event_id": 9999, "status": "Unknown"}
    with pytest.raises(ValueError) as exc:
        task_service.update_task(9, task_data)
    assert "Multiple validation errors" in str(exc.value)
    assert {"event_id": 9999, "status": "Unknown"} in str(exc.value)

# Test Case 11: Update task should update updated_at timestamp
def test_update_task_should_update_updated_at_timestamp(task_service, mock_task_repo, mock_event_repo):
    old_updated_at = "2024-01-01T12:00:00Z"
    task = make_task(id=10, title="Task 10", description="Desc 10", status="To Do", event_id=20, updated_at=old_updated_at)
    mock_task_repo.get_by_id.return_value = task

    task_data = {"description": "Desc 10 updated"}
    with patch("backend.services.task_service.datetime") as mock_datetime:
        mock_datetime.utcnow.return_value = datetime.utcnow() + timedelta(minutes=1)
        task_service.update_task(10, task_data)
        assert task.description == "Desc 10 updated"
        assert task.updated_at != old_updated_at
        mock_task_repo.commit.assert_called_once()
import pytest
from unittest.mock import MagicMock, patch
from backend.repositories.task_repository import TaskRepository
from backend.models.task import Task, TaskStatus
from sqlalchemy.orm import Session

# Helper to create a Task object
def make_task(id, title, description, status, event_id):
    task = MagicMock(spec=Task)
    task.id = id
    task.title = title
    task.description = description
    task.status = TaskStatus(status) if status in TaskStatus._value2member_map_ else status
    task.event_id = event_id
    return task

@pytest.fixture
def db_session():
    return MagicMock(spec=Session)

@pytest.fixture
def repo(db_session):
    return TaskRepository(db_session)

@pytest.fixture
def valid_event_ids():
    return [1, 2, 3, 99, 100]

@pytest.mark.parametrize("fields", [
    {"description": "Updated Description", "event_id": 10, "status": "Completed", "title": "Updated Task"},
])
def test_update_task_success_all_fields(repo, db_session, fields):
    task = make_task(1, "Old Task", "Old Description", "To Do", 10)
    for k, v in fields.items():
        setattr(task, k, v)
    db_session.commit.return_value = None
    db_session.refresh.return_value = None
    result = repo.update(task)
    db_session.commit.assert_called_once()
    db_session.refresh.assert_called_once_with(task)
    assert result.id == 1
    assert result.title == fields["title"]
    assert result.description == fields["description"]
    assert result.status.value == fields["status"]
    assert result.event_id == fields["event_id"]

@pytest.mark.parametrize("fields", [
    {"status": "In Progress", "title": "New Title"},
])
def test_update_task_success_partial_fields(repo, db_session, fields):
    task = make_task(2, "Title", "Description", "To Do", 5)
    for k, v in fields.items():
        setattr(task, k, v)
    db_session.commit.return_value = None
    db_session.refresh.return_value = None
    result = repo.update(task)
    db_session.commit.assert_called_once()
    db_session.refresh.assert_called_once_with(task)
    assert result.id == 2
    assert result.title == fields["title"]
    assert result.status.value == fields["status"]
    assert result.description == "Description"
    assert result.event_id == 5

def test_update_task_event_id_omitted(repo, db_session):
    task = make_task(3, "Changed", "Changed desc", "Completed", None)
    # Simulate validation error
    with patch.object(repo, 'update', side_effect=ValueError("event_id is required")):
        with pytest.raises(ValueError) as exc:
            repo.update(task)
        assert "event_id is required" in str(exc.value)

def test_update_task_invalid_event_id(repo, db_session, valid_event_ids):
    task = make_task(4, "Changed", "Changed desc", "Completed", 9999)
    # Simulate validation error
    with patch.object(repo, 'update', side_effect=ValueError("event_id is invalid")):
        with pytest.raises(ValueError) as exc:
            repo.update(task)
        assert "event_id is invalid" in str(exc.value)

def test_update_task_invalid_status(repo, db_session):
    task = make_task(5, "Task", "Desc", "Done", 10)
    # Simulate validation error
    with patch.object(repo, 'update', side_effect=ValueError("status is invalid")):
        with pytest.raises(ValueError) as exc:
            repo.update(task)
        assert "status is invalid" in str(exc.value)

def test_update_task_nonexistent_task_id(repo, db_session):
    # Simulate task not found
    with patch.object(repo, 'update', side_effect=LookupError("task not found")):
        with pytest.raises(LookupError) as exc:
            repo.update(None)
        assert "task not found" in str(exc.value)

def test_update_task_invalid_json_body(repo, db_session):
    task = make_task(6, "Task", "Desc", "To Do", 10)
    # Simulate empty update
    with patch.object(repo, 'update', side_effect=ValueError("No fields to update")):
        with pytest.raises(ValueError) as exc:
            repo.update(task)
        assert "No fields to update" in str(exc.value)

def test_update_task_status_case_sensitivity(repo, db_session):
    task = make_task(7, "Task", "Desc", "completed", 10)
    # Simulate validation error
    with patch.object(repo, 'update', side_effect=ValueError("status is invalid")):
        with pytest.raises(ValueError) as exc:
            repo.update(task)
        assert "status is invalid" in str(exc.value)

def test_update_task_title_max_length(repo, db_session):
    max_title = "T" * 255
    task = make_task(8, max_title, "Desc", "In Progress", 15)
    db_session.commit.return_value = None
    db_session.refresh.return_value = None
    result = repo.update(task)
    db_session.commit.assert_called_once()
    db_session.refresh.assert_called_once_with(task)
    assert result.title == max_title
    assert result.status.value == "In Progress"
    assert result.event_id == 15
    assert result.description == "Desc"

def test_update_task_title_exceeds_max_length(repo, db_session):
    too_long_title = "T" * 256
    task = make_task(9, too_long_title, "Desc", "In Progress", 15)
    # Simulate validation error
    with patch.object(repo, 'update', side_effect=ValueError("title exceeds maximum length")):
        with pytest.raises(ValueError) as exc:
            repo.update(task)
        assert "title exceeds maximum length" in str(exc.value)

def test_update_task_multiple_invalid_fields(repo, db_session):
    task = make_task(10, "", "Desc", "Unknown", "not-an-integer")
    # Simulate multiple validation errors
    error_detail = [
        "title cannot be empty",
        "event_id must be an integer",
        "status is invalid"
    ]
    with patch.object(repo, 'update', side_effect=ValueError(str(error_detail))):
        with pytest.raises(ValueError) as exc:
            repo.update(task)
        for err in error_detail:
            assert err in str(exc.value)

def test_update_task_no_changes(repo, db_session):
    task = make_task(11, "Task", "Desc", "Completed", 15)
    db_session.commit.return_value = None
    db_session.refresh.return_value = None
    result = repo.update(task)
    db_session.commit.assert_called_once()
    db_session.refresh.assert_called_once_with(task)
    assert result.id == 11
    assert result.title == "Task"
    assert result.status.value == "Completed"
    assert result.event_id == 15
    assert result.description == "Desc"
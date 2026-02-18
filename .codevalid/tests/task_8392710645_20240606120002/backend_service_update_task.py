import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta

from backend.services.task_service import TaskService
from backend.models.task import Task
from backend.models.event import Event

@pytest.fixture
def mock_task_repo():
    repo = MagicMock()
    return repo

@pytest.fixture
def mock_event_repo():
    repo = MagicMock()
    return repo

@pytest.fixture
def task_service(mock_task_repo, mock_event_repo):
    return TaskService(task_repository=mock_task_repo, event_repository=mock_event_repo)

def make_task(data):
    # Simulate Task model creation
    return Task(
        id=data.get('id'),
        title=data.get('title'),
        description=data.get('description'),
        status=data.get('status'),
        event_id=data.get('event_id'),
        updated_at=data.get('updated_at', datetime.utcnow().isoformat())
    )

def make_event(data):
    return Event(
        id=data.get('id'),
        title=data.get('title', 'Event'),
        description=data.get('description', ''),
        start_time=data.get('start_time', datetime.utcnow().isoformat()),
        end_time=data.get('end_time', datetime.utcnow().isoformat())
    )

# Test Case 1: Update task with all valid fields
def test_update_task_with_all_valid_fields(task_service, mock_task_repo, mock_event_repo):
    existing_task = make_task({'id': 1, 'title': 'Old Title', 'description': 'Old description', 'status': 'To Do', 'event_id': 10})
    updated_event = make_event({'id': 20})
    mock_task_repo.get_by_id.return_value = existing_task
    mock_event_repo.get_by_id.return_value = updated_event
    task_data = {'title': 'New Title', 'description': 'Updated description', 'status': 'In Progress', 'event_id': 20}

    with patch.object(task_service, 'validate_status', return_value=True):
        result = task_service.update_task(1, task_data)
        assert result.title == 'New Title'
        assert result.description == 'Updated description'
        assert result.status == 'In Progress'
        assert result.event_id == 20

# Test Case 2: Update task with subset of fields
def test_update_task_with_subset_of_fields(task_service, mock_task_repo):
    existing_task = make_task({'id': 2, 'title': 'Task 2', 'description': 'Desc 2', 'status': 'To Do', 'event_id': 11})
    mock_task_repo.get_by_id.return_value = existing_task
    task_data = {'title': 'Updated Title'}

    with patch.object(task_service, 'validate_status', return_value=True):
        result = task_service.update_task(2, task_data)
        assert result.title == 'Updated Title'
        assert result.description == 'Desc 2'
        assert result.status == 'To Do'
        assert result.event_id == 11

# Test Case 3: Update task with no fields provided
def test_update_task_with_no_fields_provided(task_service, mock_task_repo):
    existing_task = make_task({'id': 3, 'title': 'Task 3', 'description': 'Desc 3', 'status': 'To Do', 'event_id': 12})
    mock_task_repo.get_by_id.return_value = existing_task
    task_data = {}

    with patch.object(task_service, 'validate_status', return_value=True):
        result = task_service.update_task(3, task_data)
        assert result.title == 'Task 3'
        assert result.description == 'Desc 3'
        assert result.status == 'To Do'
        assert result.event_id == 12

# Test Case 4: Update task with invalid status value
def test_update_task_with_invalid_status_value(task_service, mock_task_repo):
    existing_task = make_task({'id': 4, 'title': 'Task 4', 'description': 'Desc 4', 'status': 'To Do', 'event_id': 13})
    mock_task_repo.get_by_id.return_value = existing_task
    task_data = {'status': 'Blocked'}

    with patch.object(task_service, 'validate_status', return_value=False):
        with pytest.raises(ValueError) as exc:
            task_service.update_task(4, task_data)
        assert 'Invalid status value' in str(exc.value)

# Test Case 5: Update nonexistent task
def test_update_nonexistent_task(task_service, mock_task_repo):
    mock_task_repo.get_by_id.return_value = None
    task_data = {'title': 'Any Title'}

    with pytest.raises(LookupError) as exc:
        task_service.update_task(9999, task_data)
    assert 'Task not found' in str(exc.value)

# Test Case 6: Update task event_id to nonexistent event
def test_update_task_event_id_to_nonexistent_event(task_service, mock_task_repo, mock_event_repo):
    existing_task = make_task({'id': 5, 'title': 'Task 5', 'description': 'Desc 5', 'status': 'To Do', 'event_id': 15})
    mock_task_repo.get_by_id.return_value = existing_task
    mock_event_repo.get_by_id.return_value = None
    task_data = {'event_id': 9999}

    with patch.object(task_service, 'validate_status', return_value=True):
        with pytest.raises(ValueError) as exc:
            task_service.update_task(5, task_data)
        assert 'Event does not exist' in str(exc.value)

# Test Case 7: Update task with event_id omitted
def test_update_task_with_event_id_omitted(task_service, mock_task_repo):
    existing_task = make_task({'id': 6, 'title': 'Task 6', 'description': 'Desc 6', 'status': 'To Do', 'event_id': 16})
    mock_task_repo.get_by_id.return_value = existing_task
    task_data = {'status': 'Completed', 'title': 'Task 6 Updated'}

    with patch.object(task_service, 'validate_status', return_value=True):
        result = task_service.update_task(6, task_data)
        assert result.title == 'Task 6 Updated'
        assert result.status == 'Completed'
        assert result.event_id == 16
        assert result.description == 'Desc 6'

# Test Case 8: Update task with empty title
def test_update_task_with_empty_title(task_service, mock_task_repo):
    existing_task = make_task({'id': 7, 'title': 'Task 7', 'description': 'Desc 7', 'status': 'To Do', 'event_id': 17})
    mock_task_repo.get_by_id.return_value = existing_task
    task_data = {'title': ''}

    with patch.object(task_service, 'validate_status', return_value=True):
        try:
            result = task_service.update_task(7, task_data)
            assert result.title == ''
        except ValueError as exc:
            assert 'title' in str(exc.value)

# Test Case 9: Update task with title at maximum length
def test_update_task_with_title_at_maximum_length(task_service, mock_task_repo):
    max_title = 'T' * 255
    existing_task = make_task({'id': 8, 'title': 'Task 8', 'description': 'Desc 8', 'status': 'To Do', 'event_id': 18})
    mock_task_repo.get_by_id.return_value = existing_task
    task_data = {'title': max_title}

    with patch.object(task_service, 'validate_status', return_value=True):
        result = task_service.update_task(8, task_data)
        assert result.title == max_title

# Test Case 10: Update task with multiple invalid fields
def test_update_task_with_multiple_invalid_fields(task_service, mock_task_repo, mock_event_repo):
    existing_task = make_task({'id': 9, 'title': 'Task 9', 'description': 'Desc 9', 'status': 'To Do', 'event_id': 19})
    mock_task_repo.get_by_id.return_value = existing_task
    mock_event_repo.get_by_id.return_value = None
    task_data = {'event_id': 9999, 'status': 'Unknown'}

    with patch.object(task_service, 'validate_status', return_value=False):
        with pytest.raises(ValueError) as exc:
            task_service.update_task(9, task_data)
        assert 'Multiple validation errors' in str(exc.value)

# Test Case 11: Update task should update updated_at timestamp
def test_update_task_should_update_updated_at_timestamp(task_service, mock_task_repo):
    old_time = (datetime.utcnow() - timedelta(days=1)).isoformat()
    existing_task = make_task({'id': 10, 'title': 'Task 10', 'description': 'Desc 10', 'status': 'To Do', 'event_id': 20, 'updated_at': old_time})
    mock_task_repo.get_by_id.return_value = existing_task
    task_data = {'description': 'Desc 10 updated'}

    with patch.object(task_service, 'validate_status', return_value=True):
        result = task_service.update_task(10, task_data)
        assert result.description == 'Desc 10 updated'
        assert result.updated_at > old_time
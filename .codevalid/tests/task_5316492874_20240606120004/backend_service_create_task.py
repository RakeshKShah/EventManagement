import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException, status

from backend.services.task_service import TaskService
from backend.models.task import Task, TaskStatus
from backend.models.event import Event
from backend.schemas.task import TaskCreate, TaskResponse

@pytest.fixture
def db_session():
    return MagicMock()

@pytest.fixture
def task_service(db_session):
    return TaskService(db_session)

def make_event(event_id, name="Event"):
    return Event(id=event_id, name=name, description="", start_date=None, end_date=None)

def make_task(task_id, title, description, event_id, status=TaskStatus.TODO):
    return Task(id=task_id, title=title, description=description, event_id=event_id, status=status)

def make_task_response(task):
    return TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        event_id=task.event_id,
        created_at=None,
        updated_at=None
    )

# Test Case 1: Create task with valid event association
def test_create_task_with_valid_event_association(task_service):
    event_id = 1
    task_data = TaskCreate(
        title="Task A",
        description="Description for Task A",
        status=TaskStatus.TODO,
        event_id=event_id
    )
    event = make_event(event_id, "Event 1")
    created_task = make_task(123, task_data.title, task_data.description, event_id)
    with patch.object(task_service.event_repository, "get_by_id", return_value=event):
        with patch.object(task_service.repository, "create", return_value=created_task):
            response = task_service.create_task(task_data)
            assert response.status == "success" or response.status == TaskStatus.TODO.name
            assert response.title == "Task A"
            assert response.description == "Description for Task A"
            assert response.event_id == 1
            assert response.id == 123

# Test Case 2: Fail to create task with non-existent event
def test_fail_to_create_task_with_nonexistent_event(task_service):
    event_id = 999
    task_data = TaskCreate(
        title="Task B",
        description="Description for Task B",
        status=TaskStatus.TODO,
        event_id=event_id
    )
    with patch.object(task_service.event_repository, "get_by_id", return_value=None):
        with pytest.raises(HTTPException) as exc:
            task_service.create_task(task_data)
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in exc.value.detail

# Test Case 3: Fail to create task with null event_id
def test_fail_to_create_task_with_null_event_id(task_service):
    task_data = TaskCreate(
        title="Task C",
        description="Description for Task C",
        status=TaskStatus.TODO,
        event_id=None
    )
    with patch.object(task_service.event_repository, "get_by_id", return_value=None):
        with pytest.raises(HTTPException) as exc:
            task_service.create_task(task_data)
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in exc.value.detail

# Test Case 4: Create task with minimum valid event_id
def test_create_task_with_minimum_valid_event_id(task_service):
    event_id = 1
    task_data = TaskCreate(
        title="Task D",
        description="Min event id",
        status=TaskStatus.TODO,
        event_id=event_id
    )
    event = make_event(event_id, "Event Min")
    created_task = make_task(124, task_data.title, task_data.description, event_id)
    with patch.object(task_service.event_repository, "get_by_id", return_value=event):
        with patch.object(task_service.repository, "create", return_value=created_task):
            response = task_service.create_task(task_data)
            assert response.title == "Task D"
            assert response.description == "Min event id"
            assert response.event_id == 1
            assert response.id == 124

# Test Case 5: Create task with maximum valid event_id
def test_create_task_with_maximum_valid_event_id(task_service):
    event_id = 2147483647
    task_data = TaskCreate(
        title="Task E",
        description="Max event id",
        status=TaskStatus.TODO,
        event_id=event_id
    )
    event = make_event(event_id, "Event Max")
    created_task = make_task(125, task_data.title, task_data.description, event_id)
    with patch.object(task_service.event_repository, "get_by_id", return_value=event):
        with patch.object(task_service.repository, "create", return_value=created_task):
            response = task_service.create_task(task_data)
            assert response.title == "Task E"
            assert response.description == "Max event id"
            assert response.event_id == event_id
            assert response.id == 125

# Test Case 6: Create multiple tasks for the same event
def test_create_multiple_tasks_for_same_event(task_service):
    event_id = 3
    event = make_event(event_id, "Event 3")
    task_data1 = TaskCreate(
        title="Task F1",
        description="Task 1",
        status=TaskStatus.TODO,
        event_id=event_id
    )
    task_data2 = TaskCreate(
        title="Task F2",
        description="Task 2",
        status=TaskStatus.TODO,
        event_id=event_id
    )
    created_task1 = make_task(126, task_data1.title, task_data1.description, event_id)
    created_task2 = make_task(127, task_data2.title, task_data2.description, event_id)
    with patch.object(task_service.event_repository, "get_by_id", return_value=event):
        with patch.object(task_service.repository, "create", side_effect=[created_task1, created_task2]):
            response1 = task_service.create_task(task_data1)
            response2 = task_service.create_task(task_data2)
            assert response1.event_id == event_id
            assert response2.event_id == event_id
            assert response1.title == "Task F1"
            assert response2.title == "Task F2"
            assert response1.id == 126
            assert response2.id == 127

# Test Case 7: Fail to create task with invalid event_id type
def test_fail_to_create_task_with_invalid_event_id_type(task_service):
    event_id = "invalid"
    task_data = TaskCreate(
        title="Task G",
        description="Invalid event id type",
        status=TaskStatus.TODO,
        event_id=event_id
    )
    with patch.object(task_service.event_repository, "get_by_id", return_value=None):
        with pytest.raises(HTTPException) as exc:
            task_service.create_task(task_data)
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in exc.value.detail

# Test Case 8: Fail to create task when event_id is missing
def test_fail_to_create_task_when_event_id_missing(task_service):
    task_data = TaskCreate(
        title="Task H",
        description="No event id",
        status=TaskStatus.TODO,
        event_id=None
    )
    with patch.object(task_service.event_repository, "get_by_id", return_value=None):
        with pytest.raises(HTTPException) as exc:
            task_service.create_task(task_data)
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in exc.value.detail

# Test Case 9: Fail to create task if event is deleted before task creation
def test_fail_to_create_task_if_event_deleted_before_task_creation(task_service):
    event_id = 6
    task_data = TaskCreate(
        title="Task I",
        description="Event deleted",
        status=TaskStatus.TODO,
        event_id=event_id
    )
    with patch.object(task_service.event_repository, "get_by_id", return_value=None):
        with pytest.raises(HTTPException) as exc:
            task_service.create_task(task_data)
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in exc.value.detail

# Test Case 10: Create task with maximum title and description length
def test_create_task_with_max_title_and_description_length(task_service):
    event_id = 7
    max_title = "T" * 255
    max_description = "T" * 1024
    task_data = TaskCreate(
        title=max_title,
        description=max_description,
        status=TaskStatus.TODO,
        event_id=event_id
    )
    event = make_event(event_id, "Event 7")
    created_task = make_task(128, max_title, max_description, event_id)
    with patch.object(task_service.event_repository, "get_by_id", return_value=event):
        with patch.object(task_service.repository, "create", return_value=created_task):
            response = task_service.create_task(task_data)
            assert response.title == max_title
            assert response.description == max_description
            assert response.event_id == event_id
            assert response.id == 128

# Test Case 11: Create task with empty title
def test_create_task_with_empty_title(task_service):
    event_id = 8
    task_data = TaskCreate(
        title="",
        description="No title",
        status=TaskStatus.TODO,
        event_id=event_id
    )
    event = make_event(event_id, "Event 8")
    created_task = make_task(129, "", "No title", event_id)
    with patch.object(task_service.event_repository, "get_by_id", return_value=event):
        with patch.object(task_service.repository, "create", return_value=created_task):
            response = task_service.create_task(task_data)
            assert response.title == ""
            assert response.description == "No title"
            assert response.event_id == event_id
            assert response.id == 129

# Test Case 12: Create task with empty description
def test_create_task_with_empty_description(task_service):
    event_id = 9
    task_data = TaskCreate(
        title="Task J",
        description="",
        status=TaskStatus.TODO,
        event_id=event_id
    )
    event = make_event(event_id, "Event 9")
    created_task = make_task(130, "Task J", "", event_id)
    with patch.object(task_service.event_repository, "get_by_id", return_value=event):
        with patch.object(task_service.repository, "create", return_value=created_task):
            response = task_service.create_task(task_data)
            assert response.title == "Task J"
            assert response.description == ""
            assert response.event_id == event_id
            assert response.id == 130

# Test Case 13: Fail to create task with event_id zero
def test_fail_to_create_task_with_event_id_zero(task_service):
    event_id = 0
    task_data = TaskCreate(
        title="Task K",
        description="Event id zero",
        status=TaskStatus.TODO,
        event_id=event_id
    )
    with patch.object(task_service.event_repository, "get_by_id", return_value=None):
        with pytest.raises(HTTPException) as exc:
            task_service.create_task(task_data)
        assert exc.value.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in exc.value.detail
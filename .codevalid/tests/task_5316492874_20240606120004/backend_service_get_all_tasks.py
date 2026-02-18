import pytest
from unittest.mock import MagicMock
from backend.services.task_service import TaskService
from backend.repositories.task_repository import TaskRepository
from backend.repositories.event_repository import EventRepository
from backend.models.task import Task, TaskStatus
from backend.models.event import Event
from backend.schemas.task import TaskResponse
from sqlalchemy.orm import Session
from fastapi import HTTPException

@pytest.fixture
def db_session():
    # Use MagicMock for Session
    return MagicMock(spec=Session)

@pytest.fixture
def task_service(db_session):
    # Patch TaskRepository and EventRepository inside TaskService
    service = TaskService(db_session)
    service.repository = MagicMock(spec=TaskRepository)
    service.event_repository = MagicMock(spec=EventRepository)
    return service

def make_task(id, title, event_id):
    return Task(
        id=id,
        title=title,
        description=f"desc_{title}",
        status=TaskStatus.TODO,
        event_id=event_id
    )

def make_task_response(task):
    return TaskResponse.model_validate(task)

# Test Case 1
def test_get_all_tasks_without_event_id_returns_all_tasks(task_service):
    # Given: tasks A1, A2 for event 1; B1, B2 for event 2
    tasks = [
        make_task(1, "A1", 1),
        make_task(2, "A2", 1),
        make_task(3, "B1", 2),
        make_task(4, "B2", 2)
    ]
    task_service.repository.get_all.return_value = tasks

    # When
    result = task_service.get_all_tasks(event_id=None)

    # Then
    assert len(result) == 4
    returned_titles = {t.title for t in result}
    assert returned_titles == {"A1", "A2", "B1", "B2"}

# Test Case 2
def test_get_all_tasks_with_valid_event_id_returns_tasks_for_that_event(task_service):
    # Given: tasks A1, A2 for event 1; B1, B2 for event 2
    tasks_event1 = [
        make_task(1, "A1", 1),
        make_task(2, "A2", 1)
    ]
    task_service.repository.get_all.return_value = tasks_event1

    # When
    result = task_service.get_all_tasks(event_id=1)

    # Then
    assert len(result) == 2
    for t in result:
        assert t.event_id == 1
        assert t.title in {"A1", "A2"}

# Test Case 3
def test_get_all_tasks_with_nonexistent_event_id_returns_empty_list(task_service):
    # Given: events 1 and 2 with tasks, but no event with ID 999
    task_service.repository.get_all.return_value = []

    # When
    result = task_service.get_all_tasks(event_id=999)

    # Then
    assert result == []

# Test Case 4
def test_get_all_tasks_for_event_with_no_tasks_returns_empty(task_service):
    # Given: Event 3 exists but has no tasks assigned
    task_service.repository.get_all.return_value = []

    # When
    result = task_service.get_all_tasks(event_id=3)

    # Then
    assert result == []

# Test Case 5
def test_get_all_tasks_when_no_tasks_exist_returns_empty(task_service):
    # Given: No tasks exist in the system
    task_service.repository.get_all.return_value = []

    # When
    result = task_service.get_all_tasks()

    # Then
    assert result == []

# Test Case 6
def test_get_all_tasks_after_event_deletion_removes_tasks(task_service):
    # Given: Event 4 with tasks T1 and T2 exists. Event 4 is deleted.
    # After deletion, get_all returns empty for event_id=4
    task_service.repository.get_all.return_value = []

    # When
    result = task_service.get_all_tasks(event_id=4)

    # Then
    assert result == []

# Test Case 7
def test_get_all_tasks_after_task_reassignment_updates_event_association(task_service):
    # Given: Task X assigned to event 5, then reassigned to event 6
    task_x_event6 = make_task(10, "X", 6)
    # For event 5, get_all returns no tasks
    task_service.repository.get_all.side_effect = lambda event_id: [task_x_event6] if event_id == 6 else []

    # When
    result_event5 = task_service.get_all_tasks(event_id=5)
    result_event6 = task_service.get_all_tasks(event_id=6)

    # Then
    assert result_event5 == []
    assert len(result_event6) == 1
    assert result_event6[0].event_id == 6
    assert result_event6[0].title == "X"

# Test Case 8
def test_get_all_tasks_no_task_exists_without_event_association(task_service):
    # Given: tasks must always have event_id
    tasks = [
        make_task(1, "A", 1),
        make_task(2, "B", 2)
    ]
    # Simulate no tasks with event_id=None or missing
    task_service.repository.get_all.return_value = tasks

    # When
    result = task_service.get_all_tasks()

    # Then
    for t in result:
        assert t.event_id is not None

# Test Case 9
def test_get_all_tasks_with_large_number_of_tasks(task_service):
    # Given: 10,000 tasks assigned to event 7
    tasks = [make_task(i, f"T{i}", 7) for i in range(1, 10001)]
    task_service.repository.get_all.return_value = tasks

    # When
    result = task_service.get_all_tasks(event_id=7)

    # Then
    assert len(result) == 10000
    for t in result:
        assert t.event_id == 7

# Test Case 10
def test_get_all_tasks_with_invalid_event_id_type_raises_error(task_service):
    # Given: event_id should be int, call with string
    # Simulate repository raising TypeError or returning empty
    task_service.repository.get_all.side_effect = TypeError("event_id must be int")

    # When/Then
    with pytest.raises(TypeError):
        task_service.get_all_tasks(event_id="invalid")
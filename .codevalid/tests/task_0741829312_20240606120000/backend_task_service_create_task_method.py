import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException, status
from backend.services.task_service import TaskService
from backend.schemas.task import TaskCreate, TaskStatus, TaskResponse
from backend.models.task import TaskStatus as ModelTaskStatus, Task
from backend.repositories.task_repository import TaskRepository
from backend.repositories.event_repository import EventRepository

@pytest.fixture
def db_session():
    return MagicMock()

@pytest.fixture
def event_repository(db_session):
    repo = MagicMock(spec=EventRepository)
    repo.get_by_id = MagicMock()
    return repo

@pytest.fixture
def task_repository(db_session):
    repo = MagicMock(spec=TaskRepository)
    repo.create = MagicMock()
    repo.get_by_id = MagicMock()
    repo.get_all = MagicMock()
    return repo

@pytest.fixture
def service(db_session, event_repository, task_repository):
    with patch('backend.services.task_service.TaskRepository', return_value=task_repository), \
         patch('backend.services.task_service.EventRepository', return_value=event_repository):
        return TaskService(db_session)

def make_task_obj(title, description, status, event_id, task_id=1):
    return Task(
        id=task_id,
        title=title,
        description=description,
        status=ModelTaskStatus[status.replace(" ", "_").upper()],
        event_id=event_id,
        created_at=None,
        updated_at=None
    )

def make_task_response(task_obj):
    return TaskResponse(
        id=task_obj.id,
        title=task_obj.title,
        description=task_obj.description,
        status=TaskStatus(task_obj.status.value),
        event_id=task_obj.event_id,
        created_at=None,
        updated_at=None
    )

# Test Case 1: Create Task with Valid Status 'To Do'
def test_create_task_valid_status_todo(service, event_repository, task_repository):
    event_repository.get_by_id.return_value = MagicMock()
    task_data = TaskCreate(
        title="Buy groceries",
        description="Get milk, eggs, bread",
        status=TaskStatus.TODO,
        event_id=123
    )
    task_obj = make_task_obj("Buy groceries", "Get milk, eggs, bread", "To Do", 123)
    task_repository.create.return_value = task_obj

    with patch('backend.schemas.task.TaskResponse.model_validate', return_value=make_task_response(task_obj)):
        response = service.create_task(task_data)
        assert response.title == "Buy groceries"
        assert response.description == "Get milk, eggs, bread"
        assert response.status == TaskStatus.TODO
        assert response.event_id == 123
        assert response.id == task_obj.id
        task_repository.create.assert_called_once()
        assert isinstance(response, TaskResponse)

# Test Case 2: Create Task with Valid Status 'In Progress'
def test_create_task_valid_status_in_progress(service, event_repository, task_repository):
    event_repository.get_by_id.return_value = MagicMock()
    task_data = TaskCreate(
        title="Write report",
        description="Complete weekly report",
        status=TaskStatus.IN_PROGRESS,
        event_id=123
    )
    task_obj = make_task_obj("Write report", "Complete weekly report", "In Progress", 123)
    task_repository.create.return_value = task_obj

    with patch('backend.schemas.task.TaskResponse.model_validate', return_value=make_task_response(task_obj)):
        response = service.create_task(task_data)
        assert response.title == "Write report"
        assert response.description == "Complete weekly report"
        assert response.status == TaskStatus.IN_PROGRESS
        assert response.event_id == 123
        assert response.id == task_obj.id
        task_repository.create.assert_called_once()
        assert isinstance(response, TaskResponse)

# Test Case 3: Create Task with Valid Status 'Completed'
def test_create_task_valid_status_completed(service, event_repository, task_repository):
    event_repository.get_by_id.return_value = MagicMock()
    task_data = TaskCreate(
        title="Book flights",
        description="Book tickets for conference",
        status=TaskStatus.COMPLETED,
        event_id=123
    )
    task_obj = make_task_obj("Book flights", "Book tickets for conference", "Completed", 123)
    task_repository.create.return_value = task_obj

    with patch('backend.schemas.task.TaskResponse.model_validate', return_value=make_task_response(task_obj)):
        response = service.create_task(task_data)
        assert response.title == "Book flights"
        assert response.description == "Book tickets for conference"
        assert response.status == TaskStatus.COMPLETED
        assert response.event_id == 123
        assert response.id == task_obj.id
        task_repository.create.assert_called_once()
        assert isinstance(response, TaskResponse)

# Test Case 4: Create Task with Invalid Status
def test_create_task_invalid_status(service, event_repository):
    event_repository.get_by_id.return_value = MagicMock()
    # Simulate invalid status by bypassing TaskStatus enum
    task_data = TaskCreate(
        title="Prepare slides",
        description="Slides for demo",
        status="Pending",  # Invalid
        event_id=123
    )
    # Patch ModelTaskStatus to raise KeyError
    with patch('backend.services.task_service.ModelTaskStatus', side_effect=KeyError("Pending")):
        with pytest.raises(KeyError):
            service.create_task(task_data)

# Test Case 5: Missing Status Field
def test_create_task_missing_status(service, event_repository):
    event_repository.get_by_id.return_value = MagicMock()
    # status missing, should default to TaskStatus.TODO
    task_data = TaskCreate(
        title="Call supplier",
        description="Ask for delivery schedule",
        event_id=123
    )
    task_obj = make_task_obj("Call supplier", "Ask for delivery schedule", "To Do", 123)
    with patch('backend.schemas.task.TaskResponse.model_validate', return_value=make_task_response(task_obj)):
        response = service.create_task(task_data)
        assert response.title == "Call supplier"
        assert response.status == TaskStatus.TODO

# Test Case 6: Missing Title Field
def test_create_task_missing_title(service, event_repository):
    event_repository.get_by_id.return_value = MagicMock()
    # title missing, should raise validation error
    with pytest.raises(TypeError):
        TaskCreate(
            description="Send email to client",
            status=TaskStatus.TODO,
            event_id=123
        )

# Test Case 7: Missing Title and Status Fields
def test_create_task_missing_title_and_status(service, event_repository):
    event_repository.get_by_id.return_value = MagicMock()
    # Both title and status missing, should raise validation error
    with pytest.raises(TypeError):
        TaskCreate(
            description="Just a description",
            event_id=123
        )

# Test Case 8: Event Does Not Exist
def test_create_task_event_not_exist(service, event_repository):
    event_repository.get_by_id.return_value = None
    task_data = TaskCreate(
        title="Task for missing event",
        description="Should fail",
        status=TaskStatus.TODO,
        event_id=999
    )
    with pytest.raises(HTTPException) as exc:
        service.create_task(task_data)
    assert exc.value.status_code == status.HTTP_404_NOT_FOUND

# Test Case 9: Duplicate Task Creation
def test_create_task_duplicate(service, event_repository, task_repository):
    event_repository.get_by_id.return_value = MagicMock()
    task_data = TaskCreate(
        title="Duplicate Task",
        description="Same description",
        status=TaskStatus.IN_PROGRESS,
        event_id=123
    )
    # Simulate duplicate error
    task_repository.create.side_effect = HTTPException(status_code=409, detail="Duplicate task not allowed.")
    with pytest.raises(HTTPException) as exc:
        service.create_task(task_data)
    assert exc.value.status_code == 409
    assert exc.value.detail == "Duplicate task not allowed."

# Test Case 10: Task Creation with Empty Title
def test_create_task_empty_title(service, event_repository):
    event_repository.get_by_id.return_value = MagicMock()
    with pytest.raises(ValueError):
        TaskCreate(
            title="",
            description="Empty title test",
            status=TaskStatus.TODO,
            event_id=123
        )

# Test Case 11: Task Creation with Empty Status
def test_create_task_empty_status(service, event_repository):
    event_repository.get_by_id.return_value = MagicMock()
    with pytest.raises(ValueError):
        TaskCreate(
            title="Empty status test",
            description="Testing empty status",
            status="",
            event_id=123
        )

# Test Case 12: Boundary Title Length
def test_create_task_boundary_title_length(service, event_repository, task_repository):
    event_repository.get_by_id.return_value = MagicMock()
    long_title = "T" * 255
    task_data = TaskCreate(
        title=long_title,
        description="Boundary test for title length",
        status=TaskStatus.TODO,
        event_id=123
    )
    task_obj = make_task_obj(long_title, "Boundary test for title length", "To Do", 123)
    task_repository.create.return_value = task_obj
    with patch('backend.schemas.task.TaskResponse.model_validate', return_value=make_task_response(task_obj)):
        response = service.create_task(task_data)
        assert response.title == long_title
        assert response.status == TaskStatus.TODO

# Test Case 13: Boundary Description Length
def test_create_task_boundary_description_length(service, event_repository, task_repository):
    event_repository.get_by_id.return_value = MagicMock()
    long_desc = "D" * 1024
    task_data = TaskCreate(
        title="Boundary Description",
        description=long_desc,
        status=TaskStatus.COMPLETED,
        event_id=123
    )
    task_obj = make_task_obj("Boundary Description", long_desc, "Completed", 123)
    task_repository.create.return_value = task_obj
    with patch('backend.schemas.task.TaskResponse.model_validate', return_value=make_task_response(task_obj)):
        response = service.create_task(task_data)
        assert response.description == long_desc
        assert response.status == TaskStatus.COMPLETED

# Test Case 14: Minimal Description Field
def test_create_task_minimal_description(service, event_repository, task_repository):
    event_repository.get_by_id.return_value = MagicMock()
    task_data = TaskCreate(
        title="Minimal Description",
        description="",
        status=TaskStatus.TODO,
        event_id=123
    )
    task_obj = make_task_obj("Minimal Description", "", "To Do", 123)
    task_repository.create.return_value = task_obj
    with patch('backend.schemas.task.TaskResponse.model_validate', return_value=make_task_response(task_obj)):
        response = service.create_task(task_data)
        assert response.description == ""
        assert response.status == TaskStatus.TODO

# Test Case 15: Status Case Sensitivity
def test_create_task_status_case_sensitivity(service, event_repository):
    event_repository.get_by_id.return_value = MagicMock()
    # status with wrong casing
    with pytest.raises(ValueError):
        TaskCreate(
            title="Case sensitivity status",
            description="Testing status field",
            status="to do",
            event_id=123
        )
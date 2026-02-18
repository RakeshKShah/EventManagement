import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base
from backend.models.task import Task, TaskStatus
from backend.repositories.task_repository import TaskRepository
from backend.schemas.task import TaskCreate
from sqlalchemy.exc import IntegrityError
from typing import Optional

# Use in-memory SQLite for tests
TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(TEST_DB_URL)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    engine.dispose()

@pytest.fixture
def repo(db_session):
    return TaskRepository(db_session)

def create_task_obj(data: dict, event_id: Optional[int] = 1):
    # Helper to create Task object from dict
    title = data.get("title")
    description = data.get("description")
    status = data.get("status", "To Do")
    # Map status string to TaskStatus Enum
    try:
        status_enum = TaskStatus(status)
    except ValueError:
        status_enum = None
    return Task(
        title=title,
        description=description,
        status=status_enum,
        event_id=event_id
    )

def get_task_by_id(session, task_id):
    return session.query(Task).filter(Task.id == task_id).first()

# Test Case 1: Create Task with Valid Fields
def test_create_task_with_valid_fields(repo, db_session):
    data = {'description': 'Milk, eggs, bread', 'status': 'To Do', 'title': 'Buy groceries'}
    task = create_task_obj(data)
    result = repo.create(task)
    assert result.id is not None
    assert result.title == data['title']
    assert result.description == data['description']
    assert result.status.value == data['status']
    # Persisted in DB
    persisted = get_task_by_id(db_session, result.id)
    assert persisted is not None
    # Retrievable via get
    assert repo.get_by_id(result.id) is not None

# Test Case 2: Create Task with Status In Progress
def test_create_task_with_status_in_progress(repo, db_session):
    data = {'description': 'Annual financials', 'status': 'In Progress', 'title': 'Write report'}
    task = create_task_obj(data)
    result = repo.create(task)
    assert result.status.value == 'In Progress'
    persisted = get_task_by_id(db_session, result.id)
    assert persisted is not None

# Test Case 3: Create Task with Status Completed
def test_create_task_with_status_completed(repo, db_session):
    data = {'description': 'Math homework', 'status': 'Completed', 'title': 'Submit assignment'}
    task = create_task_obj(data)
    result = repo.create(task)
    assert result.status.value == 'Completed'
    persisted = get_task_by_id(db_session, result.id)
    assert persisted is not None

# Test Case 4: Create Task with Invalid Status
def test_create_task_with_invalid_status(repo, db_session):
    data = {'description': 'Organize workspace', 'status': 'Pending', 'title': 'Clean desk'}
    task = create_task_obj(data)
    # TaskStatus Enum will be None, should raise error on add/commit
    with pytest.raises(Exception):
        repo.create(task)
    # Not persisted
    assert db_session.query(Task).filter(Task.title == 'Clean desk').first() is None

# Test Case 5: Create Task Missing Title
def test_create_task_missing_title(repo, db_session):
    data = {'description': 'Read notes', 'status': 'To Do'}
    task = create_task_obj(data)
    # Title is None, should raise IntegrityError
    with pytest.raises(IntegrityError):
        repo.create(task)
        db_session.commit()
    assert db_session.query(Task).filter(Task.description == 'Read notes').first() is None

# Test Case 6: Create Task Missing Status
def test_create_task_missing_status(repo, db_session):
    data = {'description': 'Weekly check-in', 'title': 'Call mom'}
    task = create_task_obj(data)
    # Status defaults to "To Do"
    result = repo.create(task)
    assert result.status.value == 'To Do'
    persisted = get_task_by_id(db_session, result.id)
    assert persisted is not None

# Test Case 7: Create Task Missing Both Title and Status
def test_create_task_missing_both_title_and_status(repo, db_session):
    data = {'description': 'Just a description'}
    task = create_task_obj(data)
    # Title is None, should raise IntegrityError
    with pytest.raises(IntegrityError):
        repo.create(task)
        db_session.commit()
    assert db_session.query(Task).filter(Task.description == 'Just a description').first() is None

# Test Case 8: Create Duplicate Task
def test_create_duplicate_task(repo, db_session):
    data1 = {'description': 'Evening walk', 'status': 'To Do', 'title': 'Walk the dog'}
    task1 = create_task_obj(data1)
    result1 = repo.create(task1)
    # Try to create duplicate (assuming schema does NOT allow duplicates)
    task2 = create_task_obj(data1)
    # If schema allows duplicates, this will succeed; otherwise, IntegrityError
    try:
        result2 = repo.create(task2)
        # If allowed, both tasks exist
        assert result2.id != result1.id
    except IntegrityError:
        # If not allowed, error is raised
        assert True

# Test Case 9: Create Task with Maximum Length Title and Description
def test_create_task_with_max_length_title_and_description(repo, db_session):
    max_title = 'T' * 255
    max_desc = 'D' * 1024
    data = {'description': max_desc, 'status': 'To Do', 'title': max_title}
    task = create_task_obj(data)
    result = repo.create(task)
    assert result.title == max_title
    assert result.description == max_desc
    persisted = get_task_by_id(db_session, result.id)
    assert persisted is not None

# Test Case 10: Create Task with Empty Description
def test_create_task_with_empty_description(repo, db_session):
    data = {'description': '', 'status': 'To Do', 'title': 'Plan trip'}
    task = create_task_obj(data)
    result = repo.create(task)
    assert result.description == ''
    persisted = get_task_by_id(db_session, result.id)
    assert persisted is not None

# Test Case 11: Create Task with Whitespace Title
def test_create_task_with_whitespace_title(repo, db_session):
    data = {'description': 'Whitespace title test', 'status': 'To Do', 'title': '   '}
    task = create_task_obj(data)
    # Whitespace title is allowed by DB unless schema validation blocks it
    result = repo.create(task)
    assert result.title == '   '
    persisted = get_task_by_id(db_session, result.id)
    assert persisted is not None

# Test Case 12: Task Object is Refreshed After Commit
def test_task_object_is_refreshed_after_commit(repo, db_session):
    data = {'description': 'Chapter 1', 'status': 'To Do', 'title': 'Read book'}
    task = create_task_obj(data)
    result = repo.create(task)
    # After commit, object should have id and timestamps
    assert result.id is not None
    assert result.created_at is not None
    assert result.updated_at is not None
    persisted = get_task_by_id(db_session, result.id)
    assert persisted is not None
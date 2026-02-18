import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base
from backend.models.task import Task, TaskStatus
from backend.models.event import Event
from backend.repositories.task_repository import TaskRepository
from backend.repositories.event_repository import EventRepository

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()

@pytest.fixture
def task_repo(db_session):
    return TaskRepository(db_session)

@pytest.fixture
def event_repo(db_session):
    return EventRepository(db_session)

def create_event(db, event_id, name="Test Event"):
    event = Event(
        id=event_id,
        name=name,
        description="desc",
        start_date="2026-01-01T00:00:00",
        end_date="2026-01-02T00:00:00"
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

def create_task(db, task_id, event_id, title="Test Task"):
    task = Task(
        id=task_id,
        title=title,
        description="desc",
        status=TaskStatus.TODO,
        event_id=event_id
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

def test_delete_task_with_valid_id(db_session, task_repo):
    event = create_event(db_session, 10)
    task = create_task(db_session, 101, event.id)
    assert task_repo.get_by_id(101) is not None
    task_repo.delete(task)
    assert task_repo.get_by_id(101) is None

def test_delete_task_with_nonexistent_id(db_session, task_repo):
    # No task with id=999 exists
    task = task_repo.get_by_id(999)
    assert task is None
    with pytest.raises(Exception):
        task_repo.delete(None)  # Should raise error or be a no-op

def test_delete_task_already_deleted(db_session, task_repo):
    event = create_event(db_session, 11)
    task = create_task(db_session, 102, event.id)
    task_repo.delete(task)
    assert task_repo.get_by_id(102) is None
    # Try deleting again
    with pytest.raises(Exception):
        task_repo.delete(task)  # Should raise error or be a no-op

def test_delete_task_with_event_association(db_session, task_repo, event_repo):
    event = create_event(db_session, 12)
    task = create_task(db_session, 103, event.id)
    assert task in event.tasks
    task_repo.delete(task)
    db_session.refresh(event)
    assert task_repo.get_by_id(103) is None
    assert task not in event.tasks

def test_delete_task_only_task_of_event(db_session, task_repo, event_repo):
    event = create_event(db_session, 13)
    task = create_task(db_session, 104, event.id)
    assert len(event.tasks) == 1
    task_repo.delete(task)
    db_session.refresh(event)
    assert task_repo.get_by_id(104) is None
    assert len(event.tasks) == 0

def test_delete_task_from_deleted_event(db_session, task_repo, event_repo):
    event = create_event(db_session, 14)
    task = create_task(db_session, 105, event.id)
    event_repo.delete(event)
    db_session.commit()
    assert task_repo.get_by_id(105) is None
    with pytest.raises(Exception):
        task_repo.delete(task)  # Should raise error or be a no-op

def test_delete_task_with_invalid_id_type(db_session, task_repo):
    with pytest.raises(Exception):
        task_repo.delete("abc")  # Should raise type validation error

def test_delete_task_with_null_id(db_session, task_repo):
    with pytest.raises(Exception):
        task_repo.delete(None)  # Should raise validation error

def test_delete_task_with_commit_failure(db_session, task_repo, monkeypatch):
    event = create_event(db_session, 15)
    task = create_task(db_session, 106, event.id)
    original_commit = db_session.commit

    def fail_commit():
        raise Exception("Commit failed")

    monkeypatch.setattr(db_session, "commit", fail_commit)
    with pytest.raises(Exception):
        task_repo.delete(task)
    # Task should still exist (rollback)
    db_session.rollback()
    assert task_repo.get_by_id(106) is not None

def test_delete_task_concurrent_deletion(db_session, task_repo):
    event = create_event(db_session, 16)
    task = create_task(db_session, 107, event.id)
    # Simulate two concurrent deletions
    task_repo.delete(task)
    assert task_repo.get_by_id(107) is None
    # Second deletion should be a no-op or error
    with pytest.raises(Exception):
        task_repo.delete(task)
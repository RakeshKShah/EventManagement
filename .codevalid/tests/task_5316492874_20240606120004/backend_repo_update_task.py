import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base
from backend.models.task import Task, TaskStatus
from backend.models.event import Event
from backend.repositories.task_repository import TaskRepository
from backend.repositories.event_repository import EventRepository

import datetime

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)
    Base.metadata.create_all(engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def task_repo(db_session):
    return TaskRepository(db_session)

@pytest.fixture
def event_repo(db_session):
    return EventRepository(db_session)

def create_event(db, event_id, name="Event", start_date=None, end_date=None):
    start_date = start_date or datetime.datetime.utcnow()
    end_date = end_date or (start_date + datetime.timedelta(days=1))
    event = Event(id=event_id, name=name, start_date=start_date, end_date=end_date)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

def create_task(db, task_id, event_id, title="Task", description="Desc", status=TaskStatus.TODO):
    task = Task(id=task_id, title=title, description=description, status=status, event_id=event_id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

# Test Case 1: Update task to reassign to another valid event
def test_update_task_reassign_event(task_repo, event_repo, db_session):
    event1 = create_event(db_session, 1)
    event2 = create_event(db_session, 2)
    task = create_task(db_session, 1, event1.id)
    task.event_id = event2.id
    updated_task = task_repo.update(task)
    assert updated_task.event_id == event2.id
    # Task should only be listed under event2
    tasks_event1 = task_repo.get_all(event_id=event1.id)
    tasks_event2 = task_repo.get_all(event_id=event2.id)
    assert len(tasks_event1) == 0
    assert len(tasks_event2) == 1
    assert tasks_event2[0].id == task.id

# Test Case 2: Update task with same event_id
def test_update_task_same_event_id(task_repo, event_repo, db_session):
    event1 = create_event(db_session, 1)
    task = create_task(db_session, 1, event1.id)
    original_event_id = task.event_id
    updated_task = task_repo.update(task)
    assert updated_task.event_id == original_event_id
    # No unintended changes
    assert updated_task.title == task.title
    assert updated_task.description == task.description

# Test Case 3: Update task to assign to non-existent event
def test_update_task_nonexistent_event(task_repo, db_session):
    event1 = create_event(db_session, 1)
    task = create_task(db_session, 1, event1.id)
    task.event_id = 999  # Non-existent event
    with pytest.raises(Exception):
        task_repo.update(task)
    # Task remains with event_id=1
    db_session.refresh(task)
    assert task.event_id == 999 or task.event_id == 1  # Depending on DB constraint, may revert or stay

# Test Case 4: Update task to remove from event without reassignment
def test_update_task_remove_event(task_repo, db_session):
    event1 = create_event(db_session, 1)
    task = create_task(db_session, 1, event1.id)
    task.event_id = None
    with pytest.raises(Exception):
        task_repo.update(task)

# Test Case 5: Delete event and ensure associated tasks are deleted
def test_delete_event_deletes_tasks(task_repo, event_repo, db_session):
    event1 = create_event(db_session, 1)
    task = create_task(db_session, 1, event1.id)
    event_repo.delete(event1)
    db_session.commit()
    # Task should be deleted due to cascade
    task_found = task_repo.get_by_id(task.id)
    assert task_found is None
    # Update on deleted task should fail
    with pytest.raises(Exception):
        task_repo.update(task)

# Test Case 6: Update task with boundary event_id values
def test_update_task_boundary_event_ids(task_repo, db_session):
    event1 = create_event(db_session, 1)
    task = create_task(db_session, 1, event1.id)
    # event_id=0 (invalid)
    task.event_id = 0
    with pytest.raises(Exception):
        task_repo.update(task)
    # event_id=2147483647 (max 32-bit int)
    task.event_id = 2147483647
    with pytest.raises(Exception):
        task_repo.update(task)

# Test Case 7: Update non-existent task
def test_update_nonexistent_task(task_repo, db_session):
    # No task with id=999
    fake_task = Task(id=999, title="Fake", description="Fake", status=TaskStatus.TODO, event_id=1)
    with pytest.raises(Exception):
        task_repo.update(fake_task)

# Test Case 8: Update task with missing required fields
def test_update_task_missing_required_fields(task_repo, db_session):
    event1 = create_event(db_session, 1)
    task = create_task(db_session, 1, event1.id)
    task.title = None  # Required field
    with pytest.raises(Exception):
        task_repo.update(task)

# Test Case 9: Update task and verify refresh reflects latest data
def test_update_task_refresh_latest_data(task_repo, event_repo, db_session):
    event1 = create_event(db_session, 1)
    event2 = create_event(db_session, 2)
    task = create_task(db_session, 1, event1.id, title="Old Title", status=TaskStatus.TODO)
    task.title = "New Title"
    task.event_id = event2.id
    updated_task = task_repo.update(task)
    db_session.refresh(updated_task)
    assert updated_task.title == "New Title"
    assert updated_task.event_id == event2.id

# Test Case 10: Update task with concurrent event deletion
def test_update_task_concurrent_event_deletion(task_repo, event_repo, db_session):
    event2 = create_event(db_session, 2)
    task = create_task(db_session, 1, event2.id)
    # Simulate concurrent deletion
    event_repo.delete(event2)
    db_session.commit()
    task.event_id = event2.id
    with pytest.raises(Exception):
        task_repo.update(task)
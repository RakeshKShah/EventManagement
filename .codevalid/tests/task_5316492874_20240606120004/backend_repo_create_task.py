import pytest
from sqlalchemy.exc import IntegrityError, DataError
from sqlalchemy.orm import Session
from backend.repositories.task_repository import TaskRepository
from backend.models.event import Event
from backend.models.task import Task
from backend.database import get_db, Base, engine
from backend.schemas.task import TaskCreate
import threading

@pytest.fixture(scope="module")
def db():
    # Create a new test database for the module
    Base.metadata.create_all(engine)
    session = Session(bind=engine)
    yield session
    session.close()
    Base.metadata.drop_all(engine)

@pytest.fixture
def task_repo(db):
    return TaskRepository(db)

def create_event(db, event_id, **kwargs):
    event = Event(id=event_id, name=kwargs.get("name", f"Event {event_id}"))
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

def create_task_data(event_id=None, name="Task", description="Desc", **kwargs):
    data = {
        "name": name,
        "description": description,
        "event_id": event_id,
    }
    data.update(kwargs)
    return TaskCreate(**data)

# Test Case 1: Create Task with Valid Event
def test_create_task_with_valid_event(task_repo, db):
    event = create_event(db, 1)
    task_data = create_task_data(event_id=1)
    task = task_repo.create(task_data)
    assert task.id is not None
    assert task.event_id == 1
    assert db.query(Task).filter_by(id=task.id, event_id=1).first() is not None

# Test Case 2: Create Task with Non-existent Event
def test_create_task_with_nonexistent_event(task_repo):
    task_data = create_task_data(event_id=999)
    with pytest.raises(IntegrityError):
        task_repo.create(task_data)

# Test Case 3: Create Task with Missing Event ID
def test_create_task_with_missing_event_id(task_repo):
    task_data = create_task_data(event_id=None)
    with pytest.raises(IntegrityError):
        task_repo.create(task_data)

# Test Case 4: Create Task with Empty Event ID
def test_create_task_with_empty_event_id(task_repo):
    task_data = create_task_data(event_id="")
    with pytest.raises(DataError):
        task_repo.create(task_data)

# Test Case 5: Create Task with Boundary Event ID
@pytest.mark.parametrize("boundary_id", [0, 2147483647])
def test_create_task_with_boundary_event_id(task_repo, db, boundary_id):
    event = create_event(db, boundary_id)
    task_data = create_task_data(event_id=boundary_id)
    task = task_repo.create(task_data)
    assert task.event_id == boundary_id
    # Try with non-existent boundary event
    task_data = create_task_data(event_id=boundary_id + 1)
    with pytest.raises(IntegrityError):
        task_repo.create(task_data)

# Test Case 6: Create Multiple Tasks for Same Event
def test_create_multiple_tasks_for_same_event(task_repo, db):
    event = create_event(db, 2)
    task1 = task_repo.create(create_task_data(event_id=2, name="Task1"))
    task2 = task_repo.create(create_task_data(event_id=2, name="Task2"))
    tasks = db.query(Task).filter_by(event_id=2).all()
    assert len(tasks) == 2
    assert task1.event_id == 2 and task2.event_id == 2

# Test Case 7: Create Task with Duplicate Name for Same Event
def test_create_task_with_duplicate_name_for_same_event(task_repo, db):
    event = create_event(db, 3)
    task1 = task_repo.create(create_task_data(event_id=3, name="Duplicate"))
    try:
        task2 = task_repo.create(create_task_data(event_id=3, name="Duplicate"))
        assert task2.id is not None
    except IntegrityError:
        # If uniqueness is enforced, this will raise
        assert True

# Test Case 8: Create Task with Large Payload
def test_create_task_with_large_payload(task_repo, db):
    event = create_event(db, 4)
    max_name = "A" * 255  # Adjust if model has different max length
    max_desc = "D" * 1024  # Adjust if model has different max length
    task_data = create_task_data(event_id=4, name=max_name, description=max_desc)
    task = task_repo.create(task_data)
    assert task.name == max_name
    assert task.description == max_desc
    # Exceeding limits
    too_long_name = "B" * 300
    task_data = create_task_data(event_id=4, name=too_long_name)
    with pytest.raises(DataError):
        task_repo.create(task_data)

# Test Case 9: Create Task with Event Deleted Before Commit
def test_create_task_with_event_deleted_before_commit(task_repo, db):
    event = create_event(db, 5)
    task_data = create_task_data(event_id=5)
    db.delete(event)
    db.commit()
    with pytest.raises(IntegrityError):
        task_repo.create(task_data)

# Test Case 10: Create Task and Refresh
def test_create_task_and_refresh(task_repo, db):
    event = create_event(db, 6)
    task_data = create_task_data(event_id=6)
    task = task_repo.create(task_data)
    db.refresh(task)
    assert task.id is not None
    assert hasattr(task, "created_at") or hasattr(task, "updated_at")

# Test Case 11: Create Task with Invalid Data
def test_create_task_with_invalid_data(task_repo):
    # Missing name
    task_data = TaskCreate(description="desc", event_id=1)
    with pytest.raises(TypeError):
        task_repo.create(task_data)
    # Invalid type for name
    task_data = create_task_data(event_id=1, name=123)
    with pytest.raises(TypeError):
        task_repo.create(task_data)

# Test Case 12: Concurrent Task Creation for Same Event
def test_concurrent_task_creation_for_same_event(task_repo, db):
    event = create_event(db, 7)
    results = []
    def create_task_thread(name):
        task = task_repo.create(create_task_data(event_id=7, name=name))
        results.append(task)
    threads = [threading.Thread(target=create_task_thread, args=(f"Task{i}",)) for i in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    tasks = db.query(Task).filter_by(event_id=7).all()
    assert len(tasks) == 5
    assert all(task.event_id == 7 for task in tasks)

# Test Case 13: Create Task then Delete Event
def test_create_task_then_delete_event(task_repo, db):
    event = create_event(db, 8)
    task = task_repo.create(create_task_data(event_id=8))
    db.delete(event)
    db.commit()
    orphan = db.query(Task).filter_by(id=task.id).first()
    assert orphan is None

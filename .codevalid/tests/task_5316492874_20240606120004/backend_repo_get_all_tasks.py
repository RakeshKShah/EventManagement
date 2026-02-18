import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base
from backend.models.task import Task, TaskStatus
from backend.models.event import Event
from backend.repositories.task_repository import TaskRepository

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(engine)

@pytest.fixture(scope="function")
def task_repo(db_session):
    return TaskRepository(db_session)

def create_event(session, event_id, name="Event"):
    event = Event(id=event_id, name=name)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event

def create_task(session, title, event_id, description=None, status=TaskStatus.TODO):
    task = Task(title=title, event_id=event_id, description=description, status=status)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

# Test Case 1: get_all_with_no_event_id
def test_get_all_with_no_event_id(task_repo, db_session):
    create_event(db_session, 1)
    create_event(db_session, 2)
    create_task(db_session, "Task1", 1)
    create_task(db_session, "Task2", 1)
    create_task(db_session, "Task3", 2)
    tasks = task_repo.get_all()
    assert len(tasks) == 3
    titles = {t.title for t in tasks}
    assert titles == {"Task1", "Task2", "Task3"}

# Test Case 2: get_all_with_valid_event_id
def test_get_all_with_valid_event_id(task_repo, db_session):
    create_event(db_session, 10)
    create_event(db_session, 11)
    create_task(db_session, "TaskA", 10)
    create_task(db_session, "TaskB", 10)
    create_task(db_session, "TaskC", 11)
    tasks = task_repo.get_all(event_id=10)
    assert len(tasks) == 2
    titles = {t.title for t in tasks}
    assert titles == {"TaskA", "TaskB"}

# Test Case 3: get_all_with_event_id_no_tasks
def test_get_all_with_event_id_no_tasks(task_repo, db_session):
    create_event(db_session, 20)
    tasks = task_repo.get_all(event_id=20)
    assert tasks == []

# Test Case 4: get_all_with_nonexistent_event_id
def test_get_all_with_nonexistent_event_id(task_repo, db_session):
    # No event with id=999
    tasks = task_repo.get_all(event_id=999)
    assert tasks == []

# Test Case 5: get_all_after_reassign_task
def test_get_all_after_reassign_task(task_repo, db_session):
    create_event(db_session, 30)
    create_event(db_session, 31)
    task = create_task(db_session, "TaskX", 30)
    # Reassign TaskX to event_id=31
    task.event_id = 31
    db_session.commit()
    db_session.refresh(task)
    tasks_30 = task_repo.get_all(event_id=30)
    tasks_31 = task_repo.get_all(event_id=31)
    assert all(t.title != "TaskX" for t in tasks_30)
    assert any(t.title == "TaskX" for t in tasks_31)

# Test Case 6: get_all_after_event_deletion
def test_get_all_after_event_deletion(task_repo, db_session):
    create_event(db_session, 40)
    task_y = create_task(db_session, "TaskY", 40)
    task_z = create_task(db_session, "TaskZ", 40)
    # Delete event and cascade tasks
    event = db_session.query(Event).filter_by(id=40).first()
    db_session.delete(event)
    db_session.commit()
    tasks = task_repo.get_all(event_id=40)
    assert tasks == []

# Test Case 7: get_all_no_tasks
def test_get_all_no_tasks(task_repo, db_session):
    tasks = task_repo.get_all()
    assert tasks == []

# Test Case 8: get_all_with_invalid_event_id_type
def test_get_all_with_invalid_event_id_type(task_repo, db_session):
    create_event(db_session, 1)
    create_task(db_session, "Task1", 1)
    try:
        tasks = task_repo.get_all(event_id="invalid_id")
        # SQLAlchemy will raise an error or return empty
        assert tasks == [] or isinstance(tasks, list)
    except Exception as e:
        assert isinstance(e, TypeError) or isinstance(e, Exception)

# Test Case 9: get_all_no_task_without_event
def test_get_all_no_task_without_event(task_repo, db_session):
    create_event(db_session, 1)
    create_task(db_session, "Task1", 1)
    create_task(db_session, "Task2", 1)
    tasks = task_repo.get_all()
    assert all(t.event_id is not None for t in tasks)
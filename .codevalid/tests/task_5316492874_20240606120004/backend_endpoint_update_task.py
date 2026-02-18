import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_data(monkeypatch):
    """
    Setup test data for each test case.
    Monkeypatch TaskService and EventService methods as needed.
    """
    from backend.services import task_service, event_service

    # In-memory stores for tasks and events
    tasks = {
        1001: {"id": 1001, "title": "Original Task", "description": "Original description", "event_id": 2001},
        1002: {"id": 1002, "title": "Task To Reassign", "description": "Original description", "event_id": 2001},
        1003: {"id": 1003, "title": "Task With Bad Event", "description": "Original description", "event_id": 2003},
        1004: {"id": 1004, "title": "Task With Null Event", "description": "Original description", "event_id": 2004},
        1005: {"id": 1005, "title": "No Event ID", "description": "Original description", "event_id": 2005},
        1006: {"id": 1006, "title": "Assign to Min Event", "description": "Original description", "event_id": 2006},
        1007: {"id": 1007, "title": "T.repeat(255)", "description": "D.repeat(1024)", "event_id": 2007},
        1008: {"id": 1008, "title": "Bad Event ID Type", "description": "Original description", "event_id": 2008},
        1009: {"id": 1009, "title": "Empty Body", "description": "Original description", "event_id": 2009},
    }
    events = {2001, 2002, 2003, 2004, 2005, 1, 2006, 2007, 2008, 2009}

    def get_task(task_id):
        return tasks.get(task_id)

    def get_event(event_id):
        return event_id in events

    def update_task(task_id, task_data):
        if task_id not in tasks:
            raise task_service.TaskNotFoundError(f"Task with ID {task_id} does not exist.")
        event_id = task_data.get("event_id")
        if event_id is None:
            raise task_service.InvalidEventError("Each task must be associated with exactly one event.")
        if not isinstance(event_id, int):
            raise task_service.InvalidEventError("event_id must be an integer referencing a valid event.")
        if not get_event(event_id):
            raise task_service.InvalidEventError(f"Event with ID {event_id} does not exist.")
        # Field length checks
        title = task_data.get("title", "")
        description = task_data.get("description", "")
        if len(title) > 255 or len(description) > 1024:
            raise task_service.InvalidFieldError("Field length exceeded.")
        tasks[task_id].update(task_data)
        return tasks[task_id]

    monkeypatch.setattr(task_service, "get_task", get_task)
    monkeypatch.setattr(task_service, "update_task", update_task)
    monkeypatch.setattr(event_service, "get_event", get_event)

# Test Case 1: Update Task Details Without Changing Event
def test_update_task_details_without_changing_event():
    response = client.put(
        "/api/tasks/1001",
        json={
            "description": "Updated description",
            "event_id": 2001,
            "title": "Updated Task Title"
        }
    )
    assert response.status_code == 200
    assert response.json() == {
        "description": "Updated description",
        "event_id": 2001,
        "id": 1001,
        "title": "Updated Task Title"
    }

# Test Case 2: Reassign Task to Another Event
def test_reassign_task_to_another_event():
    response = client.put(
        "/api/tasks/1002",
        json={
            "description": "Changing event association",
            "event_id": 2002,
            "title": "Task To Reassign"
        }
    )
    assert response.status_code == 200
    assert response.json() == {
        "description": "Changing event association",
        "event_id": 2002,
        "id": 1002,
        "title": "Task To Reassign"
    }

# Test Case 3: Reassign Task to Non-existent Event Fails
def test_reassign_task_to_nonexistent_event_fails():
    response = client.put(
        "/api/tasks/1003",
        json={
            "description": "Trying to assign to non-existent event",
            "event_id": 9999,
            "title": "Task With Bad Event"
        }
    )
    assert response.status_code == 400
    assert response.json() == {"error": "Event with ID 9999 does not exist."}

# Test Case 4: Update Non-existent Task Fails
def test_update_nonexistent_task_fails():
    response = client.put(
        "/api/tasks/9998",
        json={
            "description": "Should not update",
            "event_id": 2001,
            "title": "Non-existent Task"
        }
    )
    assert response.status_code == 404
    assert response.json() == {"error": "Task with ID 9998 does not exist."}

# Test Case 5: Remove Event Association Fails
def test_remove_event_association_fails():
    response = client.put(
        "/api/tasks/1004",
        json={
            "description": "Invalid update",
            "event_id": None,
            "title": "Task With Null Event"
        }
    )
    assert response.status_code == 400
    assert response.json() == {"error": "Each task must be associated with exactly one event."}

# Test Case 6: Update Without Event ID Fails
def test_update_without_event_id_fails():
    response = client.put(
        "/api/tasks/1005",
        json={
            "description": "Missing event_id",
            "title": "No Event ID"
        }
    )
    assert response.status_code == 400
    assert response.json() == {"error": "event_id is required and must reference a valid event."}

# Test Case 7: Reassign Task to Event ID Boundary Value
def test_reassign_task_to_event_id_boundary_value():
    response = client.put(
        "/api/tasks/1006",
        json={
            "description": "Boundary event_id test",
            "event_id": 1,
            "title": "Assign to Min Event"
        }
    )
    assert response.status_code == 200
    assert response.json() == {
        "description": "Boundary event_id test",
        "event_id": 1,
        "id": 1006,
        "title": "Assign to Min Event"
    }

# Test Case 8: Update Task With Maximum Field Lengths
def test_update_task_with_maximum_field_lengths():
    max_title = "T" * 255
    max_description = "D" * 1024
    response = client.put(
        "/api/tasks/1007",
        json={
            "description": max_description,
            "event_id": 2007,
            "title": max_title
        }
    )
    assert response.status_code == 200
    assert response.json() == {
        "description": max_description,
        "event_id": 2007,
        "id": 1007,
        "title": max_title
    }

# Test Case 9: Update Task With Invalid Event ID Type
def test_update_task_with_invalid_event_id_type():
    response = client.put(
        "/api/tasks/1008",
        json={
            "description": "event_id is string",
            "event_id": "abc",
            "title": "Bad Event ID Type"
        }
    )
    assert response.status_code == 400
    assert response.json() == {"error": "event_id must be an integer referencing a valid event."}

# Test Case 10: Update Task With Empty Request Body Fails
def test_update_task_with_empty_request_body_fails():
    response = client.put(
        "/api/tasks/1009",
        json={}
    )
    assert response.status_code == 400
    assert response.json() == {"error": "event_id is required and must reference a valid event."}
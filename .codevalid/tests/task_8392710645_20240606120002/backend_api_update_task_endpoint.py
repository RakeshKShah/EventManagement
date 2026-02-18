import pytest
from backend.main import app
from backend.services.task_service import TaskService
from backend.models.task import Task
from backend.models.event import Event
from fastapi.testclient import TestClient

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_tasks_and_events(monkeypatch):
    tasks = {
        123: Task(id=123, title="Old Task Title", description="Old task description.", status="To Do", event_id=10),
        124: Task(id=124, title="Previous Title", description="Previous description", status="To Do", event_id=11),
        125: Task(id=125, title="Task 125", description="Desc", status="To Do", event_id=12),
        126: Task(id=126, title="Task 126", description="Desc", status="To Do", event_id=13),
        127: Task(id=127, title="Task 127", description="Desc", status="To Do", event_id=14),
        128: Task(id=128, title="Previous Title", description="Previous description", status="To Do", event_id=15),
        129: Task(id=129, title="Previous Title", description="Previous description", status="To Do", event_id=16),
        130: Task(id=130, title="Task 130", description="Desc", status="To Do", event_id=17),
        131: Task(id=131, title="Task 131", description="Desc", status="To Do", event_id=18),
        132: Task(id=132, title="Task 132", description="Desc", status="To Do", event_id=19),
        133: Task(id=133, title="Previous Title", description="Previous Description", status="To Do", event_id=17),
        134: Task(id=134, title="Previous Title", description="Previous Description", status="To Do", event_id=18),
        135: Task(id=135, title="Task 135", description="Desc", status="To Do", event_id=20),
    }
    events = {
        10: Event(id=10, name="Event 10"),
        11: Event(id=11, name="Event 11"),
        12: Event(id=12, name="Event 12"),
        15: Event(id=15, name="Event 15"),
        16: Event(id=16, name="Event 16"),
        17: Event(id=17, name="Event 17"),
        18: Event(id=18, name="Event 18"),
        14: Event(id=14, name="Event 14"),
        19: Event(id=19, name="Event 19"),
        20: Event(id=20, name="Event 20"),
    }

    def mock_get_task(task_id):
        return tasks.get(task_id)

    def mock_get_event(event_id):
        return events.get(event_id)

    def mock_update_task(task_id, task_data):
        task = tasks.get(task_id)
        if not task:
            return None
        # Simulate update logic
        for k, v in task_data.items():
            setattr(task, k, v)
        return task

    monkeypatch.setattr(TaskService, "get_task", staticmethod(mock_get_task))
    monkeypatch.setattr(TaskService, "update_task", staticmethod(mock_update_task))
    monkeypatch.setattr(TaskService, "get_event", staticmethod(mock_get_event))

# Test Case 1: Update Task with Valid All Fields
def test_update_task_with_valid_all_fields():
    response = client.put(
        "/api/tasks/123",
        json={
            "description": "Updated task description.",
            "event_id": 10,
            "status": "In Progress",
            "title": "Updated Task Title"
        }
    )
    assert response.status_code == 200
    assert response.json() == {
        "description": "Updated task description.",
        "event_id": 10,
        "id": 123,
        "status": "In Progress",
        "title": "Updated Task Title"
    }

# Test Case 2: Update Task with Partial Fields
def test_update_task_with_partial_fields():
    response = client.put(
        "/api/tasks/124",
        json={
            "event_id": 11,
            "title": "New Title"
        }
    )
    assert response.status_code == 200
    assert response.json() == {
        "description": "Previous description",
        "event_id": 11,
        "id": 124,
        "status": "To Do",
        "title": "New Title"
    }

# Test Case 3: Update Task with Invalid Status
def test_update_task_with_invalid_status():
    response = client.put(
        "/api/tasks/125",
        json={
            "event_id": 12,
            "status": "Done"
        }
    )
    assert response.status_code == 400
    assert response.json() == {
        "details": {
            "status": "Invalid status value. Allowed values: 'To Do', 'In Progress', 'Completed'."
        },
        "error": "Validation error"
    }

# Test Case 4: Update Task Missing Required event_id
def test_update_task_missing_required_event_id():
    response = client.put(
        "/api/tasks/126",
        json={
            "title": "Missing event_id"
        }
    )
    assert response.status_code == 400
    assert response.json() == {
        "details": {
            "event_id": "event_id is required."
        },
        "error": "Validation error"
    }

# Test Case 5: Update Task with Invalid event_id
def test_update_task_with_invalid_event_id():
    response = client.put(
        "/api/tasks/127",
        json={
            "event_id": 99999
        }
    )
    assert response.status_code == 400
    assert response.json() == {
        "details": {
            "event_id": "event_id does not correspond to a valid event."
        },
        "error": "Validation error"
    }

# Test Case 6: Update Nonexistent Task
def test_update_nonexistent_task():
    response = client.put(
        "/api/tasks/999",
        json={
            "event_id": 14,
            "title": "Should Fail"
        }
    )
    assert response.status_code == 404
    assert response.json() == {
        "error": "Task not found"
    }

# Test Case 7: Update Task with Empty Title
def test_update_task_with_empty_title():
    response = client.put(
        "/api/tasks/128",
        json={
            "event_id": 15,
            "title": ""
        }
    )
    assert response.status_code == 200
    assert response.json() == {
        "description": "Previous description",
        "event_id": 15,
        "id": 128,
        "status": "To Do",
        "title": ""
    }

# Test Case 8: Update Task with Maximum Length Title and Description
def test_update_task_with_maximum_length_title_and_description():
    max_title = "T" * 255
    max_description = "D" * 1024
    response = client.put(
        "/api/tasks/129",
        json={
            "description": max_description,
            "event_id": 16,
            "title": max_title
        }
    )
    assert response.status_code == 200
    assert response.json() == {
        "description": max_description,
        "event_id": 16,
        "id": 129,
        "status": "To Do",
        "title": max_title
    }

# Test Case 9: Update Task with Non-integer event_id
def test_update_task_with_non_integer_event_id():
    response = client.put(
        "/api/tasks/130",
        json={
            "event_id": "not-an-integer"
        }
    )
    assert response.status_code == 400
    assert response.json() == {
        "details": {
            "event_id": "event_id must be an integer."
        },
        "error": "Validation error"
    }

# Test Case 10: Update Task with Invalid JSON Body
def test_update_task_with_invalid_json_body():
    response = client.put(
        "/api/tasks/131",
        data="{event_id: 18, title: 'Malformed'}",  # Malformed JSON
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 400
    assert response.json() == {
        "details": {
            "body": "Malformed JSON request body."
        },
        "error": "Validation error"
    }

# Test Case 11: Update Task with No Request Body
def test_update_task_with_no_request_body():
    response = client.put(
        "/api/tasks/132",
        json={}
    )
    assert response.status_code == 400
    assert response.json() == {
        "details": {
            "event_id": "event_id is required."
        },
        "error": "Validation error"
    }

# Test Case 12: Update Task with Status Case Sensitivity
def test_update_task_with_status_case_sensitivity():
    response = client.put(
        "/api/tasks/133",
        json={
            "event_id": 17,
            "status": "completed"
        }
    )
    assert response.status_code == 400
    assert response.json() == {
        "details": {
            "status": "Invalid status value. Allowed values: 'To Do', 'In Progress', 'Completed'."
        },
        "error": "Validation error"
    }

# Test Case 13: Update Task Status to Completed
def test_update_task_status_to_completed():
    response = client.put(
        "/api/tasks/134",
        json={
            "event_id": 18,
            "status": "Completed"
        }
    )
    assert response.status_code == 200
    assert response.json() == {
        "description": "Previous Description",
        "event_id": 18,
        "id": 134,
        "status": "Completed",
        "title": "Previous Title"
    }

# Test Case 14: Update Task with event_id Zero
def test_update_task_with_event_id_zero():
    response = client.put(
        "/api/tasks/135",
        json={
            "event_id": 0
        }
    )
    assert response.status_code == 400
    assert response.json() == {
        "details": {
            "event_id": "event_id does not correspond to a valid event."
        },
        "error": "Validation error"
    }
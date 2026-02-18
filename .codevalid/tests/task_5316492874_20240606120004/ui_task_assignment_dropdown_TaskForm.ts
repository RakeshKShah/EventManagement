import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskForm from '../../../frontend/src/components/TaskForm';
import { createTask, updateTask, deleteTask, deleteEvent } from '../../../frontend/src/services/api';
import { Event, Task } from '../../../frontend/src/types';

// Mock API functions
jest.mock('../../../frontend/src/services/api', () => ({
  createTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  deleteEvent: jest.fn(),
}));

const mockCreateTask = createTask as jest.Mock;
const mockUpdateTask = updateTask as jest.Mock;
const mockDeleteTask = deleteTask as jest.Mock;
const mockDeleteEvent = deleteEvent as jest.Mock;

function setup(props: any) {
  return render(<TaskForm {...props} />);
}

describe('TaskForm Component', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: Render event dropdown with provided events
  it('Render event dropdown with provided events', () => {
    const events = [
      { id: 1, name: 'Event A' },
      { id: 2, name: 'Event B' },
      { id: 3, name: 'Event C' },
    ];
    setup({ events, mode: 'create' });

    const dropdown = screen.getByLabelText(/event/i);
    expect(dropdown).toBeVisible();
    expect(screen.getByText('Event A')).toBeInTheDocument();
    expect(screen.getByText('Event B')).toBeInTheDocument();
    expect(screen.getByText('Event C')).toBeInTheDocument();
  });

  // Test Case 2: Create task with valid event selection
  it('Create task with valid event selection', async () => {
    const events = [{ id: 5, name: 'Event Five' }];
    setup({ events, mode: 'create' });

    fireEvent.change(screen.getByLabelText(/event/i), { target: { value: '5' } });
    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ event_id: 5 }));
    });
  });

  // Test Case 3: Create task without selecting an event
  it('Create task without selecting an event', async () => {
    const events = [
      { id: 1, name: 'Event A' },
      { id: 2, name: 'Event B' },
    ];
    setup({ events, mode: 'create' });

    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(screen.getByText('Please select an event')).toBeInTheDocument();
      expect(mockCreateTask).not.toHaveBeenCalled();
    });
  });

  // Test Case 4: Create task with non-existent event
  it('Create task with non-existent event', async () => {
    const events = [
      { id: 1, name: 'Event A' },
      { id: 2, name: 'Event B' },
    ];
    setup({ events, mode: 'create' });

    // Simulate invalid input (event_id=99)
    fireEvent.change(screen.getByLabelText(/event/i), { target: { value: '99' } });
    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(screen.getByText('Selected event does not exist')).toBeInTheDocument();
      expect(mockCreateTask).not.toHaveBeenCalled();
    });
  });

  // Test Case 5: Edit task and reassign to a different event
  it('Edit task and reassign to a different event', async () => {
    const events = [
      { id: 1, name: 'Event A' },
      { id: 2, name: 'Event B' },
    ];
    const task = { id: 10, event_id: 1 };
    setup({ events, mode: 'edit', task });

    fireEvent.change(screen.getByLabelText(/event/i), { target: { value: '2' } });
    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(expect.objectContaining({ event_id: 2 }));
    });
  });

  // Test Case 6: Edit task and select the same event
  it('Edit task and select the same event', async () => {
    const events = [
      { id: 1, name: 'Event A' },
      { id: 2, name: 'Event B' },
    ];
    const task = { id: 10, event_id: 1 };
    setup({ events, mode: 'edit', task });

    fireEvent.change(screen.getByLabelText(/event/i), { target: { value: '1' } });
    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(mockUpdateTask).not.toHaveBeenCalled();
    });
  });

  // Test Case 7: Edit task and reassign to non-existent event
  it('Edit task and reassign to non-existent event', async () => {
    const events = [
      { id: 1, name: 'Event A' },
      { id: 2, name: 'Event B' },
    ];
    const task = { id: 10, event_id: 1 };
    setup({ events, mode: 'edit', task });

    fireEvent.change(screen.getByLabelText(/event/i), { target: { value: '999' } });
    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(screen.getByText('Selected event does not exist')).toBeInTheDocument();
      expect(mockUpdateTask).not.toHaveBeenCalled();
    });
  });

  // Test Case 8: Remove task from event forces reassignment
  it('Remove task from event forces reassignment', async () => {
    const events = [
      { id: 1, name: 'Event X' },
      { id: 2, name: 'Event Y' },
    ];
    const task = { id: 20, event_id: 1 };
    setup({ events, mode: 'edit', task });

    fireEvent.change(screen.getByLabelText(/event/i), { target: { value: '' } });
    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(screen.getByText('Task must be associated with an event')).toBeInTheDocument();
      expect(mockUpdateTask).not.toHaveBeenCalled();
    });
  });

  // Test Case 9: Remove task from event and delete task
  it('Remove task from event and delete task', async () => {
    const events = [
      { id: 1, name: 'Event Y' },
      { id: 2, name: 'Event Z' },
    ];
    const task = { id: 30, event_id: 1 };
    setup({ events, mode: 'edit', task });

    fireEvent.click(screen.getByText(/delete task/i));

    await waitFor(() => {
      expect(mockDeleteTask).toHaveBeenCalledWith(30);
      // Optionally check UI update
    });
  });

  // Test Case 10: View tasks for a specific event
  it('View tasks for a specific event', async () => {
    const events = [
      { id: 1, name: 'Event A' },
      { id: 2, name: 'Event B' },
    ];
    const tasks = [
      { id: 101, event_id: 1, name: 'Task 1' },
      { id: 102, event_id: 2, name: 'Task 2' },
    ];
    // Assume TaskForm renders a task list for selected event
    setup({ events, mode: 'create', tasks });

    fireEvent.change(screen.getByLabelText(/event/i), { target: { value: '2' } });

    await waitFor(() => {
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
    });
  });

  // Test Case 11: Delete event deletes all associated tasks
  it('Delete event deletes all associated tasks', async () => {
    const events = [
      { id: 3, name: 'Event Z' },
    ];
    const tasks = [
      { id: 201, event_id: 3, name: 'Task A' },
      { id: 202, event_id: 3, name: 'Task B' },
    ];
    setup({ events, mode: 'create', tasks });

    fireEvent.click(screen.getByText(/delete event/i));

    await waitFor(() => {
      expect(mockDeleteEvent).toHaveBeenCalledWith(3);
      expect(mockDeleteTask).toHaveBeenCalledWith(201);
      expect(mockDeleteTask).toHaveBeenCalledWith(202);
    });
  });

  // Test Case 12: Task does not exist without an event association
  it('Task does not exist without an event association', async () => {
    const events = [
      { id: 1, name: 'Event A' },
      { id: 2, name: 'Event B' },
    ];
    const task = { id: 40, event_id: undefined };
    setup({ events, mode: 'edit', task });

    await waitFor(() => {
      expect(screen.getByText('Task must be linked to an event')).toBeInTheDocument();
      expect(screen.getByText(/submit/i)).toBeDisabled();
    });
  });

  // Test Case 13: Render form when no events exist
  it('Render form when no events exist', async () => {
    setup({ events: [], mode: 'create' });

    await waitFor(() => {
      expect(screen.getByLabelText(/event/i)).toBeDisabled();
      expect(screen.getByText('No events available')).toBeInTheDocument();
      expect(screen.getByText(/submit/i)).toBeDisabled();
    });
  });

  // Test Case 14: Render form while events are loading
  it('Render form while events are loading', async () => {
    setup({ events: undefined, mode: 'create', loading: true });

    await waitFor(() => {
      expect(screen.getByText('Loading events...')).toBeInTheDocument();
      expect(screen.getByLabelText(/event/i)).toBeDisabled();
    });
  });

  // Test Case 15: Render dropdown with events having duplicate names
  it('Render dropdown with events having duplicate names', () => {
    const events = [
      { id: 1, name: 'Event X' },
      { id: 2, name: 'Event X' },
    ];
    setup({ events, mode: 'create' });

    const dropdown = screen.getByLabelText(/event/i);
    const options = screen.getAllByText('Event X');
    expect(options.length).toBe(2);
    expect(dropdown).toBeVisible();
    // Each option should be selectable by unique id
    fireEvent.change(dropdown, { target: { value: '1' } });
    expect(dropdown.value).toBe('1');
    fireEvent.change(dropdown, { target: { value: '2' } });
    expect(dropdown.value).toBe('2');
  });

  // Test Case 16: Error clears when user selects valid event after previous error
  it('Error clears when user selects valid event after previous error', async () => {
    const events = [
      { id: 1, name: 'Event A' },
      { id: 2, name: 'Event B' },
    ];
    setup({ events, mode: 'create' });

    // Submit with no event selected
    fireEvent.click(screen.getByText(/submit/i));
    await waitFor(() => {
      expect(screen.getByText('Please select an event')).toBeInTheDocument();
    });

    // Select valid event and submit again
    fireEvent.change(screen.getByLabelText(/event/i), { target: { value: '2' } });
    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(screen.queryByText('Please select an event')).not.toBeInTheDocument();
      expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({ event_id: 2 }));
    });
  });
});
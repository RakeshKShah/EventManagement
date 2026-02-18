import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskList from '../../../frontend/src/components/TaskList';
import { deleteTask, updateTask, createTask } from '../../../frontend/src/services/api';
import { act } from 'react-dom/test-utils';

// Mock API functions
jest.mock('../../../frontend/src/services/api', () => ({
  deleteTask: jest.fn(),
  updateTask: jest.fn(),
  createTask: jest.fn(),
}));

const events = [
  { id: 10, name: 'Event X' },
  { id: 11, name: 'Event Y' },
];

const tasks = [
  { id: 1, title: 'Task A', event: { id: 10, name: 'Event X' } },
  { id: 2, title: 'Task B', event: { id: 11, name: 'Event Y' } },
];

const setup = (props = {}) => {
  return render(<TaskList {...props} />);
};

describe('TaskList', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: Render tasks with event names
  it('Render tasks with event names', () => {
    setup({ tasks, events });
    expect(screen.getByText('Task A')).toBeInTheDocument();
    expect(screen.getByText('Event X')).toBeInTheDocument();
    expect(screen.getByText('Task B')).toBeInTheDocument();
    expect(screen.getByText('Event Y')).toBeInTheDocument();
  });

  // Test Case 2: Edit button is visible for each task
  it('Edit button is visible for each task', () => {
    setup({ tasks: [tasks[0]], events });
    const editBtn = screen.getByTestId('edit-btn-1');
    expect(editBtn).toBeInTheDocument();
  });

  // Test Case 3: Delete button is visible for each task
  it('Delete button is visible for each task', () => {
    setup({ tasks: [tasks[0]], events });
    const deleteBtn = screen.getByTestId('delete-btn-1');
    expect(deleteBtn).toBeInTheDocument();
  });

  // Test Case 4: Delete task successfully
  it('Delete task successfully', async () => {
    (deleteTask as jest.Mock).mockResolvedValueOnce({});
    setup({ tasks: [tasks[0]], events });
    fireEvent.click(screen.getByTestId('delete-btn-1'));
    await waitFor(() => {
      expect(deleteTask).toHaveBeenCalledWith(1);
      expect(screen.queryByText('Task A')).not.toBeInTheDocument();
    });
  });

  // Test Case 5: Delete task API error
  it('Delete task API error', async () => {
    (deleteTask as jest.Mock).mockRejectedValueOnce(new Error('Delete failed'));
    setup({ tasks: [tasks[0]], events });
    fireEvent.click(screen.getByTestId('delete-btn-1'));
    await waitFor(() => {
      expect(deleteTask).toHaveBeenCalledWith(1);
      expect(screen.getByText('Task A')).toBeInTheDocument();
      expect(screen.getByText(/Delete failed/i)).toBeInTheDocument();
    });
  });

  // Test Case 6: Edit task to reassign event successfully
  it('Edit task to reassign event successfully', async () => {
    (updateTask as jest.Mock).mockResolvedValueOnce({
      id: 1,
      title: 'Task A',
      event: { id: 11, name: 'Event Y' },
    });
    setup({ tasks: [tasks[0]], events });
    fireEvent.click(screen.getByTestId('edit-btn-1'));
    fireEvent.change(screen.getByTestId('event-select-1'), { target: { value: '11' } });
    fireEvent.click(screen.getByTestId('save-btn-1'));
    await waitFor(() => {
      expect(updateTask).toHaveBeenCalledWith(1, { eventId: 11 });
      expect(screen.getByText('Event Y')).toBeInTheDocument();
      expect(screen.queryByText('Event X')).not.toBeInTheDocument();
    });
  });

  // Test Case 7: Edit task to reassign to non-existent event
  it('Edit task to reassign to non-existent event', async () => {
    (updateTask as jest.Mock).mockRejectedValueOnce(new Error('Event does not exist'));
    setup({ tasks: [tasks[0]], events: [events[0]] });
    fireEvent.click(screen.getByTestId('edit-btn-1'));
    fireEvent.change(screen.getByTestId('event-select-1'), { target: { value: '999' } });
    fireEvent.click(screen.getByTestId('save-btn-1'));
    await waitFor(() => {
      expect(updateTask).toHaveBeenCalledWith(1, { eventId: 999 });
      expect(screen.getByText(/Event does not exist/i)).toBeInTheDocument();
      expect(screen.getByText('Event X')).toBeInTheDocument();
    });
  });

  // Test Case 8: View tasks for specific event
  it('View tasks for specific event', () => {
    setup({ tasks, events, filterEventId: 10 });
    expect(screen.getByText('Task A')).toBeInTheDocument();
    expect(screen.queryByText('Task B')).not.toBeInTheDocument();
  });

  // Test Case 9: Remove task from event and reassign
  it('Remove task from event and reassign', async () => {
    (updateTask as jest.Mock).mockResolvedValueOnce({
      id: 1,
      title: 'Task A',
      event: { id: 11, name: 'Event Y' },
    });
    setup({ tasks: [tasks[0]], events });
    fireEvent.click(screen.getByTestId('edit-btn-1'));
    fireEvent.change(screen.getByTestId('event-select-1'), { target: { value: '11' } });
    fireEvent.click(screen.getByTestId('save-btn-1'));
    await waitFor(() => {
      expect(updateTask).toHaveBeenCalledWith(1, { eventId: 11 });
      expect(screen.getByText('Event Y')).toBeInTheDocument();
    });
  });

  // Test Case 10: Remove task from event without reassignment deletes task
  it('Remove task from event without reassignment deletes task', async () => {
    (updateTask as jest.Mock).mockResolvedValueOnce({
      id: 1,
      title: 'Task A',
      event: null,
    });
    setup({ tasks: [tasks[0]], events: [events[0]] });
    fireEvent.click(screen.getByTestId('edit-btn-1'));
    fireEvent.change(screen.getByTestId('event-select-1'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('save-btn-1'));
    await waitFor(() => {
      expect(updateTask).toHaveBeenCalledWith(1, { eventId: null });
      expect(screen.queryByText('Task A')).not.toBeInTheDocument();
    });
  });

  // Test Case 11: Assign task to non-existent event
  it('Assign task to non-existent event', async () => {
    (updateTask as jest.Mock).mockRejectedValueOnce(new Error('Event does not exist'));
    setup({ tasks: [], events: [events[0]] });
    fireEvent.click(screen.getByTestId('create-task-btn'));
    fireEvent.change(screen.getByTestId('event-select-new'), { target: { value: '999' } });
    fireEvent.change(screen.getByTestId('task-title-input'), { target: { value: 'Task Z' } });
    fireEvent.click(screen.getByTestId('save-task-btn'));
    await waitFor(() => {
      expect(createTask).toHaveBeenCalledWith({ title: 'Task Z', eventId: 999 });
      expect(screen.getByText(/Event does not exist/i)).toBeInTheDocument();
      expect(screen.queryByText('Task Z')).not.toBeInTheDocument();
    });
  });

  // Test Case 12: Delete event deletes all associated tasks
  it('Delete event deletes all associated tasks', async () => {
    setup({
      tasks: [
        { id: 1, title: 'Task A', event: { id: 10, name: 'Event X' } },
        { id: 2, title: 'Task B', event: { id: 10, name: 'Event X' } },
        { id: 3, title: 'Task C', event: { id: 11, name: 'Event Y' } },
      ],
      events,
    });
    fireEvent.click(screen.getByTestId('delete-event-btn-10'));
    await waitFor(() => {
      expect(screen.queryByText('Task A')).not.toBeInTheDocument();
      expect(screen.queryByText('Task B')).not.toBeInTheDocument();
      expect(screen.getByText('Task C')).toBeInTheDocument();
    });
  });

  // Test Case 13: Task without event association is not possible
  it('Task without event association is not possible', () => {
    setup({ tasks: [{ id: 1, title: 'Task A', event: null }], events });
    expect(screen.queryByText('Task A')).not.toBeInTheDocument();
    expect(screen.getByText(/Task must be associated with an event/i)).toBeInTheDocument();
  });

  // Test Case 14: Create task with invalid event fails
  it('Create task with invalid event fails', async () => {
    (createTask as jest.Mock).mockRejectedValueOnce(new Error('Event does not exist'));
    setup({ tasks: [], events: [events[0]] });
    fireEvent.click(screen.getByTestId('create-task-btn'));
    fireEvent.change(screen.getByTestId('event-select-new'), { target: { value: '999' } });
    fireEvent.change(screen.getByTestId('task-title-input'), { target: { value: 'Task Z' } });
    fireEvent.click(screen.getByTestId('save-task-btn'));
    await waitFor(() => {
      expect(createTask).toHaveBeenCalledWith({ title: 'Task Z', eventId: 999 });
      expect(screen.getByText(/Event does not exist/i)).toBeInTheDocument();
      expect(screen.queryByText('Task Z')).not.toBeInTheDocument();
    });
  });

  // Test Case 15: Create task with valid event
  it('Create task with valid event', async () => {
    (createTask as jest.Mock).mockResolvedValueOnce({
      id: 4,
      title: 'Task D',
      event: { id: 10, name: 'Event X' },
    });
    setup({ tasks: [], events: [events[0]] });
    fireEvent.click(screen.getByTestId('create-task-btn'));
    fireEvent.change(screen.getByTestId('event-select-new'), { target: { value: '10' } });
    fireEvent.change(screen.getByTestId('task-title-input'), { target: { value: 'Task D' } });
    fireEvent.click(screen.getByTestId('save-task-btn'));
    await waitFor(() => {
      expect(createTask).toHaveBeenCalledWith({ title: 'Task D', eventId: 10 });
      expect(screen.getByText('Task D')).toBeInTheDocument();
      expect(screen.getByText('Event X')).toBeInTheDocument();
    });
  });

  // Test Case 16: Event name display with long event name
  it('Event name display with long event name', () => {
    const longName = 'T'.repeat(255);
    setup({ tasks: [{ id: 1, title: 'Task A', event: { id: 10, name: longName } }], events: [{ id: 10, name: longName }] });
    expect(screen.getByText(longName)).toBeInTheDocument();
    // UI overflow check: could be a class or style, but here we check presence
    expect(screen.getByText(longName)).toHaveClass('event-name');
  });

  // Test Case 17: Task title display with long task title
  it('Task title display with long task title', () => {
    const longTitle = 'T'.repeat(255);
    setup({ tasks: [{ id: 1, title: longTitle, event: { id: 10, name: 'Event X' } }], events: [events[0]] });
    expect(screen.getByText(longTitle)).toBeInTheDocument();
    expect(screen.getByText(longTitle)).toHaveClass('task-title');
  });

  // Test Case 18: Empty task list renders appropriate UI
  it('Empty task list renders appropriate UI', () => {
    setup({ tasks: [], events });
    expect(screen.getByText(/no tasks are assigned/i)).toBeInTheDocument();
  });

  // Test Case 19: Delete all tasks from an event and check UI
  it('Delete all tasks from an event and check UI', async () => {
    (deleteTask as jest.Mock).mockResolvedValueOnce({});
    setup({ tasks: [tasks[0]], events, filterEventId: 10 });
    fireEvent.click(screen.getByTestId('delete-btn-1'));
    await waitFor(() => {
      expect(deleteTask).toHaveBeenCalledWith(1);
      expect(screen.getByText(/no tasks for Event X/i)).toBeInTheDocument();
    });
  });
});
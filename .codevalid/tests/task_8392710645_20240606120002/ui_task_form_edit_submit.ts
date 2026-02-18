import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskForm from '../../../frontend/src/components/TaskForm';
import * as api from '../../../frontend/src/services/api';
import { Task } from '../../../frontend/src/types';

// Mock updateTask and createTask
jest.mock('../../../frontend/src/services/api');

const mockUpdateTask = api.updateTask as jest.Mock;
const mockCreateTask = api.createTask as jest.Mock;

const defaultTask: Task = {
  id: 1,
  title: 'Old Task',
  description: 'Old Desc',
  status: 'To Do',
  event_id: 1001,
};

function renderTaskForm(task?: Task) {
  render(<TaskForm task={task} />);
}

describe('TaskForm (handleSubmit for Edit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: Edit Task Success
  it('Edit Task Success', async () => {
    mockUpdateTask.mockResolvedValue({
      ...defaultTask,
      title: 'New Task',
      description: 'New Desc',
      status: 'In Progress',
      event_id: 1001,
    });

    renderTaskForm(defaultTask);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New Task' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New Desc' } });
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'In Progress' } });
    fireEvent.change(screen.getByLabelText(/event_id/i), { target: { value: '1001' } });

    fireEvent.submit(screen.getByTestId('task-form'));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(1, {
        title: 'New Task',
        description: 'New Desc',
        status: 'In Progress',
        event_id: 1001,
      });
      expect(screen.getByDisplayValue('New Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('New Desc')).toBeInTheDocument();
      expect(screen.getByDisplayValue('In Progress')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1001')).toBeInTheDocument();
    });
  });

  // Test Case 2: Edit Task With Omitted event_id
  it('Edit Task With Omitted event_id', async () => {
    mockUpdateTask.mockRejectedValue({
      response: { status: 400, data: { error: 'event_id is required' } },
    });

    renderTaskForm({ ...defaultTask, id: 2 });

    fireEvent.change(screen.getByLabelText(/event_id/i), { target: { value: '' } });
    fireEvent.submit(screen.getByTestId('task-form'));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalled();
      expect(screen.getByText(/event_id is required/i)).toBeInTheDocument();
    });
  });

  // Test Case 3: Edit Task With Invalid event_id
  it('Edit Task With Invalid event_id', async () => {
    mockUpdateTask.mockRejectedValue({
      response: { status: 400, data: { error: 'Invalid event_id' } },
    });

    renderTaskForm({ ...defaultTask, id: 3 });

    fireEvent.change(screen.getByLabelText(/event_id/i), { target: { value: '9999' } });
    fireEvent.submit(screen.getByTestId('task-form'));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalled();
      expect(screen.getByText(/invalid event_id/i)).toBeInTheDocument();
    });
  });

  // Test Case 4: Edit Task With Invalid Status
  it('Edit Task With Invalid Status', async () => {
    mockUpdateTask.mockRejectedValue({
      response: { status: 400, data: { error: 'Invalid status' } },
    });

    renderTaskForm({ ...defaultTask, id: 4 });

    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'Delayed' } });
    fireEvent.submit(screen.getByTestId('task-form'));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalled();
      expect(screen.getByText(/invalid status/i)).toBeInTheDocument();
    });
  });

  // Test Case 5: Edit Task With Nonexistent Task ID
  it('Edit Task With Nonexistent Task ID', async () => {
    mockUpdateTask.mockRejectedValue({
      response: { status: 404, data: { error: 'Task not found' } },
    });

    renderTaskForm({ ...defaultTask, id: 99999 });

    fireEvent.submit(screen.getByTestId('task-form'));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalled();
      expect(screen.getByText(/task not found/i)).toBeInTheDocument();
    });
  });

  // Test Case 6: Edit Task With Missing Title
  it('Edit Task With Missing Title', async () => {
    mockUpdateTask.mockRejectedValue({
      response: { status: 400, data: { error: 'Title is required' } },
    });

    renderTaskForm({ ...defaultTask, id: 5 });

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: '' } });
    fireEvent.submit(screen.getByTestId('task-form'));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalled();
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  // Test Case 7: Edit Task With Missing Status
  it('Edit Task With Missing Status', async () => {
    mockUpdateTask.mockRejectedValue({
      response: { status: 400, data: { error: 'Status is required' } },
    });

    renderTaskForm({ ...defaultTask, id: 6 });

    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: '' } });
    fireEvent.submit(screen.getByTestId('task-form'));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalled();
      expect(screen.getByText(/status is required/i)).toBeInTheDocument();
    });
  });

  // Test Case 8: Edit Task With Missing Description
  it('Edit Task With Missing Description', async () => {
    mockUpdateTask.mockResolvedValue({
      ...defaultTask,
      id: 7,
      description: '',
    });

    renderTaskForm({ ...defaultTask, id: 7 });

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: '' } });
    fireEvent.submit(screen.getByTestId('task-form'));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(7, {
        title: defaultTask.title,
        description: '',
        status: defaultTask.status,
        event_id: defaultTask.event_id,
      });
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });
  });

  // Test Case 9: Edit Task With Maximum Length Title
  it('Edit Task With Maximum Length Title', async () => {
    const maxTitle = 'T'.repeat(255);
    mockUpdateTask.mockResolvedValue({
      ...defaultTask,
      id: 8,
      title: maxTitle,
    });

    renderTaskForm({ ...defaultTask, id: 8 });

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: maxTitle } });
    fireEvent.submit(screen.getByTestId('task-form'));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(8, {
        title: maxTitle,
        description: defaultTask.description,
        status: defaultTask.status,
        event_id: defaultTask.event_id,
      });
      expect(screen.getByDisplayValue(maxTitle)).toBeInTheDocument();
    });
  });

  // Test Case 10: Network Error During Edit
  it('Network Error During Edit', async () => {
    mockUpdateTask.mockRejectedValue(new Error('Network Error'));

    renderTaskForm({ ...defaultTask, id: 9 });

    fireEvent.submit(screen.getByTestId('task-form'));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalled();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  // Test Case 11: Submit Edit Form Without Changes
  it('Submit Edit Form Without Changes', async () => {
    mockUpdateTask.mockResolvedValue({
      ...defaultTask,
      id: 10,
      title: 'Same',
    });

    renderTaskForm({ ...defaultTask, id: 10, title: 'Same' });

    fireEvent.submit(screen.getByTestId('task-form'));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith(10, {
        title: 'Same',
        description: defaultTask.description,
        status: defaultTask.status,
        event_id: defaultTask.event_id,
      });
      expect(screen.getByDisplayValue('Same')).toBeInTheDocument();
    });
  });

  // Test Case 12: Edit Task With Multiple Invalid Fields
  it('Edit Task With Multiple Invalid Fields', async () => {
    mockUpdateTask.mockRejectedValue({
      response: {
        status: 400,
        data: {
          errors: {
            title: 'Title is required',
            status: 'Invalid status',
          },
        },
      },
    });

    renderTaskForm({ ...defaultTask, id: 11 });

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'Unknown' } });
    fireEvent.submit(screen.getByTestId('task-form'));

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalled();
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid status/i)).toBeInTheDocument();
    });
  });
});
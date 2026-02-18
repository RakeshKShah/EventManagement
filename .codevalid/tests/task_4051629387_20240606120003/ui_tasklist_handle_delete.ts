import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskList from '../../frontend/src/components/TaskList';
import { deleteTask as deleteTaskApi } from '../../frontend/src/services/api';
import '@testing-library/jest-dom';

jest.mock('../../frontend/src/services/api', () => ({
  deleteTask: jest.fn(),
}));

const mockOnDelete = jest.fn();

const originalAlert = window.alert;
const originalConfirm = window.confirm;

beforeEach(() => {
  jest.clearAllMocks();
  window.alert = jest.fn();
  window.confirm = jest.fn();
});

afterAll(() => {
  window.alert = originalAlert;
  window.confirm = originalConfirm;
});

const tasks = [
  { id: 1, title: 'Task 1' },
  { id: 2, title: 'Task 2' },
  { id: 3, title: 'Task 3' },
  { id: 4, title: 'Task 4' },
  { id: 5, title: 'Task 5' },
  { id: 6, title: 'Task 6' },
  { id: 7, title: 'Task 7' },
  { id: 8, title: 'Task 8' },
  { id: 9, title: 'Task 9' },
  { id: 10, title: 'Task 10' },
];

// Helper to render TaskList with given tasks
function renderTaskList(taskArr: any[]) {
  render(
    <TaskList
      tasks={taskArr}
      onDelete={mockOnDelete}
    />
  );
}

// Helper to get delete button for a task by id
function getDeleteButton(taskId: number) {
  return screen.getByTestId(`delete-task-${taskId}`);
}

// Test Case 1: Delete Task Successfully
test('Delete Task Successfully', async () => {
  window.confirm = jest.fn(() => true);
  (deleteTaskApi as jest.Mock).mockResolvedValueOnce({});
  renderTaskList([tasks[0]]);

  fireEvent.click(getDeleteButton(1));

  await waitFor(() => {
    expect(deleteTaskApi).toHaveBeenCalledWith(1);
    expect(mockOnDelete).toHaveBeenCalled();
    expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
    expect(window.alert).not.toHaveBeenCalled();
  });
});

// Test Case 2: Delete Task API Error Handling
test('Delete Task API Error Handling', async () => {
  window.confirm = jest.fn(() => true);
  const error = new Error('API error');
  (deleteTaskApi as jest.Mock).mockRejectedValueOnce(error);
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  renderTaskList([tasks[1]]);

  fireEvent.click(getDeleteButton(2));

  await waitFor(() => {
    expect(deleteTaskApi).toHaveBeenCalledWith(2);
    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(window.alert).toHaveBeenCalledWith('Failed to delete task');
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  consoleSpy.mockRestore();
});

// Test Case 3: Cancel Delete Task Confirmation
test('Cancel Delete Task Confirmation', async () => {
  window.confirm = jest.fn(() => false);
  renderTaskList([tasks[2]]);

  fireEvent.click(getDeleteButton(3));

  await waitFor(() => {
    expect(deleteTaskApi).not.toHaveBeenCalled();
    expect(mockOnDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
    expect(window.alert).not.toHaveBeenCalled();
  });
});

// Test Case 4: Delete Task with Non-existent ID
test('Delete Task with Non-existent ID', async () => {
  window.confirm = jest.fn(() => true);
  const error = { response: { status: 404 } };
  (deleteTaskApi as jest.Mock).mockRejectedValueOnce(error);
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  renderTaskList([{ id: 999, title: 'Ghost Task' }]);

  fireEvent.click(getDeleteButton(999));

  await waitFor(() => {
    expect(deleteTaskApi).toHaveBeenCalledWith(999);
    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(window.alert).toHaveBeenCalledWith('Failed to delete task');
    expect(screen.getByText('Ghost Task')).toBeInTheDocument();
  });

  consoleSpy.mockRestore();
});

// Test Case 5: No Side Effects on Other Tasks
test('No Side Effects on Other Tasks', async () => {
  window.confirm = jest.fn(() => true);
  (deleteTaskApi as jest.Mock).mockResolvedValueOnce({});
  renderTaskList([tasks[3], tasks[4]]);

  fireEvent.click(getDeleteButton(4));

  await waitFor(() => {
    expect(deleteTaskApi).toHaveBeenCalledWith(4);
    expect(mockOnDelete).toHaveBeenCalled();
    expect(screen.queryByText('Task 4')).not.toBeInTheDocument();
    expect(screen.getByText('Task 5')).toBeInTheDocument();
  });
});

// Test Case 6: UI Refreshes After Successful Deletion
test('UI Refreshes After Successful Deletion', async () => {
  window.confirm = jest.fn(() => true);
  (deleteTaskApi as jest.Mock).mockResolvedValueOnce({});
  renderTaskList([tasks[0], tasks[1], tasks[2]]);

  fireEvent.click(getDeleteButton(1));

  await waitFor(() => {
    expect(mockOnDelete).toHaveBeenCalled();
    expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
  });
});

// Test Case 7: Alert Message on Delete Failure
test('Alert Message on Delete Failure', async () => {
  window.confirm = jest.fn(() => true);
  (deleteTaskApi as jest.Mock).mockRejectedValueOnce(new Error('Generic error'));
  renderTaskList([tasks[5]]);

  fireEvent.click(getDeleteButton(6));

  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith('Failed to delete task');
  });
});

// Test Case 8: Delete Task Loading State Handling
test('Delete Task Loading State Handling', async () => {
  window.confirm = jest.fn(() => true);
  let resolveDelete: Function;
  (deleteTaskApi as jest.Mock).mockImplementationOnce(() =>
    new Promise((resolve) => {
      resolveDelete = resolve;
      setTimeout(() => resolve({}), 100);
    })
  );
  renderTaskList([tasks[6]]);

  fireEvent.click(getDeleteButton(7));

  // Check loading state (e.g., button disabled or spinner)
  const deleteBtn = getDeleteButton(7);
  expect(deleteBtn).toBeDisabled();

  // Wait for API to resolve
  await waitFor(() => {
    expect(deleteTaskApi).toHaveBeenCalledWith(7);
    expect(mockOnDelete).toHaveBeenCalled();
    expect(screen.queryByText('Task 7')).not.toBeInTheDocument();
  });
});

// Test Case 9: Delete Last Task - Empty State
test('Delete Last Task - Empty State', async () => {
  window.confirm = jest.fn(() => true);
  (deleteTaskApi as jest.Mock).mockResolvedValueOnce({});
  renderTaskList([tasks[7]]);

  fireEvent.click(getDeleteButton(8));

  await waitFor(() => {
    expect(screen.queryByText('Task 8')).not.toBeInTheDocument();
    // Check for empty state UI/message
    expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
  });
});

// Test Case 10: Multiple Delete Actions in Sequence
test('Multiple Delete Actions in Sequence', async () => {
  window.confirm = jest.fn(() => true);
  (deleteTaskApi as jest.Mock).mockResolvedValue({});
  renderTaskList([tasks[8], tasks[9]]);

  fireEvent.click(getDeleteButton(9));
  await waitFor(() => {
    expect(deleteTaskApi).toHaveBeenCalledWith(9);
    expect(mockOnDelete).toHaveBeenCalled();
    expect(screen.queryByText('Task 9')).not.toBeInTheDocument();
  });

  fireEvent.click(getDeleteButton(10));
  await waitFor(() => {
    expect(deleteTaskApi).toHaveBeenCalledWith(10);
    expect(mockOnDelete).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Task 10')).not.toBeInTheDocument();
  });
});
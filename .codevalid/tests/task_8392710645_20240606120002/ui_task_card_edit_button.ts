import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskCard from '../../frontend/src/components/TaskCard';
import { act } from 'react-dom/test-utils';
import { server, rest } from 'msw';
import { setupServer } from 'msw/node';

// Mock API endpoint for edit actions
const API_URL = '/api/tasks/';

// Helper: mock task object
const mockTask = {
  id: '123',
  title: 'Test Task',
  description: 'Test Description',
  status: 'To Do',
  event_id: 'evt-1',
};

// Helper: render TaskCard with props
const renderTaskCard = (props = {}) =>
  render(
    <TaskCard
      task={mockTask}
      onEdit={jest.fn()}
      hasEditPermission={true}
      isLoading={false}
      {...props}
    />
  );

// MSW server for API mocking
const handlers = [
  rest.put(`${API_URL}:id`, (req, res, ctx) => {
    const { event_id, status, title, description } = req.body as any;
    // Test Case 8: Success
    if (
      event_id &&
      ['To Do', 'In Progress', 'Completed'].includes(status) &&
      title &&
      description
    ) {
      return res(
        ctx.status(200),
        ctx.json({
          ...mockTask,
          ...req.body,
        })
      );
    }
    // Test Case 9: Invalid event_id
    if (!event_id || event_id === 'invalid') {
      return res(
        ctx.status(400),
        ctx.json({ errors: [{ field: 'event_id', message: 'Invalid event_id' }] })
      );
    }
    // Test Case 10: Invalid status
    if (!['To Do', 'In Progress', 'Completed'].includes(status)) {
      return res(
        ctx.status(400),
        ctx.json({ errors: [{ field: 'status', message: 'Invalid status' }] })
      );
    }
    // Test Case 12: Multiple field errors
    if (!title && !description) {
      return res(
        ctx.status(400),
        ctx.json({
          errors: [
            { field: 'title', message: 'Title required' },
            { field: 'description', message: 'Description required' },
          ],
        })
      );
    }
    // Test Case 11: Not found
    if (req.params.id === 'notfound') {
      return res(ctx.status(404), ctx.json({ message: 'Task not found' }));
    }
    return res(ctx.status(400), ctx.json({ message: 'Unknown error' }));
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('TaskCard (Edit Button)', () => {
  // Test Case 1: Edit button renders for each TaskCard
  it('Edit button renders for each TaskCard', () => {
    renderTaskCard();
    const editBtn = screen.getByRole('button', { name: /edit/i });
    expect(editBtn).toBeInTheDocument();
    expect(editBtn).toBeVisible();
  });

  // Test Case 2: Edit button click triggers onEdit callback
  it('Edit button click triggers onEdit callback', () => {
    const onEdit = jest.fn();
    renderTaskCard({ onEdit });
    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  // Test Case 3: Edit button is disabled when loading
  it('Edit button is disabled when loading', () => {
    renderTaskCard({ isLoading: true });
    const editBtn = screen.getByRole('button', { name: /edit/i });
    expect(editBtn).toBeDisabled();
    fireEvent.click(editBtn);
    // Should not call onEdit
    // (If onEdit is undefined, no error should be thrown)
  });

  // Test Case 4: Edit button click with no onEdit callback provided
  it('Edit button click with no onEdit callback provided', () => {
    renderTaskCard({ onEdit: undefined });
    const editBtn = screen.getByRole('button', { name: /edit/i });
    expect(() => fireEvent.click(editBtn)).not.toThrow();
    // App remains stable, no error thrown
  });

  // Test Case 5: Multiple rapid clicks on Edit button
  it('Multiple rapid clicks on Edit button', () => {
    const onEdit = jest.fn();
    renderTaskCard({ onEdit });
    const editBtn = screen.getByRole('button', { name: /edit/i });
    for (let i = 0; i < 5; i++) {
      fireEvent.click(editBtn);
    }
    // If debounced, expect 1; else, expect 5
    // Adjust assertion based on implementation
    expect(onEdit.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(onEdit.mock.calls.length).toBeLessThanOrEqual(5);
  });

  // Test Case 6: Edit button has appropriate accessibility attributes
  it('Edit button has appropriate accessibility attributes', () => {
    renderTaskCard();
    const editBtn = screen.getByRole('button', { name: /edit/i });
    expect(editBtn).toHaveAccessibleName('Edit');
    expect(editBtn).toHaveAttribute('aria-label', 'Edit');
    // Keyboard navigation
    editBtn.focus();
    expect(editBtn).toHaveFocus();
    fireEvent.keyDown(editBtn, { key: 'Enter', code: 'Enter' });
    // If onEdit is defined, should trigger
    // (Cannot assert callback here unless passed)
  });

  // Test Case 7: Edit button is not rendered if user lacks permission
  it('Edit button is not rendered if user lacks permission', () => {
    renderTaskCard({ hasEditPermission: false });
    const editBtn = screen.queryByRole('button', { name: /edit/i });
    expect(editBtn).not.toBeInTheDocument();
  });

  // Test Case 8: Edit action triggers API call and updates UI on success
  it('Edit action triggers API call and updates UI on success', async () => {
    // Simulate opening edit form, submitting valid data
    renderTaskCard();
    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);
    // Assume edit form appears
    const titleInput = screen.getByLabelText(/title/i);
    const descInput = screen.getByLabelText(/description/i);
    const statusSelect = screen.getByLabelText(/status/i);
    const eventIdInput = screen.getByLabelText(/event id/i);
    fireEvent.change(titleInput, { target: { value: 'Updated Task' } });
    fireEvent.change(descInput, { target: { value: 'Updated Description' } });
    fireEvent.change(statusSelect, { target: { value: 'Completed' } });
    fireEvent.change(eventIdInput, { target: { value: 'evt-2' } });
    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);
    await waitFor(() =>
      expect(screen.getByText('Updated Task')).toBeInTheDocument()
    );
    expect(screen.getByText('Updated Description')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('evt-2')).toBeInTheDocument();
  });

  // Test Case 9: Edit action fails with 400 if event_id is invalid or omitted
  it('Edit action fails with 400 if event_id is invalid or omitted', async () => {
    renderTaskCard();
    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);
    const eventIdInput = screen.getByLabelText(/event id/i);
    fireEvent.change(eventIdInput, { target: { value: '' } });
    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);
    await waitFor(() =>
      expect(screen.getByText(/invalid event_id/i)).toBeInTheDocument()
    );
    // Task not updated
    expect(screen.getByText(mockTask.title)).toBeInTheDocument();
  });

  // Test Case 10: Edit action fails with 400 if status is invalid
  it('Edit action fails with 400 if status is invalid', async () => {
    renderTaskCard();
    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);
    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: 'InvalidStatus' } });
    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);
    await waitFor(() =>
      expect(screen.getByText(/invalid status/i)).toBeInTheDocument()
    );
    // Task not updated
    expect(screen.getByText(mockTask.status)).toBeInTheDocument();
  });

  // Test Case 11: Edit action fails with 404 if task id does not exist
  it('Edit action fails with 404 if task id does not exist', async () => {
    render(
      <TaskCard
        task={{ ...mockTask, id: 'notfound' }}
        onEdit={jest.fn()}
        hasEditPermission={true}
        isLoading={false}
      />
    );
    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);
    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);
    await waitFor(() =>
      expect(screen.getByText(/not-found/i)).toBeInTheDocument()
    );
    // Task not updated
    expect(screen.getByText(mockTask.title)).toBeInTheDocument();
  });

  // Test Case 12: Edit action returns multiple field validation errors on 400
  it('Edit action returns multiple field validation errors on 400', async () => {
    renderTaskCard();
    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);
    const titleInput = screen.getByLabelText(/title/i);
    const descInput = screen.getByLabelText(/description/i);
    fireEvent.change(titleInput, { target: { value: '' } });
    fireEvent.change(descInput, { target: { value: '' } });
    const submitBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitBtn);
    await waitFor(() =>
      expect(screen.getByText(/title required/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/description required/i)).toBeInTheDocument();
    // Task not updated
    expect(screen.getByText(mockTask.title)).toBeInTheDocument();
  });

  // Test Case 13: User cancels edit action
  it('User cancels edit action', async () => {
    renderTaskCard();
    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Changed Title' } });
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);
    // No PUT API call made, UI unchanged
    await waitFor(() =>
      expect(screen.getByText(mockTask.title)).toBeInTheDocument()
    );
    expect(screen.queryByText('Changed Title')).not.toBeInTheDocument();
  });
});
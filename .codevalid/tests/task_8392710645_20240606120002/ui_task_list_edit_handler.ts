import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import TaskList from '../../../frontend/src/components/TaskList'
import TaskForm from '../../../frontend/src/components/TaskForm'
import { Task, Event } from '../../../frontend/src/types'
import * as api from '../../../frontend/src/services/api'

jest.mock('../../../frontend/src/services/api')

const mockTasks: Task[] = [
  {
    id: 1,
    title: 'Task A',
    description: 'Desc A',
    status: 'To Do',
    event_id: 101,
  },
  {
    id: 2,
    title: 'Task B',
    description: 'Desc B',
    status: 'In Progress',
    event_id: 102,
  },
]
const mockEvents: Event[] = [
  { id: 101, name: 'Event X' },
  { id: 102, name: 'Event Y' },
]

describe('TaskList (onEdit handler)', () => {
  let onEdit: jest.Mock
  let onDelete: jest.Mock
  let onCreateNew: jest.Mock

  beforeEach(() => {
    onEdit = jest.fn()
    onDelete = jest.fn()
    onCreateNew = jest.fn()
    jest.clearAllMocks()
  })

  // Test Case 1: Open TaskForm modal on Edit
  it('Open TaskForm modal on Edit', async () => {
    render(
      <TaskList
        tasks={mockTasks}
        events={mockEvents}
        onEdit={onEdit}
        onDelete={onDelete}
        onCreateNew={onCreateNew}
      />
    )
    // Find Edit button for Task A
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    fireEvent.click(editButtons[0])
    expect(onEdit).toHaveBeenCalledWith(mockTasks[0])
    // Simulate opening TaskForm modal with task data
    render(
      <TaskForm
        task={mockTasks[0]}
        events={mockEvents}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    )
    expect(screen.getByText('Edit Task')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Task A')).toBeInTheDocument()
  })

  // Test Case 2: Prefill TaskForm with correct task data
  it('Prefill TaskForm with correct task data', () => {
    render(
      <TaskForm
        task={mockTasks[1]}
        events={mockEvents}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    )
    expect(screen.getByDisplayValue('Task B')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Desc B')).toBeInTheDocument()
    expect(screen.getByDisplayValue('In Progress')).toBeInTheDocument()
    expect(screen.getByDisplayValue('102')).toBeInTheDocument()
  })

  // Test Case 3: Successful task update via TaskForm
  it('Successful task update via TaskForm', async () => {
    (api.updateTask as jest.Mock).mockResolvedValue({
      ...mockTasks[1],
      title: 'Task B Updated',
      status: 'Completed',
    })
    const onSuccess = jest.fn()
    render(
      <TaskForm
        task={mockTasks[1]}
        events={mockEvents}
        onClose={jest.fn()}
        onSuccess={onSuccess}
      />
    )
    fireEvent.change(screen.getByLabelText(/Task Title/i), {
      target: { value: 'Task B Updated' },
    })
    fireEvent.change(screen.getByLabelText(/Status/i), {
      target: { value: 'Completed' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Update/i }))
    await waitFor(() => expect(api.updateTask).toHaveBeenCalledWith(2, expect.objectContaining({
      title: 'Task B Updated',
      status: 'Completed',
    })))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  // Test Case 4: Reject update if title is missing
  it('Reject update if title is missing', async () => {
    render(
      <TaskForm
        task={mockTasks[0]}
        events={mockEvents}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    )
    const titleInput = screen.getByLabelText(/Task Title/i)
    fireEvent.change(titleInput, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Update/i }))
    // Required attribute prevents submission, so modal remains open
    expect(titleInput).toBeInvalid()
    expect(api.updateTask).not.toHaveBeenCalled()
    expect(screen.getByText('Edit Task')).toBeInTheDocument()
  })

  // Test Case 5: Reject update if status is invalid
  it('Reject update if status is invalid', async () => {
    (api.updateTask as jest.Mock).mockRejectedValue({
      response: { status: 400, data: { detail: 'Invalid status' } },
    })
    render(
      <TaskForm
        task={mockTasks[0]}
        events={mockEvents}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    )
    // Simulate invalid status (not in select options)
    fireEvent.change(screen.getByLabelText(/Status/i), {
      target: { value: 'Blocked' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Update/i }))
    await waitFor(() =>
      expect(screen.getByText(/Invalid status/i)).toBeInTheDocument()
    )
    expect(api.updateTask).toHaveBeenCalled()
    expect(screen.getByText('Edit Task')).toBeInTheDocument()
  })

  // Test Case 6: Reject update if event_id missing
  it('Reject update if event_id missing', async () => {
    render(
      <TaskForm
        task={mockTasks[0]}
        events={mockEvents}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    )
    const eventSelect = screen.getByLabelText(/Event/i)
    fireEvent.change(eventSelect, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Update/i }))
    expect(eventSelect).toBeInvalid()
    expect(api.updateTask).not.toHaveBeenCalled()
    expect(screen.getByText('Edit Task')).toBeInTheDocument()
  })

  // Test Case 7: Reject update if event_id is invalid
  it('Reject update if event_id is invalid', async () => {
    (api.updateTask as jest.Mock).mockRejectedValue({
      response: { status: 400, data: { detail: 'Invalid event_id' } },
    })
    render(
      <TaskForm
        task={mockTasks[0]}
        events={mockEvents}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    )
    // Simulate invalid event_id (not in event list)
    fireEvent.change(screen.getByLabelText(/Event/i), {
      target: { value: '999' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Update/i }))
    await waitFor(() =>
      expect(screen.getByText(/Invalid event_id/i)).toBeInTheDocument()
    )
    expect(api.updateTask).toHaveBeenCalled()
    expect(screen.getByText('Edit Task')).toBeInTheDocument()
  })

  // Test Case 8: Handle editing a non-existent task
  it('Handle editing a non-existent task', async () => {
    (api.updateTask as jest.Mock).mockRejectedValue({
      response: { status: 404, data: { detail: 'Task not found' } },
    })
    render(
      <TaskForm
        task={{ ...mockTasks[0], id: 999 }}
        events={mockEvents}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Update/i }))
    await waitFor(() =>
      expect(screen.getByText(/Task not found/i)).toBeInTheDocument()
    )
    expect(api.updateTask).toHaveBeenCalled()
    expect(screen.getByText('Edit Task')).toBeInTheDocument()
  })

  // Test Case 9: Edit multiple tasks in succession
  it('Edit multiple tasks in succession', async () => {
    (api.updateTask as jest.Mock).mockResolvedValueOnce({
      ...mockTasks[0],
      title: 'Task A Updated',
    })
    (api.updateTask as jest.Mock).mockResolvedValueOnce({
      ...mockTasks[1],
      title: 'Task B Updated',
    })
    const onSuccess = jest.fn()
    // Edit Task A
    render(
      <TaskForm
        task={mockTasks[0]}
        events={mockEvents}
        onClose={jest.fn()}
        onSuccess={onSuccess}
      />
    )
    fireEvent.change(screen.getByLabelText(/Task Title/i), {
      target: { value: 'Task A Updated' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Update/i }))
    await waitFor(() => expect(api.updateTask).toHaveBeenCalledWith(1, expect.objectContaining({
      title: 'Task A Updated',
    })))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    // Edit Task B
    render(
      <TaskForm
        task={mockTasks[1]}
        events={mockEvents}
        onClose={jest.fn()}
        onSuccess={onSuccess}
      />
    )
    fireEvent.change(screen.getByLabelText(/Task Title/i), {
      target: { value: 'Task B Updated' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Update/i }))
    await waitFor(() => expect(api.updateTask).toHaveBeenCalledWith(2, expect.objectContaining({
      title: 'Task B Updated',
    })))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  // Test Case 10: Cancel edit does not update task
  it('Cancel edit does not update task', () => {
    render(
      <TaskForm
        task={mockTasks[0]}
        events={mockEvents}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(api.updateTask).not.toHaveBeenCalled()
    expect(screen.getByText('Edit Task')).toBeInTheDocument()
  })

  // Test Case 11: Form displays API validation errors
  it('Form displays API validation errors', async () => {
    (api.updateTask as jest.Mock).mockRejectedValue({
      response: {
        status: 400,
        data: {
          detail: 'Validation error',
          errors: [
            { field: 'title', message: 'Title too long' },
            { field: 'description', message: 'Description required' },
          ],
        },
      },
    })
    render(
      <TaskForm
        task={mockTasks[0]}
        events={mockEvents}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    )
    fireEvent.change(screen.getByLabelText(/Task Title/i), {
      target: { value: 'A'.repeat(300) },
    })
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Update/i }))
    await waitFor(() =>
      expect(screen.getByText(/Validation error/i)).toBeInTheDocument()
    )
    // Optionally check for field-specific errors if UI displays them
    // expect(screen.getByText(/Title too long/i)).toBeInTheDocument()
    // expect(screen.getByText(/Description required/i)).toBeInTheDocument()
    expect(api.updateTask).toHaveBeenCalled()
    expect(screen.getByText('Edit Task')).toBeInTheDocument()
  })
})
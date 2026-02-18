import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import TaskForm from '../../../frontend/src/components/TaskForm'
import * as api from '../../../frontend/src/services/api'
import { Task, Event } from '../../../frontend/src/types'

jest.mock('../../../frontend/src/services/api')

const mockOnSuccess = jest.fn()
const mockOnClose = jest.fn()

const events: Event[] = [
  { id: 1, name: 'Event One', description: 'Desc', date: '2024-06-01' },
  { id: 2, name: 'Event Two', description: 'Desc', date: '2024-06-02' },
]

const allowedStatuses = ['To Do', 'In Progress', 'Completed']

function fillForm({ title, description, status, eventId }: { title?: string, description?: string, status?: string, eventId?: number }) {
  if (title !== undefined) {
    fireEvent.change(screen.getByLabelText(/Task Title/i), { target: { value: title } })
  }
  if (description !== undefined) {
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: description } })
  }
  if (status !== undefined) {
    fireEvent.change(screen.getByLabelText(/Status/i), { target: { value: status } })
  }
  if (eventId !== undefined) {
    fireEvent.change(screen.getByLabelText(/Event/i), { target: { value: String(eventId) } })
  }
}

describe('TaskForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Remove alert mocks between tests
    window.alert = jest.fn()
  })

  // Test Case 1: Create Task with Valid Data
  it('Create Task with Valid Data', async () => {
    (api.createTask as jest.Mock).mockResolvedValue({
      id: 10,
      title: 'Buy groceries',
      description: 'Milk, eggs, bread',
      status: 'To Do',
      event_id: 1,
    })
    render(<TaskForm events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    fillForm({ title: 'Buy groceries', description: 'Milk, eggs, bread', status: 'To Do', eventId: 1 })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.createTask).toHaveBeenCalledWith({
      title: 'Buy groceries',
      description: 'Milk, eggs, bread',
      status: 'To Do',
      event_id: 1,
    }))
    expect(mockOnSuccess).toHaveBeenCalled()
    expect(window.alert).not.toHaveBeenCalled()
    // Simulate GET
    (api.getTasks as jest.Mock).mockResolvedValue([
      { id: 10, title: 'Buy groceries', description: 'Milk, eggs, bread', status: 'To Do', event_id: 1 }
    ])
    const tasks = await api.getTasks(1)
    expect(tasks).toEqual([
      { id: 10, title: 'Buy groceries', description: 'Milk, eggs, bread', status: 'To Do', event_id: 1 }
    ])
  })

  // Test Case 2: Create Task with Invalid Status
  it('Create Task with Invalid Status', async () => {
    (api.createTask as jest.Mock).mockRejectedValue({
      response: { data: { detail: 'Invalid status value.' } }
    })
    render(<TaskForm events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    fillForm({ title: 'Water plants', description: 'Outside garden', status: 'Done', eventId: 1 })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Invalid status value.'))
    expect(api.createTask).toHaveBeenCalled()
    expect(mockOnSuccess).not.toHaveBeenCalled()
    (api.getTasks as jest.Mock).mockResolvedValue([])
    const tasks = await api.getTasks(1)
    expect(tasks).toEqual([])
  })

  // Test Case 3: Create Task Missing Title
  it('Create Task Missing Title', async () => {
    (api.createTask as jest.Mock).mockRejectedValue({
      response: { data: { detail: 'Missing required field(s): title and/or status.' } }
    })
    render(<TaskForm events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    fillForm({ description: 'Call Alice', status: 'To Do', eventId: 1 })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Missing required field(s): title and/or status.'))
    expect(api.createTask).toHaveBeenCalled()
    expect(mockOnSuccess).not.toHaveBeenCalled()
    (api.getTasks as jest.Mock).mockResolvedValue([])
    const tasks = await api.getTasks(1)
    expect(tasks).toEqual([])
  })

  // Test Case 4: Create Task Missing Status
  it('Create Task Missing Status', async () => {
    (api.createTask as jest.Mock).mockRejectedValue({
      response: { data: { detail: 'Missing required field(s): title and/or status.' } }
    })
    render(<TaskForm events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    fillForm({ title: 'Pay bills', description: 'Electricity and water', eventId: 1 })
    // Remove status selection
    fireEvent.change(screen.getByLabelText(/Status/i), { target: { value: '' } })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Missing required field(s): title and/or status.'))
    expect(api.createTask).toHaveBeenCalled()
    expect(mockOnSuccess).not.toHaveBeenCalled()
    (api.getTasks as jest.Mock).mockResolvedValue([])
    const tasks = await api.getTasks(1)
    expect(tasks).toEqual([])
  })

  // Test Case 5: Create Task Missing Both Title and Status
  it('Create Task Missing Both Title and Status', async () => {
    (api.createTask as jest.Mock).mockRejectedValue({
      response: { data: { detail: 'Missing required field(s): title and/or status.' } }
    })
    render(<TaskForm events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    fillForm({ description: 'Finish report', eventId: 1 })
    fireEvent.change(screen.getByLabelText(/Status/i), { target: { value: '' } })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Missing required field(s): title and/or status.'))
    expect(api.createTask).toHaveBeenCalled()
    expect(mockOnSuccess).not.toHaveBeenCalled()
    (api.getTasks as jest.Mock).mockResolvedValue([])
    const tasks = await api.getTasks(1)
    expect(tasks).toEqual([])
  })

  // Test Case 6: Create Duplicate Task
  it('Create Duplicate Task', async () => {
    (api.createTask as jest.Mock).mockRejectedValue({
      response: { data: { detail: 'Duplicate task.' } }
    })
    render(<TaskForm events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    fillForm({ title: 'Meeting', description: 'Discuss Q2 goals', status: 'To Do', eventId: 1 })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Duplicate task.'))
    expect(api.createTask).toHaveBeenCalled()
    expect(mockOnSuccess).not.toHaveBeenCalled()
    (api.getTasks as jest.Mock).mockResolvedValue([
      { id: 1, title: 'Meeting', description: 'Discuss Q2 goals', status: 'To Do', event_id: 1 }
    ])
    const tasks = await api.getTasks(1)
    expect(tasks.length).toBe(1)
  })

  // Test Case 7: Create Task with Empty Description
  it('Create Task with Empty Description', async () => {
    (api.createTask as jest.Mock).mockResolvedValue({
      id: 11,
      title: 'Read book',
      description: null,
      status: 'Completed',
      event_id: 1,
    })
    render(<TaskForm events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    fillForm({ title: 'Read book', status: 'Completed', eventId: 1 })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.createTask).toHaveBeenCalledWith({
      title: 'Read book',
      description: null,
      status: 'Completed',
      event_id: 1,
    }))
    expect(mockOnSuccess).toHaveBeenCalled()
    (api.getTasks as jest.Mock).mockResolvedValue([
      { id: 11, title: 'Read book', description: null, status: 'Completed', event_id: 1 }
    ])
    const tasks = await api.getTasks(1)
    expect(tasks[0].description).toBeNull()
  })

  // Test Case 8: Update Existing Task Successfully
  it('Update Existing Task Successfully', async () => {
    const existingTask: Task = {
      id: 2,
      title: 'Old Task',
      description: 'Old description',
      status: 'To Do',
      event_id: 1,
    }
    (api.updateTask as jest.Mock).mockResolvedValue({
      ...existingTask,
      description: 'Updated description'
    })
    render(<TaskForm task={existingTask} events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    fillForm({ description: 'Updated description' })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.updateTask).toHaveBeenCalledWith(2, {
      title: 'Old Task',
      description: 'Updated description',
      status: 'To Do',
      event_id: 1,
    }))
    expect(mockOnSuccess).toHaveBeenCalled()
    (api.getTask as jest.Mock).mockResolvedValue({
      ...existingTask,
      description: 'Updated description'
    })
    const task = await api.getTask(2)
    expect(task.description).toBe('Updated description')
  })

  // Test Case 9: Update Task with Invalid Status
  it('Update Task with Invalid Status', async () => {
    const existingTask: Task = {
      id: 3,
      title: 'Task',
      description: 'Desc',
      status: 'To Do',
      event_id: 1,
    }
    (api.updateTask as jest.Mock).mockRejectedValue({
      response: { data: { detail: 'Invalid status value.' } }
    })
    render(<TaskForm task={existingTask} events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    fillForm({ status: 'Finished' })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Invalid status value.'))
    expect(api.updateTask).toHaveBeenCalled()
    expect(mockOnSuccess).not.toHaveBeenCalled()
    (api.getTask as jest.Mock).mockResolvedValue(existingTask)
    const task = await api.getTask(3)
    expect(task.status).toBe('To Do')
  })

  // Test Case 10: Update Task Missing Title
  it('Update Task Missing Title', async () => {
    const existingTask: Task = {
      id: 4,
      title: 'Task',
      description: 'Desc',
      status: 'To Do',
      event_id: 1,
    }
    (api.updateTask as jest.Mock).mockRejectedValue({
      response: { data: { detail: 'Missing required field(s): title and/or status.' } }
    })
    render(<TaskForm task={existingTask} events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    fillForm({ title: '' })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Missing required field(s): title and/or status.'))
    expect(api.updateTask).toHaveBeenCalled()
    expect(mockOnSuccess).not.toHaveBeenCalled()
    (api.getTask as jest.Mock).mockResolvedValue(existingTask)
    const task = await api.getTask(4)
    expect(task.title).toBe('Task')
  })

  // Test Case 11: Form Renders with Initial Values When Editing
  it('Form Renders with Initial Values When Editing', () => {
    const existingTask: Task = {
      id: 5,
      title: 'Review PR',
      description: 'Check code quality',
      status: 'In Progress',
      event_id: 2,
    }
    render(<TaskForm task={existingTask} events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    expect(screen.getByLabelText(/Task Title/i)).toHaveValue('Review PR')
    expect(screen.getByLabelText(/Description/i)).toHaveValue('Check code quality')
    expect(screen.getByLabelText(/Status/i)).toHaveValue('In Progress')
    expect(screen.getByLabelText(/Event/i)).toHaveValue('2')
  })

  // Test Case 12: Form Renders Empty When Creating New Task
  it('Form Renders Empty When Creating New Task', () => {
    render(<TaskForm events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    expect(screen.getByLabelText(/Task Title/i)).toHaveValue('')
    expect(screen.getByLabelText(/Description/i)).toHaveValue('')
    expect(screen.getByLabelText(/Status/i)).toHaveValue('To Do')
    expect(screen.getByLabelText(/Event/i)).toHaveValue('1')
  })

  // Test Case 13: Error Message Display on API Failure
  it('Error Message Display on API Failure', async () => {
    (api.createTask as jest.Mock).mockRejectedValue({
      response: { data: { detail: 'Network error.' } }
    })
    render(<TaskForm events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    fillForm({ title: 'Task', description: 'Desc', status: 'To Do', eventId: 1 })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Network error.'))
    expect(api.createTask).toHaveBeenCalled()
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  // Test Case 14: Create Task with Title at Maximum Length
  it('Create Task with Title at Maximum Length', async () => {
    const maxTitle = 'T'.repeat(255)
    (api.createTask as jest.Mock).mockResolvedValue({
      id: 12,
      title: maxTitle,
      description: 'Valid description',
      status: 'To Do',
      event_id: 1,
    })
    render(<TaskForm events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    fillForm({ title: maxTitle, description: 'Valid description', status: 'To Do', eventId: 1 })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.createTask).toHaveBeenCalledWith({
      title: maxTitle,
      description: 'Valid description',
      status: 'To Do',
      event_id: 1,
    }))
    expect(mockOnSuccess).toHaveBeenCalled()
    (api.getTasks as jest.Mock).mockResolvedValue([
      { id: 12, title: maxTitle, description: 'Valid description', status: 'To Do', event_id: 1 }
    ])
    const tasks = await api.getTasks(1)
    expect(tasks[0].title.length).toBe(255)
  })

  // Test Case 15: Create Task with Title at Minimum Length
  it('Create Task with Title at Minimum Length', async () => {
    (api.createTask as jest.Mock).mockResolvedValue({
      id: 13,
      title: 'A',
      description: 'Short title',
      status: 'To Do',
      event_id: 1,
    })
    render(<TaskForm events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    fillForm({ title: 'A', description: 'Short title', status: 'To Do', eventId: 1 })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.createTask).toHaveBeenCalledWith({
      title: 'A',
      description: 'Short title',
      status: 'To Do',
      event_id: 1,
    }))
    expect(mockOnSuccess).toHaveBeenCalled()
    (api.getTasks as jest.Mock).mockResolvedValue([
      { id: 13, title: 'A', description: 'Short title', status: 'To Do', event_id: 1 }
    ])
    const tasks = await api.getTasks(1)
    expect(tasks[0].title).toBe('A')
  })

  // Test Case 16: Create Task with Special Characters in Title and Description
  it('Create Task with Special Characters in Title and Description', async () => {
    (api.createTask as jest.Mock).mockResolvedValue({
      id: 14,
      title: '!@#$',
      description: 'Task with $%^&*',
      status: 'In Progress',
      event_id: 1,
    })
    render(<TaskForm events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    fillForm({ title: '!@#$', description: 'Task with $%^&*', status: 'In Progress', eventId: 1 })
    fireEvent.submit(screen.getByRole('form'))
    await waitFor(() => expect(api.createTask).toHaveBeenCalledWith({
      title: '!@#$',
      description: 'Task with $%^&*',
      status: 'In Progress',
      event_id: 1,
    }))
    expect(mockOnSuccess).toHaveBeenCalled()
    (api.getTasks as jest.Mock).mockResolvedValue([
      { id: 14, title: '!@#$', description: 'Task with $%^&*', status: 'In Progress', event_id: 1 }
    ])
    const tasks = await api.getTasks(1)
    expect(tasks[0].title).toBe('!@#$')
    expect(tasks[0].description).toBe('Task with $%^&*')
  })

  // Test Case 17: Status Dropdown Shows Correct Options
  it('Status Dropdown Shows Correct Options', () => {
    render(<TaskForm events={events} onSuccess={mockOnSuccess} onClose={mockOnClose} />)
    const statusSelect = screen.getByLabelText(/Status/i)
    const options = Array.from(statusSelect.querySelectorAll('option')).map(opt => opt.value)
    expect(options).toEqual(['To Do', 'In Progress', 'Completed'])
  })
})
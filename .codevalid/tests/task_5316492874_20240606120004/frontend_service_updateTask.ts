import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { updateTask, getTask, getTasks } from '../../../frontend/src/services/api'
import { Task, TaskUpdate } from '../../../frontend/src/types'

describe('frontend_service_updateTask', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(axios)
  })

  afterEach(() => {
    mock.restore()
  })

  // Test Case 1: Reassign Task to Another Valid Event
  it('Reassign Task to Another Valid Event', async () => {
    const taskId = 101
    const oldEventId = 201
    const newEventId = 202
    const updatedTask: Task = {
      id: taskId,
      title: 'Task 1 Updated',
      description: null,
      status: 'To Do',
      event_id: newEventId,
      created_at: '',
      updated_at: '',
    }

    mock.onPut(`/api/tasks/${taskId}`).reply(200, updatedTask)
    mock.onGet('/api/tasks', { params: { event_id: oldEventId } }).reply(200, [])
    mock.onGet('/api/tasks', { params: { event_id: newEventId } }).reply(200, [updatedTask])

    const response = await updateTask(taskId, { title: 'Task 1 Updated', event_id: newEventId })
    expect(response.event_id).toBe(newEventId)

    const oldEventTasks = await getTasks(oldEventId)
    expect(oldEventTasks).not.toContainEqual(expect.objectContaining({ id: taskId }))

    const newEventTasks = await getTasks(newEventId)
    expect(newEventTasks).toContainEqual(expect.objectContaining({ id: taskId }))
  })

  // Test Case 2: Reassign Task to Non-Existent Event Fails
  it('Reassign Task to Non-Existent Event Fails', async () => {
    const taskId = 103
    const invalidEventId = 999
    const originalTask: Task = {
      id: taskId,
      title: 'Task 103',
      description: null,
      status: 'To Do',
      event_id: 201,
      created_at: '',
      updated_at: '',
    }

    mock.onPut(`/api/tasks/${taskId}`).reply(404, { error: 'Event not found' })
    mock.onGet(`/api/tasks/${taskId}`).reply(200, originalTask)

    await expect(updateTask(taskId, { event_id: invalidEventId })).rejects.toMatchObject({
      response: { status: 404, data: { error: 'Event not found' } },
    })

    const task = await getTask(taskId)
    expect(task.event_id).toBe(201)
  })

  // Test Case 3: Remove Task from Event Without Reassignment Deletes Task
  it('Remove Task from Event Without Reassignment Deletes Task', async () => {
    const taskId = 104
    const eventId = 201

    mock.onPut(`/api/tasks/${taskId}`).reply(204)
    mock.onGet('/api/tasks', { params: { event_id: eventId } }).reply(200, [])

    const response = await updateTask(taskId, { event_id: null })
    expect(response).toBeUndefined()

    const eventTasks = await getTasks(eventId)
    expect(eventTasks).not.toContainEqual(expect.objectContaining({ id: taskId }))
  })

  // Test Case 4: Update Task Attributes Without Changing Event
  it('Update Task Attributes Without Changing Event', async () => {
    const taskId = 105
    const eventId = 201
    const updatedTask: Task = {
      id: taskId,
      title: 'New Name',
      description: 'Updated desc',
      status: 'To Do',
      event_id: eventId,
      created_at: '',
      updated_at: '',
    }

    mock.onPut(`/api/tasks/${taskId}`).reply(200, updatedTask)
    mock.onGet(`/api/tasks/${taskId}`).reply(200, updatedTask)

    const response = await updateTask(taskId, {
      title: 'New Name',
      description: 'Updated desc',
      event_id: eventId,
    })
    expect(response.title).toBe('New Name')
    expect(response.description).toBe('Updated desc')
    expect(response.event_id).toBe(eventId)

    const task = await getTask(taskId)
    expect(task.title).toBe('New Name')
    expect(task.description).toBe('Updated desc')
    expect(task.event_id).toBe(eventId)
  })

  // Test Case 5: Update Task with Missing Event ID Fails
  it('Update Task with Missing Event ID Fails', async () => {
    const taskId = 106
    const originalTask: Task = {
      id: taskId,
      title: 'Task 106',
      description: null,
      status: 'To Do',
      event_id: 201,
      created_at: '',
      updated_at: '',
    }

    mock.onPut(`/api/tasks/${taskId}`).reply(400, { error: 'Missing event_id' })
    mock.onGet(`/api/tasks/${taskId}`).reply(200, originalTask)

    await expect(updateTask(taskId, { title: 'No Event ID' })).rejects.toMatchObject({
      response: { status: 400, data: { error: 'Missing event_id' } },
    })

    const task = await getTask(taskId)
    expect(task.event_id).toBe(201)
  })

  // Test Case 6: Update Non-Existent Task Fails
  it('Update Non-Existent Task Fails', async () => {
    const taskId = 99999

    mock.onPut(`/api/tasks/${taskId}`).reply(404, { error: 'Task not found' })

    await expect(updateTask(taskId, { event_id: 201 })).rejects.toMatchObject({
      response: { status: 404, data: { error: 'Task not found' } },
    })
  })

  // Test Case 7: Reassign Task to Same Event Leaves Association Unchanged
  it('Reassign Task to Same Event Leaves Association Unchanged', async () => {
    const taskId = 107
    const eventId = 201
    const task: Task = {
      id: taskId,
      title: 'Task 107',
      description: null,
      status: 'To Do',
      event_id: eventId,
      created_at: '',
      updated_at: '',
    }

    mock.onPut(`/api/tasks/${taskId}`).reply(200, task)
    mock.onGet(`/api/tasks/${taskId}`).reply(200, task)

    const response = await updateTask(taskId, { event_id: eventId })
    expect(response.event_id).toBe(eventId)

    const updatedTask = await getTask(taskId)
    expect(updatedTask.event_id).toBe(eventId)
  })

  // Test Case 8: Update Task When Current Event Was Deleted
  it('Update Task When Current Event Was Deleted', async () => {
    const taskId = 108
    const deletedEventId = 202
    const newEventId = 203

    mock.onPut(`/api/tasks/${taskId}`).reply(404, { error: 'Task does not exist or was deleted' })

    await expect(updateTask(taskId, { event_id: newEventId })).rejects.toMatchObject({
      response: { status: 404, data: { error: 'Task does not exist or was deleted' } },
    })
  })

  // Test Case 9: Update Task With Event ID as String
  it('Update Task With Event ID as String', async () => {
    const taskId = 109
    const originalTask: Task = {
      id: taskId,
      title: 'Task 109',
      description: null,
      status: 'To Do',
      event_id: 201,
      created_at: '',
      updated_at: '',
    }

    mock.onPut(`/api/tasks/${taskId}`).reply(400, { error: 'event_id must be an integer' })
    mock.onGet(`/api/tasks/${taskId}`).reply(200, originalTask)

    await expect(updateTask(taskId, { event_id: '202' as any })).rejects.toMatchObject({
      response: { status: 400, data: { error: 'event_id must be an integer' } },
    })

    const task = await getTask(taskId)
    expect(task.event_id).toBe(201)
  })

  // Test Case 10: Update Task With Boundary Event ID
  it('Update Task With Boundary Event ID', async () => {
    const taskId = 110
    const boundaryEventId = 1
    const updatedTask: Task = {
      id: taskId,
      title: 'Task 110',
      description: null,
      status: 'To Do',
      event_id: boundaryEventId,
      created_at: '',
      updated_at: '',
    }

    mock.onPut(`/api/tasks/${taskId}`).reply(200, updatedTask)
    mock.onGet(`/api/tasks/${taskId}`).reply(200, updatedTask)

    const response = await updateTask(taskId, { event_id: boundaryEventId })
    expect(response.event_id).toBe(boundaryEventId)

    const task = await getTask(taskId)
    expect(task.event_id).toBe(boundaryEventId)
  })

  // Test Case 11: Update Task With Large Event ID
  it('Update Task With Large Event ID', async () => {
    const taskId = 111
    const largeEventId = 2147483647
    const updatedTask: Task = {
      id: taskId,
      title: 'Task 111',
      description: null,
      status: 'To Do',
      event_id: largeEventId,
      created_at: '',
      updated_at: '',
    }

    mock.onPut(`/api/tasks/${taskId}`).reply(200, updatedTask)
    mock.onGet(`/api/tasks/${taskId}`).reply(200, updatedTask)

    const response = await updateTask(taskId, { event_id: largeEventId })
    expect(response.event_id).toBe(largeEventId)

    const task = await getTask(taskId)
    expect(task.event_id).toBe(largeEventId)
  })

  // Test Case 12: Partial Update of Other Fields
  it('Partial Update of Other Fields', async () => {
    const taskId = 112
    const eventId = 201
    const updatedTask: Task = {
      id: taskId,
      title: 'Task 112',
      description: 'New Description',
      status: 'To Do',
      event_id: eventId,
      created_at: '',
      updated_at: '',
    }

    mock.onPut(`/api/tasks/${taskId}`).reply(200, updatedTask)
    mock.onGet(`/api/tasks/${taskId}`).reply(200, updatedTask)

    const response = await updateTask(taskId, { description: 'New Description' })
    expect(response.description).toBe('New Description')
    expect(response.event_id).toBe(eventId)

    const task = await getTask(taskId)
    expect(task.description).toBe('New Description')
    expect(task.event_id).toBe(eventId)
  })

  // Test Case 13: Assign Task to Event ID Zero Fails
  it('Assign Task to Event ID Zero Fails', async () => {
    const taskId = 113
    const originalTask: Task = {
      id: taskId,
      title: 'Task 113',
      description: null,
      status: 'To Do',
      event_id: 201,
      created_at: '',
      updated_at: '',
    }

    mock.onPut(`/api/tasks/${taskId}`).reply(400, { error: 'Invalid event' })
    mock.onGet(`/api/tasks/${taskId}`).reply(200, originalTask)

    await expect(updateTask(taskId, { event_id: 0 })).rejects.toMatchObject({
      response: { status: 400, data: { error: 'Invalid event' } },
    })

    const task = await getTask(taskId)
    expect(task.event_id).toBe(201)
  })

  // Test Case 14: Assign Task to Negative Event ID Fails
  it('Assign Task to Negative Event ID Fails', async () => {
    const taskId = 114
    const originalTask: Task = {
      id: taskId,
      title: 'Task 114',
      description: null,
      status: 'To Do',
      event_id: 201,
      created_at: '',
      updated_at: '',
    }

    mock.onPut(`/api/tasks/${taskId}`).reply(400, { error: 'Invalid event_id' })
    mock.onGet(`/api/tasks/${taskId}`).reply(200, originalTask)

    await expect(updateTask(taskId, { event_id: -1 })).rejects.toMatchObject({
      response: { status: 400, data: { error: 'Invalid event_id' } },
    })

    const task = await getTask(taskId)
    expect(task.event_id).toBe(201)
  })
})
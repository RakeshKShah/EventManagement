import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import {
  createTask,
  getTask,
  getTasks,
  createEvent,
  updateTask,
  deleteEvent,
} from '../../../frontend/src/services/api'
import { TaskCreate, TaskUpdate, EventCreate, Task } from '../../../frontend/src/types'

const mock = new MockAdapter(axios)
const API_BASE = '/api'

describe('frontend_service_createTask', () => {
  beforeEach(() => {
    mock.reset()
  })

  // Helper to create an event
  async function setupEvent(event_id: number, overrides: Partial<EventCreate> = {}) {
    const event: EventCreate = {
      name: `Event ${event_id}`,
      description: `Desc ${event_id}`,
      start_date: '2026-01-01',
      end_date: '2026-01-02',
      ...overrides,
    }
    mock.onPost(`${API_BASE}/events`).reply(201, { id: event_id, ...event })
    const created = await createEvent(event)
    return created
  }

  // Helper to create a task
  async function setupTask(task_id: number, event_id: number, overrides: Partial<TaskCreate> = {}) {
    const task: TaskCreate = {
      title: `Task ${task_id}`,
      description: `Desc ${task_id}`,
      event_id,
      ...overrides,
    }
    mock.onPost(`${API_BASE}/tasks`).reply(201, { id: task_id, ...task, status: 'To Do', created_at: '', updated_at: '' })
    const created = await createTask(task)
    return created
  }

  // Test Case 1: Create Task with Valid Event
  it('Create Task with Valid Event', async () => {
    await setupEvent(1)
    const taskData: TaskCreate = { title: 'Test Task', description: 'My task', event_id: 1 }
    mock.onPost(`${API_BASE}/tasks`).reply(201, { id: 101, ...taskData, status: 'To Do', created_at: '', updated_at: '' })
    mock.onGet(`${API_BASE}/tasks`, { params: { event_id: 1 } }).reply(200, [
      { id: 101, ...taskData, status: 'To Do', created_at: '', updated_at: '' },
    ])
    const created = await createTask(taskData)
    expect(created.event_id).toBe(1)
    expect(created.title).toBe('Test Task')
    expect(created.id).toBe(101)
    const tasks = await getTasks(1)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].event_id).toBe(1)
  })

  // Test Case 2: Create Task with Non-existent Event
  it('Create Task with Non-existent Event', async () => {
    const taskData: TaskCreate = { title: 'Orphan Task', event_id: 9999 }
    mock.onPost(`${API_BASE}/tasks`).reply(400, { error: 'Event does not exist' })
    await expect(createTask(taskData)).rejects.toMatchObject({
      response: { status: 400, data: { error: 'Event does not exist' } },
    })
  })

  // Test Case 3: Create Task Without Event ID
  it('Create Task Without Event ID', async () => {
    // @ts-expect-error event_id missing
    const taskData = { title: 'No Event', description: 'Missing event_id' }
    mock.onPost(`${API_BASE}/tasks`).reply(400, { error: 'event_id is required' })
    await expect(createTask(taskData)).rejects.toMatchObject({
      response: { status: 400, data: { error: 'event_id is required' } },
    })
  })

  // Test Case 4: Create Task with Null Event ID
  it('Create Task with Null Event ID', async () => {
    // @ts-expect-error event_id null
    const taskData = { title: 'Null Event', event_id: null }
    mock.onPost(`${API_BASE}/tasks`).reply(400, { error: 'event_id must be a valid event' })
    await expect(createTask(taskData)).rejects.toMatchObject({
      response: { status: 400, data: { error: 'event_id must be a valid event' } },
    })
  })

  // Test Case 5: Create Task with Invalid Event ID Type
  it('Create Task with Invalid Event ID Type', async () => {
    // @ts-expect-error event_id string
    const taskData = { title: 'Invalid Event', event_id: 'abc' }
    mock.onPost(`${API_BASE}/tasks`).reply(400, { error: 'event_id must be an integer' })
    await expect(createTask(taskData)).rejects.toMatchObject({
      response: { status: 400, data: { error: 'event_id must be an integer' } },
    })
  })

  // Test Case 6: Create Multiple Tasks for Same Event
  it('Create Multiple Tasks for Same Event', async () => {
    await setupEvent(2)
    const taskA: TaskCreate = { title: 'Task A', event_id: 2 }
    const taskB: TaskCreate = { title: 'Task B', event_id: 2 }
    mock.onPost(`${API_BASE}/tasks`).replyOnce(201, { id: 201, ...taskA, status: 'To Do', created_at: '', updated_at: '' })
    mock.onPost(`${API_BASE}/tasks`).replyOnce(201, { id: 202, ...taskB, status: 'To Do', created_at: '', updated_at: '' })
    mock.onGet(`${API_BASE}/tasks`, { params: { event_id: 2 } }).reply(200, [
      { id: 201, ...taskA, status: 'To Do', created_at: '', updated_at: '' },
      { id: 202, ...taskB, status: 'To Do', created_at: '', updated_at: '' },
    ])
    const createdA = await createTask(taskA)
    const createdB = await createTask(taskB)
    expect(createdA.event_id).toBe(2)
    expect(createdB.event_id).toBe(2)
    const tasks = await getTasks(2)
    expect(tasks).toHaveLength(2)
    expect(tasks.map(t => t.title)).toEqual(['Task A', 'Task B'])
  })

  // Test Case 7: Create Task with Empty Title
  it('Create Task with Empty Title', async () => {
    await setupEvent(3)
    const taskData: TaskCreate = { title: '', event_id: 3 }
    // Simulate API constraint: title required
    mock.onPost(`${API_BASE}/tasks`).reply(400, { error: 'title is required' })
    await expect(createTask(taskData)).rejects.toMatchObject({
      response: { status: 400, data: { error: 'title is required' } },
    })
  })

  // Test Case 8: Create Task with Maximum Title Length
  it('Create Task with Maximum Title Length', async () => {
    await setupEvent(4)
    const maxTitle = 'T'.repeat(255)
    const taskData: TaskCreate = { title: maxTitle, event_id: 4 }
    // Simulate API allows 255 chars
    mock.onPost(`${API_BASE}/tasks`).reply(201, { id: 301, ...taskData, status: 'To Do', created_at: '', updated_at: '' })
    const created = await createTask(taskData)
    expect(created.title).toHaveLength(255)
    expect(created.event_id).toBe(4)
  })

  // Test Case 9: Reassign Task to Another Event
  it('Reassign Task to Another Event', async () => {
    await setupEvent(5)
    await setupEvent(6)
    // Create task with event_id 5
    mock.onPost(`${API_BASE}/tasks`).reply(201, { id: 10, title: 'Reassignable', event_id: 5, status: 'To Do', created_at: '', updated_at: '' })
    const created = await createTask({ title: 'Reassignable', event_id: 5 })
    // Update task to event_id 6
    const updateData: TaskUpdate = { event_id: 6 }
    mock.onPut(`${API_BASE}/tasks/10`).reply(200, { ...created, event_id: 6 })
    const updated = await updateTask(10, updateData)
    expect(updated.event_id).toBe(6)
    expect(updated.id).toBe(10)
  })

  // Test Case 10: Reassign Task to Non-existent Event
  it('Reassign Task to Non-existent Event', async () => {
    await setupEvent(7)
    mock.onPost(`${API_BASE}/tasks`).reply(201, { id: 11, title: 'ReassignFail', event_id: 7, status: 'To Do', created_at: '', updated_at: '' })
    const created = await createTask({ title: 'ReassignFail', event_id: 7 })
    const updateData: TaskUpdate = { event_id: 9999 }
    mock.onPut(`${API_BASE}/tasks/11`).reply(400, { error: 'Event does not exist' })
    await expect(updateTask(11, updateData)).rejects.toMatchObject({
      response: { status: 400, data: { error: 'Event does not exist' } },
    })
  })

  // Test Case 11: Remove Task from Event Without Reassignment
  it('Remove Task from Event Without Reassignment', async () => {
    await setupEvent(8)
    mock.onPost(`${API_BASE}/tasks`).reply(201, { id: 12, title: 'RemoveEvent', event_id: 8, status: 'To Do', created_at: '', updated_at: '' })
    const created = await createTask({ title: 'RemoveEvent', event_id: 8 })
    const updateData: TaskUpdate = { event_id: null as any }
    mock.onPut(`${API_BASE}/tasks/12`).reply(400, { error: 'Task must be associated with an event' })
    await expect(updateTask(12, updateData)).rejects.toMatchObject({
      response: { status: 400, data: { error: 'Task must be associated with an event' } },
    })
  })

  // Test Case 12: Delete Event Deletes Associated Tasks
  it('Delete Event Deletes Associated Tasks', async () => {
    await setupEvent(9)
    mock.onPost(`${API_BASE}/tasks`).reply(201, { id: 13, title: 'DeleteCascade', event_id: 9, status: 'To Do', created_at: '', updated_at: '' })
    await createTask({ title: 'DeleteCascade', event_id: 9 })
    mock.onDelete(`${API_BASE}/events/9`).reply(200)
    await deleteEvent(9)
    mock.onGet(`${API_BASE}/tasks`, { params: { event_id: 9 } }).reply(200, [])
    const tasks = await getTasks(9)
    expect(tasks).toHaveLength(0)
  })

  // Test Case 13: Create Tasks with Duplicate Titles for Same Event
  it('Create Tasks with Duplicate Titles for Same Event', async () => {
    await setupEvent(10)
    const taskData: TaskCreate = { title: 'Duplicate Title', event_id: 10 }
    // Simulate API allows duplicates
    mock.onPost(`${API_BASE}/tasks`).replyOnce(201, { id: 401, ...taskData, status: 'To Do', created_at: '', updated_at: '' })
    mock.onPost(`${API_BASE}/tasks`).replyOnce(201, { id: 402, ...taskData, status: 'To Do', created_at: '', updated_at: '' })
    const created1 = await createTask(taskData)
    const created2 = await createTask(taskData)
    expect(created1.title).toBe('Duplicate Title')
    expect(created2.title).toBe('Duplicate Title')
    expect(created1.id).not.toBe(created2.id)
  })

  // Test Case 14: Send Non-JSON Request Body
  it('Send Non-JSON Request Body', async () => {
    // Simulate axios error for invalid JSON
    mock.onPost(`${API_BASE}/tasks`).reply(400, { error: 'Invalid JSON body' })
    // @ts-expect-error not a JSON
    const taskData = 'Not a JSON'
    await expect(createTask(taskData)).rejects.toMatchObject({
      response: { status: 400, data: { error: 'Invalid JSON body' } },
    })
  })

  // Test Case 15: Create Task with Extra Fields
  it('Create Task with Extra Fields', async () => {
    await setupEvent(11)
    // Extra field 'foo' should be ignored
    const taskData: any = { title: 'Extra Field', event_id: 11, foo: 'bar' }
    mock.onPost(`${API_BASE}/tasks`).reply(201, { id: 501, title: 'Extra Field', event_id: 11, status: 'To Do', created_at: '', updated_at: '' })
    const created = await createTask(taskData)
    expect(created.title).toBe('Extra Field')
    expect(created.event_id).toBe(11)
    expect(created.foo).toBeUndefined()
  })
})
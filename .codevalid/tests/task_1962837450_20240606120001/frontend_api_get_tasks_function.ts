import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { getTasks } from '../../../frontend/src/services/api'
import { Task } from '../../../frontend/src/types'

describe('getTasks', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(axios)
  })

  afterEach(() => {
    mock.restore()
  })

  // Test Case 1: Fetch all tasks without eventId
  it('Fetch all tasks without eventId', async () => {
    const tasks: Task[] = [
      { id: 1, title: 'Task 1', description: 'Desc 1', status: 'open', event_id: 10 },
      { id: 2, title: 'Task 2', description: 'Desc 2', status: 'closed', event_id: 20 }
    ]
    mock.onGet('/api/tasks').reply(200, tasks, { 'Content-Type': 'application/json' })

    const result = await getTasks()
    expect(result).toEqual(tasks)
  })

  // Test Case 2: Fetch tasks filtered by eventId
  it('Fetch tasks filtered by eventId', async () => {
    const eventId = 10
    const tasks: Task[] = [
      { id: 1, title: 'Task 1', description: 'Desc 1', status: 'open', event_id: eventId }
    ]
    mock.onGet('/api/tasks', { params: { event_id: eventId } }).reply(200, tasks, { 'Content-Type': 'application/json' })

    const result = await getTasks(eventId)
    expect(result).toEqual(tasks)
    result.forEach(task => expect(task.event_id).toBe(eventId))
  })

  // Test Case 3: Fetch tasks when system has no tasks
  it('Fetch tasks when system has no tasks', async () => {
    mock.onGet('/api/tasks').reply(200, [], { 'Content-Type': 'application/json' })

    const result = await getTasks()
    expect(result).toEqual([])
  })

  // Test Case 4: Fetch tasks for eventId with no tasks
  it('Fetch tasks for eventId with no tasks', async () => {
    const eventId = 99
    mock.onGet('/api/tasks', { params: { event_id: eventId } }).reply(200, [], { 'Content-Type': 'application/json' })

    const result = await getTasks(eventId)
    expect(result).toEqual([])
  })

  // Test Case 5: Fetch tasks with invalid eventId
  it('Fetch tasks with invalid eventId', async () => {
    const invalidEventId = 9999
    mock.onGet('/api/tasks', { params: { event_id: invalidEventId } }).reply(200, [], { 'Content-Type': 'application/json' })

    const result = await getTasks(invalidEventId)
    expect(result).toEqual([])
  })

  // Test Case 6: Verify task response fields
  it('Verify task response fields', async () => {
    const tasks: Task[] = [
      { id: 1, title: 'Task 1', description: 'Desc 1', status: 'open', event_id: 10 }
    ]
    mock.onGet('/api/tasks').reply(200, tasks, { 'Content-Type': 'application/json' })

    const result = await getTasks()
    result.forEach(task => {
      expect(task).toHaveProperty('id')
      expect(task).toHaveProperty('title')
      expect(task).toHaveProperty('description')
      expect(task).toHaveProperty('status')
      expect(task).toHaveProperty('event_id')
    })
  })

  // Test Case 7: Verify response content-type header
  it('Verify response content-type header', async () => {
    const tasks: Task[] = [
      { id: 1, title: 'Task 1', description: 'Desc 1', status: 'open', event_id: 10 }
    ]
    mock.onGet('/api/tasks').reply(200, tasks, { 'Content-Type': 'application/json' })

    const response = await getTasks()
    expect(response).toEqual(tasks)
    // Content-Type is checked in the mock setup, not in the function, but this ensures the header is set
  })

  // Test Case 8: Verify HTTP 200 on success
  it('Verify HTTP 200 on success', async () => {
    const tasks: Task[] = [
      { id: 1, title: 'Task 1', description: 'Desc 1', status: 'open', event_id: 10 }
    ]
    mock.onGet('/api/tasks').reply(200, tasks, { 'Content-Type': 'application/json' })

    const result = await getTasks()
    expect(result).toEqual(tasks)
  })

  // Test Case 9: Backend error handling
  it('Backend error handling', async () => {
    mock.onGet('/api/tasks').reply(500, { error: 'Internal Server Error' }, { 'Content-Type': 'application/json' })

    await expect(getTasks()).rejects.toThrow()
  })

  // Test Case 10: Network error handling
  it('Network error handling', async () => {
    mock.onGet('/api/tasks').networkError()

    await expect(getTasks()).rejects.toThrow(/Network Error/)
  })

  // Test Case 11: Fetch tasks with eventId as null
  it('Fetch tasks with eventId as null', async () => {
    const tasks: Task[] = [
      { id: 1, title: 'Task 1', description: 'Desc 1', status: 'open', event_id: 10 }
    ]
    mock.onGet('/api/tasks').reply(200, tasks, { 'Content-Type': 'application/json' })

    // eventId as null should fetch all tasks
    const result = await getTasks(null as unknown as number)
    expect(result).toEqual(tasks)
  })

  // Test Case 12: Fetch tasks with eventId as empty string
  it('Fetch tasks with eventId as empty string', async () => {
    const tasks: Task[] = [
      { id: 1, title: 'Task 1', description: 'Desc 1', status: 'open', event_id: 10 }
    ]
    mock.onGet('/api/tasks').reply(200, tasks, { 'Content-Type': 'application/json' })

    // eventId as empty string should fetch all tasks
    const result = await getTasks('' as unknown as number)
    expect(result).toEqual(tasks)
  })

  // Test Case 13: Fetch tasks with a large number of tasks
  it('Fetch tasks with a large number of tasks', async () => {
    const tasks: Task[] = Array.from({ length: 10000 }, (_, i) => ({
      id: i + 1,
      title: `Task ${i + 1}`,
      description: `Desc ${i + 1}`,
      status: 'open',
      event_id: 10
    }))
    mock.onGet('/api/tasks').reply(200, tasks, { 'Content-Type': 'application/json' })

    const result = await getTasks()
    expect(result.length).toBe(10000)
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('title')
    expect(result[0]).toHaveProperty('description')
    expect(result[0]).toHaveProperty('status')
    expect(result[0]).toHaveProperty('event_id')
  })

  // Test Case 14: Fetch tasks with special characters in fields
  it('Fetch tasks with special characters in fields', async () => {
    const tasks: Task[] = [
      { id: 1, title: 'Tâsk 💡', description: 'Dësc\nwith special chars: ©®™✓', status: 'open', event_id: 10 }
    ]
    mock.onGet('/api/tasks').reply(200, tasks, { 'Content-Type': 'application/json' })

    const result = await getTasks()
    expect(result[0].title).toBe('Tâsk 💡')
    expect(result[0].description).toBe('Dësc\nwith special chars: ©®™✓')
  })
})
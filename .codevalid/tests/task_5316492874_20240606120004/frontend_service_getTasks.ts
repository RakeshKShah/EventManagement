import { getTasks } from '../../../frontend/src/services/api'
import { Task } from '../../../frontend/src/types'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('getTasks', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  // Test Case 1: Get all tasks with no event_id filter
  it('Get all tasks with no event_id filter', async () => {
    const tasks: Task[] = [
      { id: 1, name: 'Task 1', event_id: 1 },
      { id: 2, name: 'Task 2', event_id: 2 }
    ]
    mockedAxios.get.mockResolvedValueOnce({ data: tasks })
    const result = await getTasks()
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: {} })
    expect(result).toEqual(tasks)
    expect(result.every(task => typeof task.event_id === 'number')).toBe(true)
  })

  // Test Case 2: Get tasks filtered by valid event_id
  it('Get tasks filtered by valid event_id', async () => {
    const tasks: Task[] = [
      { id: 3, name: 'Task 3', event_id: 1 }
    ]
    mockedAxios.get.mockResolvedValueOnce({ data: tasks })
    const result = await getTasks(1)
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: { event_id: 1 } })
    expect(result).toEqual(tasks)
    expect(result.every(task => task.event_id === 1)).toBe(true)
  })

  // Test Case 3: Get tasks for event with no assigned tasks
  it('Get tasks for event with no assigned tasks', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] })
    const result = await getTasks(3)
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: { event_id: 3 } })
    expect(result).toEqual([])
  })

  // Test Case 4: Get tasks filtered by non-existent event_id
  it('Get tasks filtered by non-existent event_id', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] })
    const result = await getTasks(9999)
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: { event_id: 9999 } })
    expect(result).toEqual([])
  })

  // Test Case 5: Get tasks after associated event is deleted
  it('Get tasks after associated event is deleted', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] })
    const result = await getTasks(4)
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: { event_id: 4 } })
    expect(result).toEqual([])
  })

  // Test Case 6: Get tasks after task reassignment to another event
  it('Get tasks after task reassignment to another event', async () => {
    const taskA = { id: 10, name: 'Task A', event_id: 2 }
    mockedAxios.get.mockResolvedValueOnce({ data: [taskA] })
    const result2 = await getTasks(2)
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: { event_id: 2 } })
    expect(result2).toEqual([taskA])
    mockedAxios.get.mockResolvedValueOnce({ data: [] })
    const result1 = await getTasks(1)
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: { event_id: 1 } })
    expect(result1).toEqual([])
  })

  // Test Case 7: Get tasks for deleted event
  it('Get tasks for deleted event', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] })
    const result = await getTasks(5)
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: { event_id: 5 } })
    expect(result).toEqual([])
  })

  // Test Case 8: Get tasks when no tasks exist in system
  it('Get tasks when no tasks exist in system', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] })
    const result = await getTasks()
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: {} })
    expect(result).toEqual([])
  })

  // Test Case 9: Get tasks with invalid event_id type
  it('Get tasks with invalid event_id type', async () => {
    mockedAxios.get.mockRejectedValueOnce({ response: { status: 400, data: { error: 'Invalid event_id parameter' } } })
    await expect(getTasks('abc' as unknown as number)).rejects.toMatchObject({
      response: { status: 400, data: { error: 'Invalid event_id parameter' } }
    })
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: { event_id: 'abc' } })
  })

  // Test Case 10: Get tasks after removing from one event and reassigning to another
  it('Get tasks after removing from one event and reassigning to another', async () => {
    const taskB = { id: 20, name: 'Task B', event_id: 3 }
    mockedAxios.get.mockResolvedValueOnce({ data: [taskB] })
    const result = await getTasks(3)
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: { event_id: 3 } })
    expect(result).toEqual([taskB])
  })

  // Test Case 11: Get tasks after removing from event without reassignment
  it('Get tasks after removing from event without reassignment', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [] })
    const result4 = await getTasks(4)
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: { event_id: 4 } })
    expect(result4).toEqual([])
    mockedAxios.get.mockResolvedValueOnce({ data: [] })
    const resultAll = await getTasks()
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: {} })
    expect(resultAll).toEqual([])
  })

  // Test Case 12: Get multiple tasks assigned to the same event
  it('Get multiple tasks assigned to the same event', async () => {
    const tasks = [
      { id: 30, name: 'Task X', event_id: 6 },
      { id: 31, name: 'Task Y', event_id: 6 },
      { id: 32, name: 'Task Z', event_id: 6 }
    ]
    mockedAxios.get.mockResolvedValueOnce({ data: tasks })
    const result = await getTasks(6)
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: { event_id: 6 } })
    expect(result).toEqual(tasks)
    expect(result.length).toBe(3)
    expect(result.every(task => task.event_id === 6)).toBe(true)
  })

  // Test Case 13: Get tasks with null event_id parameter
  it('Get tasks with null event_id parameter', async () => {
    const tasks = [
      { id: 40, name: 'Task Null', event_id: 1 },
      { id: 41, name: 'Task Null2', event_id: 2 }
    ]
    mockedAxios.get.mockResolvedValueOnce({ data: tasks })
    const result = await getTasks(null as unknown as number)
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: { event_id: null } })
    expect(result).toEqual(tasks)
  })

  // Test Case 14: Get tasks for event with large number of tasks
  it('Get tasks for event with large number of tasks', async () => {
    const tasks = Array.from({ length: 1000 }, (_, i) => ({
      id: 1000 + i,
      name: `Task ${i + 1}`,
      event_id: 7
    }))
    mockedAxios.get.mockResolvedValueOnce({ data: tasks })
    const result = await getTasks(7)
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: { event_id: 7 } })
    expect(result).toEqual(tasks)
    expect(result.length).toBe(1000)
    expect(result.every(task => task.event_id === 7)).toBe(true)
  })

  // Test Case 15: Get tasks with special characters in event_id parameter
  it('Get tasks with special characters in event_id parameter', async () => {
    mockedAxios.get.mockRejectedValueOnce({ response: { status: 400, data: { error: 'Invalid event_id parameter' } } })
    await expect(getTasks('!@#' as unknown as number)).rejects.toMatchObject({
      response: { status: 400, data: { error: 'Invalid event_id parameter' } }
    })
    expect(mockedAxios.get).toHaveBeenCalledWith('/tasks', { params: { event_id: '!@#' } })
  })
})
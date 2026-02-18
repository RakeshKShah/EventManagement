import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { createTask, getTasks } from '../../frontend/src/services/api'
import { TaskCreate } from '../../frontend/src/types'

describe('frontend_create_task_api_function - createTask', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(axios)
  })

  afterEach(() => {
    mock.restore()
  })

  // Test Case 1: Create task with valid data and status 'To Do'
  it('Create task with valid data and status \'To Do\'', async () => {
    const taskData: TaskCreate = {
      title: 'Buy groceries',
      description: 'Milk, Eggs, Bread',
      status: 'To Do',
      event_id: 1
    }
    const responseTask = {
      ...taskData,
      id: 123,
      created_at: '2024-06-06T12:00:00Z',
      updated_at: '2024-06-06T12:00:00Z'
    }
    mock.onPost('/api/tasks', taskData).reply(201, responseTask)
    const result = await createTask(taskData)
    expect(result).toMatchObject({
      title: 'Buy groceries',
      description: 'Milk, Eggs, Bread',
      status: 'To Do',
      id: 123
    })
  })

  // Test Case 2: Create task with valid data and status 'In Progress'
  it('Create task with valid data and status \'In Progress\'', async () => {
    const taskData: TaskCreate = {
      title: 'Write report',
      description: 'Quarterly financials',
      status: 'In Progress',
      event_id: 1
    }
    const responseTask = {
      ...taskData,
      id: 124,
      created_at: '2024-06-06T12:01:00Z',
      updated_at: '2024-06-06T12:01:00Z'
    }
    mock.onPost('/api/tasks', taskData).reply(201, responseTask)
    const result = await createTask(taskData)
    expect(result).toMatchObject({
      title: 'Write report',
      description: 'Quarterly financials',
      status: 'In Progress',
      id: 124
    })
  })

  // Test Case 3: Create task with valid data and status 'Completed'
  it('Create task with valid data and status \'Completed\'', async () => {
    const taskData: TaskCreate = {
      title: 'Submit assignment',
      description: 'Math homework',
      status: 'Completed',
      event_id: 1
    }
    const responseTask = {
      ...taskData,
      id: 125,
      created_at: '2024-06-06T12:02:00Z',
      updated_at: '2024-06-06T12:02:00Z'
    }
    mock.onPost('/api/tasks', taskData).reply(201, responseTask)
    const result = await createTask(taskData)
    expect(result).toMatchObject({
      title: 'Submit assignment',
      description: 'Math homework',
      status: 'Completed',
      id: 125
    })
  })

  // Test Case 4: Attempt to create task with invalid status
  it('Attempt to create task with invalid status', async () => {
    const taskData: any = {
      title: 'Plan trip',
      description: 'Book flights',
      status: 'Pending',
      event_id: 1
    }
    mock.onPost('/api/tasks', taskData).reply(400, { message: 'Invalid status value.' })
    await expect(createTask(taskData)).rejects.toMatchObject({
      response: { data: { message: 'Invalid status value.' }, status: 400 }
    })
  })

  // Test Case 5: Attempt to create task without title
  it('Attempt to create task without title', async () => {
    const taskData: any = {
      description: 'No title provided',
      status: 'To Do',
      event_id: 1
    }
    mock.onPost('/api/tasks', taskData).reply(400, { message: 'Missing required field(s): title and/or status.' })
    await expect(createTask(taskData)).rejects.toMatchObject({
      response: { data: { message: 'Missing required field(s): title and/or status.' }, status: 400 }
    })
  })

  // Test Case 6: Attempt to create task without status
  it('Attempt to create task without status', async () => {
    const taskData: any = {
      title: 'Read book',
      description: 'The Great Gatsby',
      event_id: 1
    }
    mock.onPost('/api/tasks', taskData).reply(400, { message: 'Missing required field(s): title and/or status.' })
    await expect(createTask(taskData)).rejects.toMatchObject({
      response: { data: { message: 'Missing required field(s): title and/or status.' }, status: 400 }
    })
  })

  // Test Case 7: Attempt to create task without title and status
  it('Attempt to create task without title and status', async () => {
    const taskData: any = {
      description: 'No title or status provided',
      event_id: 1
    }
    mock.onPost('/api/tasks', taskData).reply(400, { message: 'Missing required field(s): title and/or status.' })
    await expect(createTask(taskData)).rejects.toMatchObject({
      response: { data: { message: 'Missing required field(s): title and/or status.' }, status: 400 }
    })
  })

  // Test Case 8: Attempt to create duplicate task
  it('Attempt to create duplicate task', async () => {
    const taskData: TaskCreate = {
      title: 'Walk the dog',
      description: 'Evening walk in the park',
      status: 'To Do',
      event_id: 1
    }
    const responseTask = {
      ...taskData,
      id: 126,
      created_at: '2024-06-06T12:03:00Z',
      updated_at: '2024-06-06T12:03:00Z'
    }
    mock.onPost('/api/tasks', taskData).replyOnce(201, responseTask)
    mock.onPost('/api/tasks', taskData).replyOnce(409, { message: 'Duplicate task not allowed.' })

    // First call succeeds
    const result1 = await createTask(taskData)
    expect(result1).toMatchObject({
      title: 'Walk the dog',
      description: 'Evening walk in the park',
      status: 'To Do',
      id: 126
    })

    // Second call fails
    await expect(createTask(taskData)).rejects.toMatchObject({
      response: { data: { message: 'Duplicate task not allowed.' }, status: 409 }
    })
  })

  // Test Case 9: Create task with minimal title length
  it('Create task with minimal title length', async () => {
    const taskData: TaskCreate = {
      title: 'A',
      description: 'Minimal title',
      status: 'To Do',
      event_id: 1
    }
    const responseTask = {
      ...taskData,
      id: 127,
      created_at: '2024-06-06T12:04:00Z',
      updated_at: '2024-06-06T12:04:00Z'
    }
    mock.onPost('/api/tasks', taskData).reply(201, responseTask)
    const result = await createTask(taskData)
    expect(result).toMatchObject({
      title: 'A',
      description: 'Minimal title',
      status: 'To Do',
      id: 127
    })
  })

  // Test Case 10: Create task with maximum allowed title length
  it('Create task with maximum allowed title length', async () => {
    const maxTitle = 'T'.repeat(255)
    const taskData: TaskCreate = {
      title: maxTitle,
      description: 'Max length title test',
      status: 'To Do',
      event_id: 1
    }
    const responseTask = {
      ...taskData,
      id: 128,
      created_at: '2024-06-06T12:05:00Z',
      updated_at: '2024-06-06T12:05:00Z'
    }
    mock.onPost('/api/tasks', taskData).reply(201, responseTask)
    const result = await createTask(taskData)
    expect(result).toMatchObject({
      title: maxTitle,
      description: 'Max length title test',
      status: 'To Do',
      id: 128
    })
  })

  // Test Case 11: Create task with empty description
  it('Create task with empty description', async () => {
    const taskData: TaskCreate = {
      title: 'Laundry',
      description: '',
      status: 'To Do',
      event_id: 1
    }
    const responseTask = {
      ...taskData,
      id: 129,
      created_at: '2024-06-06T12:06:00Z',
      updated_at: '2024-06-06T12:06:00Z'
    }
    mock.onPost('/api/tasks', taskData).reply(201, responseTask)
    const result = await createTask(taskData)
    expect(result).toMatchObject({
      title: 'Laundry',
      description: '',
      status: 'To Do',
      id: 129
    })
  })

  // Test Case 12: Verify task persistence after creation
  it('Verify task persistence after creation', async () => {
    const taskData: TaskCreate = {
      title: 'Call mom',
      description: 'Sunday evening',
      status: 'To Do',
      event_id: 1
    }
    const responseTask = {
      ...taskData,
      id: 130,
      created_at: '2024-06-06T12:07:00Z',
      updated_at: '2024-06-06T12:07:00Z'
    }
    mock.onPost('/api/tasks', taskData).reply(201, responseTask)
    mock.onGet('/api/tasks').reply(200, [responseTask])

    const created = await createTask(taskData)
    expect(created).toMatchObject({
      title: 'Call mom',
      description: 'Sunday evening',
      status: 'To Do',
      id: 130
    })

    const tasks = await getTasks()
    expect(tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Call mom',
          description: 'Sunday evening',
          status: 'To Do',
          id: 130
        })
      ])
    )
  })
})
import { updateTask } from '../../frontend/src/services/api'
import axios from 'axios'
import { TaskUpdate, Task } from '../../frontend/src/types'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('frontend_api_update_task', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test('Successful task update with valid fields', async () => {
    const taskId = 123
    const requestBody: TaskUpdate = {
      description: 'Updated description of task.',
      event_id: 456,
      status: 'Completed',
      title: 'Updated Task Title'
    }
    const responseData: Task = {
      id: 123,
      description: 'Updated description of task.',
      event_id: 456,
      status: 'Completed',
      title: 'Updated Task Title',
      created_at: '',
      updated_at: ''
    }
    mockedAxios.put.mockResolvedValueOnce({ data: responseData, status: 200 })
    const result = await updateTask(taskId, requestBody)
    expect(result).toEqual(responseData)
    expect(mockedAxios.put).toHaveBeenCalledWith(`/tasks/${taskId}`, requestBody)
  })

  test("Update task status to 'To Do'", async () => {
    const taskId = 124
    const requestBody: TaskUpdate = {
      description: 'Some description.',
      event_id: 457,
      status: 'To Do',
      title: 'Task Title'
    }
    const responseData: Task = {
      id: 124,
      description: 'Some description.',
      event_id: 457,
      status: 'To Do',
      title: 'Task Title',
      created_at: '',
      updated_at: ''
    }
    mockedAxios.put.mockResolvedValueOnce({ data: responseData, status: 200 })
    const result = await updateTask(taskId, requestBody)
    expect(result).toEqual(responseData)
    expect(mockedAxios.put).toHaveBeenCalledWith(`/tasks/${taskId}`, requestBody)
  })

  test("Update task status to 'In Progress'", async () => {
    const taskId = 125
    const requestBody: TaskUpdate = {
      description: 'Working on it.',
      event_id: 458,
      status: 'In Progress',
      title: 'Progress Task'
    }
    const responseData: Task = {
      id: 125,
      description: 'Working on it.',
      event_id: 458,
      status: 'In Progress',
      title: 'Progress Task',
      created_at: '',
      updated_at: ''
    }
    mockedAxios.put.mockResolvedValueOnce({ data: responseData, status: 200 })
    const result = await updateTask(taskId, requestBody)
    expect(result).toEqual(responseData)
    expect(mockedAxios.put).toHaveBeenCalledWith(`/tasks/${taskId}`, requestBody)
  })

  test('Reject update if event_id is omitted', async () => {
    const taskId = 126
    const requestBody: TaskUpdate = {
      description: 'No event.',
      status: 'Completed',
      title: 'Missing Event'
    }
    const errorResponse = {
      response: {
        data: {
          details: { event_id: 'Event ID is required' },
          error: 'Validation error'
        },
        status: 400
      }
    }
    mockedAxios.put.mockRejectedValueOnce(errorResponse)
    await expect(updateTask(taskId, requestBody)).rejects.toMatchObject(errorResponse.response.data)
    expect(mockedAxios.put).toHaveBeenCalledWith(`/tasks/${taskId}`, requestBody)
  })

  test('Reject update if event_id is invalid', async () => {
    const taskId = 127
    const requestBody: TaskUpdate = {
      description: 'Event does not exist.',
      event_id: 99999,
      status: 'Completed',
      title: 'Invalid Event'
    }
    const errorResponse = {
      response: {
        data: {
          details: { event_id: 'Event ID is invalid' },
          error: 'Validation error'
        },
        status: 400
      }
    }
    mockedAxios.put.mockRejectedValueOnce(errorResponse)
    await expect(updateTask(taskId, requestBody)).rejects.toMatchObject(errorResponse.response.data)
    expect(mockedAxios.put).toHaveBeenCalledWith(`/tasks/${taskId}`, requestBody)
  })

  test('Reject update if status is invalid', async () => {
    const taskId = 128
    const requestBody: TaskUpdate = {
      description: 'Status is not allowed.',
      event_id: 460,
      status: 'Archived' as any,
      title: 'Invalid Status'
    }
    const errorResponse = {
      response: {
        data: {
          details: { status: "Status value must be one of: 'To Do', 'In Progress', 'Completed'" },
          error: 'Validation error'
        },
        status: 400
      }
    }
    mockedAxios.put.mockRejectedValueOnce(errorResponse)
    await expect(updateTask(taskId, requestBody)).rejects.toMatchObject(errorResponse.response.data)
    expect(mockedAxios.put).toHaveBeenCalledWith(`/tasks/${taskId}`, requestBody)
  })

  test('Reject update if task does not exist', async () => {
    const taskId = 99999
    const requestBody: TaskUpdate = {
      description: 'Trying to update a missing task.',
      event_id: 461,
      status: 'To Do',
      title: 'Nonexistent Task'
    }
    const errorResponse = {
      response: {
        data: {
          error: 'Task not found'
        },
        status: 404
      }
    }
    mockedAxios.put.mockRejectedValueOnce(errorResponse)
    await expect(updateTask(taskId, requestBody)).rejects.toMatchObject(errorResponse.response.data)
    expect(mockedAxios.put).toHaveBeenCalledWith(`/tasks/${taskId}`, requestBody)
  })

  test('Update task with only some fields provided', async () => {
    const taskId = 129
    const requestBody: TaskUpdate = {
      event_id: 462,
      status: 'Completed',
      title: 'Partially Updated'
    }
    const responseData: Task = {
      id: 129,
      description: 'Original description',
      event_id: 462,
      status: 'Completed',
      title: 'Partially Updated',
      created_at: '',
      updated_at: ''
    }
    mockedAxios.put.mockResolvedValueOnce({ data: responseData, status: 200 })
    const result = await updateTask(taskId, requestBody)
    expect(result).toEqual(responseData)
    expect(mockedAxios.put).toHaveBeenCalledWith(`/tasks/${taskId}`, requestBody)
  })

  test('Reject update if title is empty', async () => {
    const taskId = 130
    const requestBody: TaskUpdate = {
      description: 'Empty title.',
      event_id: 463,
      status: 'To Do',
      title: ''
    }
    const errorResponse = {
      response: {
        data: {
          details: { title: 'Title cannot be empty' },
          error: 'Validation error'
        },
        status: 400
      }
    }
    mockedAxios.put.mockRejectedValueOnce(errorResponse)
    await expect(updateTask(taskId, requestBody)).rejects.toMatchObject(errorResponse.response.data)
    expect(mockedAxios.put).toHaveBeenCalledWith(`/tasks/${taskId}`, requestBody)
  })

  test('Edge case: update with maximum allowed title length', async () => {
    const taskId = 131
    const maxTitle = 'T'.repeat(255)
    const requestBody: TaskUpdate = {
      description: 'Long title.',
      event_id: 464,
      status: 'To Do',
      title: maxTitle
    }
    const responseData: Task = {
      id: 131,
      description: 'Long title.',
      event_id: 464,
      status: 'To Do',
      title: maxTitle,
      created_at: '',
      updated_at: ''
    }
    mockedAxios.put.mockResolvedValueOnce({ data: responseData, status: 200 })
    const result = await updateTask(taskId, requestBody)
    expect(result).toEqual(responseData)
    expect(mockedAxios.put).toHaveBeenCalledWith(`/tasks/${taskId}`, requestBody)
  })

  test('Reject update if title exceeds maximum allowed length', async () => {
    const taskId = 132
    const tooLongTitle = 'T'.repeat(256)
    const requestBody: TaskUpdate = {
      description: 'Title too long.',
      event_id: 465,
      status: 'Completed',
      title: tooLongTitle
    }
    const errorResponse = {
      response: {
        data: {
          details: { title: 'Title exceeds maximum length of 255 characters' },
          error: 'Validation error'
        },
        status: 400
      }
    }
    mockedAxios.put.mockRejectedValueOnce(errorResponse)
    await expect(updateTask(taskId, requestBody)).rejects.toMatchObject(errorResponse.response.data)
    expect(mockedAxios.put).toHaveBeenCalledWith(`/tasks/${taskId}`, requestBody)
  })

  test('Reject update if multiple invalid fields are provided', async () => {
    const taskId = 133
    const requestBody: TaskUpdate = {
      description: 'Multiple invalid fields.',
      status: 'Archived' as any,
      title: 'Multi-invalid'
    }
    const errorResponse = {
      response: {
        data: {
          details: {
            event_id: 'Event ID is required',
            status: "Status value must be one of: 'To Do', 'In Progress', 'Completed'"
          },
          error: 'Validation error'
        },
        status: 400
      }
    }
    mockedAxios.put.mockRejectedValueOnce(errorResponse)
    await expect(updateTask(taskId, requestBody)).rejects.toMatchObject(errorResponse.response.data)
    expect(mockedAxios.put).toHaveBeenCalledWith(`/tasks/${taskId}`, requestBody)
  })

  test('Reject update if request body is not valid JSON', async () => {
    const taskId = 134
    // Simulate malformed JSON by passing a string instead of object
    const requestBody: any = 'malformed json string'
    const errorResponse = {
      response: {
        data: {
          error: 'Invalid JSON format'
        },
        status: 400
      }
    }
    mockedAxios.put.mockRejectedValueOnce(errorResponse)
    await expect(updateTask(taskId, requestBody)).rejects.toMatchObject(errorResponse.response.data)
    expect(mockedAxios.put).toHaveBeenCalledWith(`/tasks/${taskId}`, requestBody)
  })
})
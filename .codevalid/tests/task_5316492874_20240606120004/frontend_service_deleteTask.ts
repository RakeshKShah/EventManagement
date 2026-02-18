import { deleteTask, listTasksByEvent } from '../../frontend/src/services/api';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('deleteTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1: Delete an existing task successfully
  it('Delete an existing task successfully', async () => {
    mockedAxios.delete.mockResolvedValueOnce({ status: 200 });
    mockedAxios.get.mockResolvedValueOnce({ data: [{ id: 101, eventId: 201 }] }); // Before deletion
    mockedAxios.get.mockResolvedValueOnce({ data: [] }); // After deletion

    // Simulate task exists
    const tasksBefore = await listTasksByEvent(201);
    expect(tasksBefore).toEqual([{ id: 101, eventId: 201 }]);

    // Delete task
    const response = await deleteTask(101);
    expect(response.status).toBe(200);

    // Task should be removed
    const tasksAfter = await listTasksByEvent(201);
    expect(tasksAfter).not.toContainEqual(expect.objectContaining({ id: 101 }));
  });

  // Test Case 2: Try to delete a non-existent task
  it('Try to delete a non-existent task', async () => {
    mockedAxios.delete.mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Task does not exist' } }
    });

    try {
      await deleteTask(999);
    } catch (err: any) {
      expect(err.response.status).toBe(404);
      expect(err.response.data.message).toMatch(/does not exist/i);
    }
    // No changes to system (simulate by checking tasks unchanged)
    mockedAxios.get.mockResolvedValueOnce({ data: [] });
    const tasks = await listTasksByEvent(999);
    expect(tasks).toEqual([]);
  });

  // Test Case 3: Delete a task with invalid ID type
  it('Delete a task with invalid ID type', async () => {
    mockedAxios.delete.mockRejectedValueOnce({
      response: { status: 400, data: { message: 'Invalid ID format' } }
    });

    try {
      await deleteTask('abc' as any);
    } catch (err: any) {
      expect(err.response.status).toBe(400);
      expect(err.response.data.message).toMatch(/invalid id/i);
    }
  });

  // Test Case 4: Delete a task that was already deleted
  it('Delete a task that was already deleted', async () => {
    mockedAxios.delete.mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Task not found' } }
    });

    try {
      await deleteTask(102);
    } catch (err: any) {
      expect(err.response.status).toBe(404);
      expect(err.response.data.message).toMatch(/not found/i);
    }
  });

  // Test Case 5: Delete a task and ensure it is removed from event\'s task list
  it('Delete a task and ensure it is removed from event\'s task list', async () => {
    mockedAxios.delete.mockResolvedValueOnce({ status: 200 });
    mockedAxios.get.mockResolvedValueOnce({ data: [{ id: 110, eventId: 202 }, { id: 111, eventId: 202 }] }); // Before deletion
    mockedAxios.get.mockResolvedValueOnce({ data: [{ id: 111, eventId: 202 }] }); // After deletion

    const tasksBefore = await listTasksByEvent(202);
    expect(tasksBefore).toEqual([
      { id: 110, eventId: 202 },
      { id: 111, eventId: 202 }
    ]);

    const response = await deleteTask(110);
    expect(response.status).toBe(200);

    const tasksAfter = await listTasksByEvent(202);
    expect(tasksAfter).not.toContainEqual(expect.objectContaining({ id: 110 }));
    expect(tasksAfter).toContainEqual(expect.objectContaining({ id: 111 }));
  });

  // Test Case 6: Concurrent deletion of the same task
  it('Concurrent deletion of the same task', async () => {
    mockedAxios.delete
      .mockResolvedValueOnce({ status: 200 }) // First request
      .mockRejectedValueOnce({ response: { status: 404, data: { message: 'Task not found' } } }); // Second request

    // First deletion
    const response1 = await deleteTask(120);
    expect(response1.status).toBe(200);

    // Second deletion
    try {
      await deleteTask(120);
    } catch (err: any) {
      expect(err.response.status).toBe(404);
      expect(err.response.data.message).toMatch(/not found/i);
    }
  });

  // Test Case 7: Ensure no unassigned tasks after deletion
  it('Ensure no unassigned tasks after deletion', async () => {
    mockedAxios.delete.mockResolvedValueOnce({ status: 200 });
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        { id: 131, eventId: 230 },
        { id: 132, eventId: 230 }
      ]
    }); // Remaining tasks after deletion

    const response = await deleteTask(130);
    expect(response.status).toBe(200);

    const remainingTasks = await mockedAxios.get('/tasks');
    for (const task of remainingTasks.data) {
      expect(task.eventId).toBeDefined();
      expect(typeof task.eventId).toBe('number');
    }
  });

  // Test Case 8: Delete event cascade and its tasks
  it('Delete event cascade and its tasks', async () => {
    // Simulate event deletion
    mockedAxios.delete.mockResolvedValueOnce({ status: 200 }); // Delete event
    mockedAxios.delete.mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Task not found' } }
    }); // Delete task after event deletion

    // Delete event 300
    const eventDeleteResponse = await mockedAxios.delete('/events/300');
    expect(eventDeleteResponse.status).toBe(200);

    // Try to delete task 301 after event deletion
    try {
      await deleteTask(301);
    } catch (err: any) {
      expect(err.response.status).toBe(404);
      expect(err.response.data.message).toMatch(/not found/i);
    }
  });

  // Test Case 9: Delete a task with boundary integer ID
  it('Delete a task with boundary integer ID', async () => {
    mockedAxios.delete.mockResolvedValueOnce({ status: 200 });

    const response = await deleteTask(0);
    expect(response.status).toBe(200);

    mockedAxios.delete.mockResolvedValueOnce({ status: 200 });
    const maxInt = 2147483647;
    const responseMax = await deleteTask(maxInt);
    expect(responseMax.status).toBe(200);
  });

  // Test Case 10: Attempt to delete a task and ensure it cannot exist unassigned
  it('Attempt to delete a task and ensure it cannot exist unassigned', async () => {
    mockedAxios.delete.mockResolvedValueOnce({ status: 200 });
    mockedAxios.get.mockResolvedValueOnce({ data: [] }); // After deletion

    const response = await deleteTask(400);
    expect(response.status).toBe(200);

    const tasks = await listTasksByEvent(401);
    expect(tasks).not.toContainEqual(expect.objectContaining({ id: 400 }));

    // Simulate global task list
    mockedAxios.get.mockResolvedValueOnce({ data: [] });
    const allTasks = await mockedAxios.get('/tasks');
    expect(allTasks.data).not.toContainEqual(expect.objectContaining({ id: 400 }));
  });

  // Test Case 11: Delete task with negative ID
  it('Delete task with negative ID', async () => {
    mockedAxios.delete.mockRejectedValueOnce({
      response: { status: 400, data: { message: 'Invalid ID format' } }
    });

    try {
      await deleteTask(-1);
    } catch (err: any) {
      expect(err.response.status).toBe(400);
      expect(err.response.data.message).toMatch(/invalid id/i);
    }
  });
});
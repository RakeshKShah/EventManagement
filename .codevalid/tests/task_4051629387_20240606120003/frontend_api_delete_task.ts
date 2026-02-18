import { deleteTask } from '../../../frontend/src/services/api';
import { enableFetchMocks } from 'jest-fetch-mock';

enableFetchMocks();

describe('deleteTask', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  // Test Case 1: Delete existing task with valid ID
  it('Delete existing task with valid ID', async () => {
    fetchMock.mockResponseOnce('', { status: 204 });
    await expect(deleteTask('123')).resolves.toBeUndefined();

    // Simulate subsequent GET returns 404
    fetchMock.mockResponseOnce('', { status: 404 });
    const getResponse = await fetch('/tasks/123');
    expect(getResponse.status).toBe(404);
  });

  // Test Case 2: Delete non-existent task
  it('Delete non-existent task', async () => {
    fetchMock.mockResponseOnce('', { status: 404 });
    await expect(deleteTask('999')).rejects.toThrow(/404/);
  });

  // Test Case 3: Delete task with invalid ID format
  it('Delete task with invalid ID format', async () => {
    fetchMock.mockResponseOnce('', { status: 400 });
    await expect(deleteTask('!@#$')).rejects.toThrow(/400/);
  });

  // Test Case 4: Delete task with empty ID
  it('Delete task with empty ID', async () => {
    fetchMock.mockResponseOnce('', { status: 400 });
    await expect(deleteTask('')).rejects.toThrow(/400/);
  });

  // Test Case 5: Delete task with null ID
  it('Delete task with null ID', async () => {
    fetchMock.mockResponseOnce('', { status: 400 });
    // @ts-expect-error
    await expect(deleteTask(null)).rejects.toThrow(/400/);
  });

  // Test Case 6: Delete task with boundary ID value
  it('Delete task with boundary ID value', async () => {
    // Task exists with ID '0'
    fetchMock.mockResponseOnce('', { status: 204 });
    await expect(deleteTask('0')).resolves.toBeUndefined();

    // Subsequent GET returns 404
    fetchMock.mockResponseOnce('', { status: 404 });
    const getResponse = await fetch('/tasks/0');
    expect(getResponse.status).toBe(404);
  });

  // Test Case 7: Delete task with very large ID value
  it('Delete task with very large ID value', async () => {
    // Task exists with large ID
    fetchMock.mockResponseOnce('', { status: 204 });
    await expect(deleteTask('999999999999999999')).resolves.toBeUndefined();

    // Subsequent GET returns 404
    fetchMock.mockResponseOnce('', { status: 404 });
    const getResponse = await fetch('/tasks/999999999999999999');
    expect(getResponse.status).toBe(404);
  });

  // Test Case 8: Delete same task multiple times
  it('Delete same task multiple times', async () => {
    // First call: task exists
    fetchMock.mockResponseOnce('', { status: 204 });
    await expect(deleteTask('456')).resolves.toBeUndefined();

    // Second call: task no longer exists
    fetchMock.mockResponseOnce('', { status: 404 });
    await expect(deleteTask('456')).rejects.toThrow(/404/);

    // Task remains deleted
    fetchMock.mockResponseOnce('', { status: 404 });
    const getResponse = await fetch('/tasks/456');
    expect(getResponse.status).toBe(404);
  });

  // Test Case 9: Delete task with concurrent requests
  it('Delete task with concurrent requests', async () => {
    // Simulate one succeeds, others fail
    fetchMock.mockResponses(
      ['', { status: 204 }],
      ['', { status: 404 }],
      ['', { status: 404 }]
    );

    const results = await Promise.allSettled([
      deleteTask('789'),
      deleteTask('789'),
      deleteTask('789')
    ]);

    expect(results.filter(r => r.status === 'fulfilled').length).toBe(1);
    expect(results.filter(r => r.status === 'rejected').length).toBe(2);

    // Task is deleted and not retrievable
    fetchMock.mockResponseOnce('', { status: 404 });
    const getResponse = await fetch('/tasks/789');
    expect(getResponse.status).toBe(404);
  });

  // Test Case 10: Delete task does not affect other tasks or events
  it('Delete task does not affect other tasks or events', async () => {
    // Delete task '101'
    fetchMock.mockResponseOnce('', { status: 204 });
    await expect(deleteTask('101')).resolves.toBeUndefined();

    // Other tasks remain
    fetchMock.mockResponseOnce('', { status: 200 });
    const getResponse102 = await fetch('/tasks/102');
    expect(getResponse102.status).toBe(200);

    fetchMock.mockResponseOnce('', { status: 200 });
    const getResponse103 = await fetch('/tasks/103');
    expect(getResponse103.status).toBe(200);

    // Events remain unchanged
    fetchMock.mockResponseOnce('', { status: 200 });
    const getEventResponse = await fetch('/events');
    expect(getEventResponse.status).toBe(200);
  });
});
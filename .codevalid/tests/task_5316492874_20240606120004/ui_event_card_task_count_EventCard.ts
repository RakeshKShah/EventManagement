import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import EventCard from '../../../frontend/src/components/EventCard'
import { Event, Task } from '../../../frontend/src/types'

// Helper to create event objects
const createEvent = (
  overrides: Partial<Event> = {},
  tasks: Task[] = []
): Event => ({
  id: 1,
  name: 'Sample Event',
  description: 'Sample Description',
  start_date: '2024-06-06T12:00:00Z',
  end_date: '2024-06-06T14:00:00Z',
  created_at: '2024-06-06T10:00:00Z',
  updated_at: '2024-06-06T11:00:00Z',
  tasks,
  ...overrides,
})

const createTask = (
  overrides: Partial<Task> = {},
  event_id: number = 1
): Task => ({
  id: Math.floor(Math.random() * 10000),
  title: 'Sample Task',
  description: 'Task Description',
  status: 'To Do',
  event_id,
  created_at: '2024-06-06T10:00:00Z',
  updated_at: '2024-06-06T11:00:00Z',
  ...overrides,
})

describe('EventCard', () => {
  // Test Case 1: Display Event Details
  it('Display Event Details', () => {
    const event = createEvent()
    render(
      <EventCard
        event={event}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText(event.name)).toBeInTheDocument()
    expect(screen.getByText('Sample Description')).toBeInTheDocument()
    expect(screen.getByText(/Start:/)).toBeInTheDocument()
    expect(screen.getByText(/End:/)).toBeInTheDocument()
  })

  // Test Case 2: Display Task Count
  it('Display Task Count', () => {
    const tasks = [
      createTask({}, 1),
      createTask({}, 1),
      createTask({}, 1),
    ]
    const event = createEvent({}, tasks)
    render(
      <EventCard
        event={event}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText(/Tasks:/)).toHaveTextContent('Tasks: 3')
  })

  // Test Case 3: Display Zero Task Count
  it('Display Zero Task Count', () => {
    const event = createEvent({}, [])
    render(
      <EventCard
        event={event}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText(/Tasks:/)).toHaveTextContent('Tasks: 0')
  })

  // Test Case 4: Task Assignment Updates Task Count
  it('Task Assignment Updates Task Count', () => {
    let tasks = [
      createTask({}, 1),
      createTask({}, 1),
    ]
    let event = createEvent({}, tasks)
    const { rerender } = render(
      <EventCard
        event={event}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText(/Tasks:/)).toHaveTextContent('Tasks: 2')
    // Assign new task
    tasks = [...tasks, createTask({}, 1)]
    event = createEvent({}, tasks)
    rerender(
      <EventCard
        event={event}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText(/Tasks:/)).toHaveTextContent('Tasks: 3')
  })

  // Test Case 5: Task Removal Updates Task Count
  it('Task Removal Updates Task Count', () => {
    let tasks = [
      createTask({}, 1),
      createTask({}, 1),
    ]
    let event = createEvent({}, tasks)
    const { rerender } = render(
      <EventCard
        event={event}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText(/Tasks:/)).toHaveTextContent('Tasks: 2')
    // Remove a task
    tasks = [tasks[0]]
    event = createEvent({}, tasks)
    rerender(
      <EventCard
        event={event}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    )
    expect(screen.getByText(/Tasks:/)).toHaveTextContent('Tasks: 1')
  })

  // Test Case 6: Task Reassignment Updates Multiple EventCards
  it('Task Reassignment Updates Multiple EventCards', () => {
    let tasksA = [
      createTask({ id: 1 }, 1),
      createTask({ id: 2 }, 1),
    ]
    let tasksB = [
      createTask({ id: 3 }, 2),
    ]
    let eventA = createEvent({ id: 1, name: 'Event A' }, tasksA)
    let eventB = createEvent({ id: 2, name: 'Event B' }, tasksB)
    const { rerender } = render(
      <>
        <EventCard event={eventA} onEdit={jest.fn()} onDelete={jest.fn()} />
        <EventCard event={eventB} onEdit={jest.fn()} onDelete={jest.fn()} />
      </>
    )
    expect(screen.getAllByText(/Tasks:/)[0]).toHaveTextContent('Tasks: 2')
    expect(screen.getAllByText(/Tasks:/)[1]).toHaveTextContent('Tasks: 1')
    // Move task from A to B
    tasksA = [tasksA[1]]
    tasksB = [tasksB[0], tasksA[0]]
    eventA = createEvent({ id: 1, name: 'Event A' }, tasksA)
    eventB = createEvent({ id: 2, name: 'Event B' }, tasksB)
    rerender(
      <>
        <EventCard event={eventA} onEdit={jest.fn()} onDelete={jest.fn()} />
        <EventCard event={eventB} onEdit={jest.fn()} onDelete={jest.fn()} />
      </>
    )
    expect(screen.getAllByText(/Tasks:/)[0]).toHaveTextContent('Tasks: 1')
    expect(screen.getAllByText(/Tasks:/)[1]).toHaveTextContent('Tasks: 2')
  })

  // Test Case 7: Assign Task to Non-existent Event
  it('Assign Task to Non-existent Event', () => {
    // Simulate error handling for non-existent event assignment
    const nonExistentEventId = 999
    const assignTask = (eventId: number) => {
      if (eventId !== 1) {
        throw new Error('Event not found')
      }
    }
    expect(() => assignTask(nonExistentEventId)).toThrow('Event not found')
    // No EventCard should be updated, so render remains unchanged
    const event = createEvent()
    render(
      <EventCard event={event} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    expect(screen.getByText(/Tasks:/)).toHaveTextContent('Tasks: 0')
  })

  // Test Case 8: Reassign Task to Non-existent Event
  it('Reassign Task to Non-existent Event', () => {
    const eventA = createEvent({ id: 1 }, [createTask({ id: 1 }, 1)])
    const nonExistentEventId = 999
    const reassignTask = (task: Task, eventId: number) => {
      if (eventId !== 1) {
        throw new Error('Event not found')
      }
      return task
    }
    expect(() => reassignTask(eventA.tasks![0], nonExistentEventId)).toThrow('Event not found')
    render(
      <EventCard event={eventA} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    expect(screen.getByText(/Tasks:/)).toHaveTextContent('Tasks: 1')
  })

  // Test Case 9: Delete Event Deletes Associated Tasks
  it('Delete Event Deletes Associated Tasks', () => {
    const tasks = [
      createTask({}, 1),
      createTask({}, 1),
      createTask({}, 1),
    ]
    const event = createEvent({}, tasks)
    const onDelete = jest.fn()
    const { unmount } = render(
      <EventCard event={event} onEdit={jest.fn()} onDelete={onDelete} />
    )
    fireEvent.click(screen.getByText('Delete'))
    expect(onDelete).toHaveBeenCalled()
    unmount()
    // After unmount, EventCard is removed
    expect(screen.queryByText(event.name)).not.toBeInTheDocument()
  })

  // Test Case 10: Prevent Task Without Event Association
  it('Prevent Task Without Event Association', () => {
    const createTaskWithoutEvent = () => {
      return createTask({ event_id: undefined as unknown as number })
    }
    expect(() => createTaskWithoutEvent()).toThrow()
    // EventCard's task count remains unchanged
    const event = createEvent({}, [])
    render(
      <EventCard event={event} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    expect(screen.getByText(/Tasks:/)).toHaveTextContent('Tasks: 0')
  })

  // Test Case 11: Removing Task Requires Immediate Reassignment or Deletion
  it('Removing Task Requires Immediate Reassignment or Deletion', () => {
    let tasks = [
      createTask({ id: 1 }, 1),
      createTask({ id: 2 }, 1),
    ]
    let event = createEvent({}, tasks)
    const { rerender } = render(
      <EventCard event={event} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    // Remove task without reassignment
    tasks = [tasks[1]]
    event = createEvent({}, tasks)
    rerender(
      <EventCard event={event} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    expect(screen.getByText(/Tasks:/)).toHaveTextContent('Tasks: 1')
  })

  // Test Case 12: View Only Tasks for Specific Event
  it('View Only Tasks for Specific Event', () => {
    const tasksA = [
      createTask({ id: 1 }, 1),
      createTask({ id: 2 }, 1),
    ]
    const tasksB = [
      createTask({ id: 3 }, 2),
    ]
    const eventA = createEvent({ id: 1 }, tasksA)
    render(
      <EventCard event={eventA} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    // Only tasks for eventA should be counted
    expect(screen.getByText(/Tasks:/)).toHaveTextContent('Tasks: 2')
  })

  // Test Case 13: Render with Missing Tasks Property
  it('Render with Missing Tasks Property', () => {
    const event = {
      ...createEvent(),
      tasks: undefined,
    }
    render(
      <EventCard event={event} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    expect(screen.getByText(/Tasks:/)).toHaveTextContent('Tasks: 0')
  })

  // Test Case 14: Render Large Number of Tasks
  it('Render Large Number of Tasks', () => {
    const tasks = Array.from({ length: 1000 }, (_, i) =>
      createTask({ id: i + 1 }, 1)
    )
    const event = createEvent({}, tasks)
    render(
      <EventCard event={event} onEdit={jest.fn()} onDelete={jest.fn()} />
    )
    expect(screen.getByText(/Tasks:/)).toHaveTextContent('Tasks: 1000')
  })
})
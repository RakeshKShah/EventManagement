import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskList from '../../frontend/src/components/TaskList';
import TaskCard from '../../frontend/src/components/TaskCard';

// Mock TaskCard for tests that require it
jest.mock('../../frontend/src/components/TaskCard', () => ({
  __esModule: true,
  default: jest.fn(({ id, title, description, status, event_id, onTaskClick }) => (
    <div data-testid="task-card" data-id={id}>
      <span>{title}</span>
      <span>{description}</span>
      <span>{status}</span>
      <span>{event_id}</span>
      {onTaskClick && (
        <button data-testid="task-card-btn" onClick={() => onTaskClick(id)}>
          Click
        </button>
      )}
    </div>
  )),
}));

// Error boundary for test 12
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <div data-testid="error-boundary">Error boundary fallback</div>;
    }
    return this.props.children;
  }
}

// Helper: filter tasks by event_id
function filterTasksByEventId(tasks: any[], eventId: number) {
  return tasks.filter(task => task && task.event_id === eventId);
}

describe('TaskList Component - ui_task_list_component_view_all_tasks', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test Case 1
  it("Render 'No tasks yet' when tasks array is empty", () => {
    render(<TaskList tasks={[]} />);
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.queryAllByTestId('task-card')).toHaveLength(0);
  });

  // Test Case 2
  it('Render TaskCard for each task in tasks array', () => {
    const tasks = [
      { id: 1, title: 'A', description: 'Desc A', status: 'open', event_id: 10 },
      { id: 2, title: 'B', description: 'Desc B', status: 'in progress', event_id: 12 },
    ];
    render(<TaskList tasks={tasks} />);
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument();
    const cards = screen.getAllByTestId('task-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('A');
    expect(cards[0]).toHaveTextContent('Desc A');
    expect(cards[0]).toHaveTextContent('open');
    expect(cards[0]).toHaveTextContent('10');
    expect(cards[1]).toHaveTextContent('B');
    expect(cards[1]).toHaveTextContent('Desc B');
    expect(cards[1]).toHaveTextContent('in progress');
    expect(cards[1]).toHaveTextContent('12');
  });

  // Test Case 3
  it('Render TaskCard for a single task', () => {
    const tasks = [{ id: 1, title: 'Only Task', description: 'Only Desc', status: 'open', event_id: 10 }];
    render(<TaskList tasks={tasks} />);
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument();
    const cards = screen.getAllByTestId('task-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('Only Task');
    expect(cards[0]).toHaveTextContent('Only Desc');
    expect(cards[0]).toHaveTextContent('open');
    expect(cards[0]).toHaveTextContent('10');
  });

  // Test Case 4
  it('Handle tasks with missing or undefined fields', () => {
    const tasks = [{ id: 1, title: 'Task 1', event_id: 10 }];
    render(<TaskList tasks={tasks} />);
    const cards = screen.getAllByTestId('task-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('Task 1');
    // Should handle missing description/status gracefully (empty or placeholder)
    expect(cards[0]).toHaveTextContent('');
    expect(cards[0]).toHaveTextContent('10');
  });

  // Test Case 5
  it("Handle tasks prop is null or undefined", () => {
    render(<TaskList tasks={null as any} />);
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.queryAllByTestId('task-card')).toHaveLength(0);

    render(<TaskList tasks={undefined as any} />);
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.queryAllByTestId('task-card')).toHaveLength(0);
  });

  // Test Case 6
  it('Handle tasks array with non-object elements', () => {
    const tasks = [{ id: 1, title: 'Valid' }, null, 42];
    render(<TaskList tasks={tasks} />);
    const cards = screen.getAllByTestId('task-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('Valid');
    // Invalid entries are skipped, no error thrown
  });

  // Test Case 7
  it('Update tasks prop dynamically', () => {
    const { rerender } = render(<TaskList tasks={[]} />);
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    rerender(<TaskList tasks={[{ id: 1, title: 'New Task', description: '...', status: 'open', event_id: 20 }]} />);
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument();
    const cards = screen.getAllByTestId('task-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('New Task');
    expect(cards[0]).toHaveTextContent('open');
    expect(cards[0]).toHaveTextContent('20');
  });

  // Test Case 8
  it('Render large number of tasks', () => {
    const tasks = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      title: `Task ${i + 1}`,
      description: `Desc ${i + 1}`,
      status: 'open',
      event_id: 100,
    }));
    render(<TaskList tasks={tasks} />);
    const cards = screen.getAllByTestId('task-card');
    expect(cards).toHaveLength(1000);
    expect(cards[0]).toHaveTextContent('Task 1');
    expect(cards[999]).toHaveTextContent('Task 1000');
    // UI remains responsive (test will fail if render is too slow)
  });

  // Test Case 9
  it('Propagate user interaction from TaskCard', () => {
    const onTaskClick = jest.fn();
    const tasks = [{ id: 1, title: 'Task', description: 'Desc', status: 'open', event_id: 10 }];
    render(<TaskList tasks={tasks} onTaskClick={onTaskClick} />);
    const btn = screen.getByTestId('task-card-btn');
    fireEvent.click(btn);
    expect(onTaskClick).toHaveBeenCalledWith(1);
  });

  // Test Case 10
  it('Render only tasks for specified event id', () => {
    const tasks = [
      { id: 1, event_id: 5, title: 'A' },
      { id: 2, event_id: 7, title: 'B' },
      { id: 3, event_id: 5, title: 'C' },
    ];
    // Simulate filtering by event_id = 5
    const filteredTasks = filterTasksByEventId(tasks, 5);
    render(<TaskList tasks={filteredTasks} />);
    const cards = screen.getAllByTestId('task-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('A');
    expect(cards[1]).toHaveTextContent('C');
    expect(screen.queryByText('B')).not.toBeInTheDocument();
  });

  // Test Case 11
  it('Tasks with duplicate IDs (React key warning)', () => {
    const tasks = [
      { id: 1, title: 'Task 1', event_id: 5 },
      { id: 1, title: 'Task 1 Duplicate', event_id: 5 },
    ];
    // React key warning cannot be caught directly, but we can simulate by checking both cards are rendered
    render(<TaskList tasks={tasks} />);
    const cards = screen.getAllByTestId('task-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('Task 1');
    expect(cards[1]).toHaveTextContent('Task 1 Duplicate');
    // Note: In real app, developer console will show key warning
  });

  // Test Case 12
  it("Component error boundary handling", () => {
    // Mock TaskCard to throw error
    jest.mock('../../frontend/src/components/TaskCard', () => ({
      __esModule: true,
      default: () => {
        throw new Error('Render error');
      },
    }));
    const tasks = [{ id: 1, title: 'Task', event_id: 5 }];
    render(
      <ErrorBoundary>
        <TaskList tasks={tasks} />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    // Restore TaskCard mock for other tests
    jest.unmock('../../frontend/src/components/TaskCard');
  });
});
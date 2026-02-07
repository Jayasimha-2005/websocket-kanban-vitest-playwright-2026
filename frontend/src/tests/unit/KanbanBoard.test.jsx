import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// We'll use a hoist-safe mock factory so Vitest doesn't try to access
// test-scoped variables before they're initialized. The factory returns
// a `__mock` object (listeners/emitCalls) we can import inside tests.
let listeners;
let emitCalls;
vi.mock('../../socket', () => {
  const _listeners = {};
  const _emitCalls = [];
  const mockSocket = {
    connected: true,
    on: (ev, cb) => {
      _listeners[ev] = _listeners[ev] || [];
      _listeners[ev].push(cb);
    },
    off: (ev, cb) => {
      if (!_listeners[ev]) return;
      _listeners[ev] = _listeners[ev].filter((f) => f !== cb);
    },
    emit: (ev, payload, ack) => {
      _emitCalls.push({ ev, payload });
      if (typeof ack === 'function') {
        ack({ status: 'ok', task: { id: 'server-1', ...payload } });
      }
    },
  };
  return { default: mockSocket, __mock: { listeners: _listeners, emitCalls: _emitCalls } };
});

import KanbanBoard from '../../components/KanbanBoard';

describe('KanbanBoard (unit)', () => {
  beforeEach(async () => {
    // import the mocked module to get access to its internal __mock
    const mod = await vi.importMock('../../socket');
    listeners = mod.__mock.listeners;
    emitCalls = mod.__mock.emitCalls;
    // clear listeners and emits
    for (const k of Object.keys(listeners)) delete listeners[k];
    emitCalls.length = 0;
  });

  it('renders tasks when server syncs', async () => {
    render(<KanbanBoard />);

    // simulate server sending tasks
    const sample = [{ id: 't-1', title: 'Hello', description: 'desc', status: 'todo', priority: 'Medium', category: 'Feature', attachments: [] }];
    // call any registered sync:tasks listeners
    (listeners['sync:tasks'] || []).forEach((cb) => cb(sample));

    await waitFor(() => expect(screen.getByText(/Hello/)).toBeInTheDocument());
  });

  it('emits task:create when creating a task while connected', async () => {
    render(<KanbanBoard />);
    const user = userEvent.setup();

    // fill title and click create
    const titleInput = screen.getByTestId('title-input');
    await user.type(titleInput, 'New Task');

    const createButton = screen.getByTestId('create-button');
    await user.click(createButton);

    // emit should have been called with task:create
    await waitFor(() => {
      const found = emitCalls.find((e) => e.ev === 'task:create');
      expect(found).toBeTruthy();
      expect(found.payload.title).toBe('New Task');
    });
  });
});

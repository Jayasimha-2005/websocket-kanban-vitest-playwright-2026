import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";

// Create handlers and emitted outside to avoid hoisting issues
let handlers = {};
let emitted = [];

// Mock socket before import
vi.mock("../../socket", () => ({
  default: {
    on: (evt, cb) => {
      handlers[evt] = handlers[evt] || [];
      handlers[evt].push(cb);
    },
    off: (evt, cb) => {
      if (!evt) return;
      handlers[evt] = (handlers[evt] || []).filter((c) => c !== cb);
    },
    emit: (evt, payload, ack) => {
      emitted.push({ evt, payload });
      if (typeof ack === "function") ack({ status: "ok" });
    },
    _trigger: (evt, payload) => {
      (handlers[evt] || []).forEach((cb) => cb(payload));
    },
  },
}));

import KanbanBoard from "../../components/KanbanBoard";
import socket from "../../socket";

describe("KanbanBoard (socket-driven)", () => {
  beforeEach(() => {
    // clear handlers and emitted
    handlers = {};
    emitted = [];
  });

  it("renders tasks when server syncs", async () => {
    render(<KanbanBoard />);

    const sample = [
      { id: "1", title: "Task One", description: "desc", status: "todo", priority: "Low", category: "Bug", attachments: [] },
      { id: "2", title: "Task Two", description: "desc2", status: "done", priority: "High", category: "Feature", attachments: [] },
    ];

    // simulate server sending tasks
    socket._trigger("sync:tasks", sample);

    await waitFor(() => expect(screen.getByText("Task One")).toBeTruthy());
    expect(screen.getByText("Task Two")).toBeTruthy();
  });

  it("emits delete event when delete button clicked", async () => {
    render(<KanbanBoard />);
    const sample = [{ id: "x1", title: "DeleteMe", description: "", status: "todo", priority: "Low", category: "Bug", attachments: [] }];
    socket._trigger("sync:tasks", sample);

    await waitFor(() => expect(screen.getByText("DeleteMe")).toBeTruthy());
    const btn = screen.getByLabelText("delete");
    await userEvent.click(btn);

    expect(emitted.find((e) => e.evt === "task:delete" && e.payload && e.payload.id === "x1")).toBeTruthy();
  });
});

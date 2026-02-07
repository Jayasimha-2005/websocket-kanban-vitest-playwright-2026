import { render, screen } from "@testing-library/react";

import KanbanBoard from "../../components/KanbanBoard";

// mock socket.io-client library

test("WebSocket integration renders board", async () => {
  render(<KanbanBoard />);

  // Check that the board elements are rendered
  expect(screen.getByText("Create Task")).toBeInTheDocument();
  expect(screen.getByText("To Do")).toBeInTheDocument();
  expect(screen.getByText("In Progress")).toBeInTheDocument();
});

// TODO: Add more integration tests

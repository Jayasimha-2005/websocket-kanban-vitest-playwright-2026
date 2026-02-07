import { io } from "socket.io-client";

// Single socket instance for the client. Change URL via env if needed.
const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const socket = io(BACKEND, { autoConnect: true });

export default socket;

import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["polling"], // or ["websocket", "polling"]
  withCredentials: true,
  autoConnect: true,
});

export default socket;
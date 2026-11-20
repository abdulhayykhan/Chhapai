import { io, Socket } from "socket.io-client";
import { getServerUrl, getAccessToken } from "./api";
import { PrintJobDto } from "../types";

let socket: Socket | null = null;
let reconnectHandlers: Array<() => void> = [];
let connectionStatusHandlers: Array<(connected: boolean) => void> = [];
let jobCreatedHandlers: Array<(job: PrintJobDto) => void> = [];
let jobUpdatedHandlers: Array<(job: PrintJobDto) => void> = [];
let jobApprovedHandlers: Array<(job: PrintJobDto) => void> = [];

export const adminSocket = {
  connect(): Socket | null {
    const token = getAccessToken();
    if (!token) return null;

    if (socket) {
      socket.disconnect();
    }

    const serverUrl = getServerUrl();
    socket = io(`${serverUrl}/admin`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      connectionStatusHandlers.forEach((h) => h(true));
      reconnectHandlers.forEach((h) => h());
    });

    socket.on("disconnect", () => {
      connectionStatusHandlers.forEach((h) => h(false));
    });

    socket.on("connect_error", () => {
      connectionStatusHandlers.forEach((h) => h(false));
    });

    socket.on("job:created", (job: PrintJobDto) => {
      jobCreatedHandlers.forEach((h) => h(job));
    });

    socket.on("job:updated", (job: PrintJobDto) => {
      jobUpdatedHandlers.forEach((h) => h(job));
    });

    socket.on("job:approved", (job: PrintJobDto) => {
      jobApprovedHandlers.forEach((h) => h(job));
    });

    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  isConnected(): boolean {
    return !!socket?.connected;
  },

  onConnectionChange(handler: (connected: boolean) => void) {
    connectionStatusHandlers.push(handler);
    return () => {
      connectionStatusHandlers = connectionStatusHandlers.filter(
        (h) => h !== handler,
      );
    };
  },

  onReconnect(handler: () => void) {
    reconnectHandlers.push(handler);
    return () => {
      reconnectHandlers = reconnectHandlers.filter((h) => h !== handler);
    };
  },

  onJobCreated(handler: (job: PrintJobDto) => void) {
    jobCreatedHandlers.push(handler);
    return () => {
      jobCreatedHandlers = jobCreatedHandlers.filter((h) => h !== handler);
    };
  },

  onJobUpdated(handler: (job: PrintJobDto) => void) {
    jobUpdatedHandlers.push(handler);
    return () => {
      jobUpdatedHandlers = jobUpdatedHandlers.filter((h) => h !== handler);
    };
  },

  onJobApproved(handler: (job: PrintJobDto) => void) {
    jobApprovedHandlers.push(handler);
    return () => {
      jobApprovedHandlers = jobApprovedHandlers.filter((h) => h !== handler);
    };
  },
};

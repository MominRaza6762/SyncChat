import { io } from "socket.io-client";

const SOCKET_URL = "https://sync-chat-server-beryl.vercel.app";
export const socket = io(SOCKET_URL,{withCredentials:true});
export const connectSocket = () => {
    socket.connect();
  };
export const disconnectSocket = () => {
    socket.disconnect();
  };

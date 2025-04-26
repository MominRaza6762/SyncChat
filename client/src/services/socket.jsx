import { io } from "socket.io-client";

const SOCKET_URL = "https://syncchat-production.up.railway.app";
export const socket = io(SOCKET_URL,{withCredentials:true});
export const connectSocket = () => {
    socket.connect();
  };
export const disconnectSocket = () => {
    socket.disconnect();
  };

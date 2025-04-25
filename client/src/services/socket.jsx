import { io } from "socket.io-client";

const SOCKET_URL = "http://192.168.18.64:5000/";



export const socket = io(SOCKET_URL,{withCredentials:true});

export const connectSocket = () => {
    socket.connect();
  };

export const disconnectSocket = () => {
    socket.disconnect();
  };
import axios from "axios";
const API = axios.create({
    baseURL: "https://sync-chat-server-beryl.vercel.app",
    withCredentials:true,
})
export default API;

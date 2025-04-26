import axios from "axios";
const API = axios.create({
    baseURL: "https://syncchat-production.up.railway.app",
    withCredentials:true,
})
export default API;

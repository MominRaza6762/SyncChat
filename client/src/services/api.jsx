import axios from "axios";


const API = axios.create({
    baseURL: "http://192.168.18.64:5000/",
    
    
    
    withCredentials:true,

})

export default API;
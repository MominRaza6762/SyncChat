import { createContext, useState, useContext } from 'react';
import API from '../services/api';


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState( JSON.parse(localStorage.getItem("user")) || {auth:false});
   const [alert, setAlert] = useState({msg:'',type:''});

   const getUser =async ()=>{
    try
    {
      const response = await API.get(`/auth/me`);
      const {id , email , name ,profilePic , fcmToken }= response.data.user;     
      const newUser ={auth:true, id , email , name ,profilePic ,fcmToken }

      if (JSON.stringify(user) !== JSON.stringify(newUser)) {
        setUser(newUser);
        localStorage.setItem("user", JSON.stringify(newUser));
    }
    }
    catch(error)
    {
      console.log("User is Not Authenticated..");
      localStorage.removeItem("user");
      setUser({auth:false})
    }
    
  }
  
  return (
    <AuthContext.Provider value={{  user , setUser ,alert, setAlert , getUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

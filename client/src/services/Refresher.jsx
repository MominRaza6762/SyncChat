import { replace, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import { useCall } from "../context/CallContext";

export default function Refresher() {
    const location = useLocation();
    const navigate = useNavigate();
    const {user} = useAuth();
    const {callState} = useCall();

    useEffect(()=>{
        if(user.auth)
        {
            if(location.pathname === "/")
            {
                navigate("/chat", replace)
            }
        }

    },[location.pathname , navigate, user.auth])

    useEffect(()=>{
        if(!callState.callerId)
          {
              if(location.pathname === "/video_call" || location.pathname === "/audio_call" || location.pathname === "/video_call/" || location.pathname === "/audio_call/")
                  {
                      navigate("/chat", {replace:true})
                  }
          }
    
    
    },[callState.callerId])
    


  return null;
}

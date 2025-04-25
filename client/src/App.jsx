import Login from "./components/Login";
import { Navigate, Route ,Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Refresher from "./services/Refresher";
import { useMemo } from "react";
import ChatApp from "./components/ChatApp";
import VideoCallModal from "./components/VideoCallModal";
import AudioCallModal from "./components/AudioCallModal";

function App() {
 
  const location = useLocation();
  const {getUser ,alert ,setAlert  , user} = useAuth();

  useEffect(()=>{
    setAlert({msg:'',type:''});
    
      getUser();

  },[location, user.auth])

  useEffect(()=>{
    return ()=>{
      localStorage.removeItem("chatCache")
    }
  })

  const PrivateRouter = useMemo(
    () => ({ element }) => {
      return user.auth ? element : <Navigate to={"/"} replace/>;
    },
    [user.auth] 
  )
 

  return (<>
    <Refresher/>
  <div className="alert">
  {alert.msg && <p className={`${alert.type}`} > {alert.type==="loading" ?" ⏳ ":alert.type==='success'?'✔ ':alert.type==="info"?'📢 ':alert.type==="error"?"❌ ":"⚠️ "} {alert.msg}</p>}
  </div>
    <Routes>
      <Route path="*" element= {<h1 style={{ textAlign:"center", marginTop:"5rem", color:"black"}}>404 Page Not Found</h1>} />
      <Route path="/" element= {<Login/>} />
      <Route path="/chat" element={<PrivateRouter element = {<ChatApp/>} />}  />
      <Route path="/video_call/" element={<PrivateRouter element = {<VideoCallModal/>} />}  />
      <Route path="/audio_call/" element={<PrivateRouter element = {<AudioCallModal/>} />}  />
    </Routes>
    </>)
}

export default App

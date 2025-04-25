import { useCall } from "../context/CallContext";
import "../assets/call.css"
import { useAuth } from "../context/AuthContext";
import { useEffect , useRef ,useState} from "react";
import { useLocation , useNavigate } from "react-router-dom";
import {socket} from "../services/socket"

const AudioCallModal = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const { callState, endCall, startCall, answerCall ,initialState } = useCall();
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const { setAlert , user } = useAuth();
  const [callResponse , setCallResponse] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);
  const [micOff ,setMicOff] = useState(false);

  const {participant} = location.state || {};
  const caller = location.state?.caller;

  

  let audioCtx;
  let ringtoneBuffer;
  let sourceNode;

  const initAudioContext = async () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const res = await fetch('/mp3/mask_off.mp3');
      const buffer = await res.arrayBuffer();
      ringtoneBuffer = await audioCtx.decodeAudioData(buffer);
    }
  };
  const playRingtone = async () => {
    await initAudioContext();
    if (audioCtx && ringtoneBuffer) {
      sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = ringtoneBuffer;
      sourceNode.loop = true;
      sourceNode.connect(audioCtx.destination);
      sourceNode.start(0);
    }
  };
  
  const stopRingtone = () => {
    if (sourceNode) {
      sourceNode.stop(0);
      sourceNode.disconnect();
      sourceNode = null;
    }
  };

   useEffect(() => {
      if (callState.isReceivingCall && !callState.callAccepted) {
        playRingtone();
      } else {
        stopRingtone();
      }
    
      return () => {
        stopRingtone();
      };
    }, [callState.isReceivingCall, callState.callAccepted]);

      useEffect(() => {
        return () => {
          if (localAudioRef.current?.srcObject) {
            localAudioRef.current.srcObject.getTracks().forEach(track => track.stop());
          }
      
          if (remoteAudioRef.current?.srcObject) {
            remoteAudioRef.current.srcObject.getTracks().forEach(track => track.stop());
          }
      
          clearInterval(timerRef.current);
    
          endCall();
          setTimeout(()=>{
            initialState();
          },4000)
        };
      }, []);

      const handleStart = () => {
        if (!isRunning) {
          setIsRunning(true);
          timerRef.current = setInterval(() => {
            setSeconds(prev => prev + 1);
          }, 1000);
        }
      };
    
    
       const handleStop = () => {
        setIsRunning(false);
        clearInterval(timerRef.current);
      };
    
      const formatTime = () => {
        const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        return `${hrs}:${mins}:${secs}`;
      };

        useEffect(()=>{
          const handleCallDeclined = ({ from })=>{
            if(from?.toString() === callState?.callerId?.toString() && callState.iceConnection === "")
            {
              setAlert({msg:"call declined",type:"info"})
      
              setTimeout(()=>{
                setAlert({msg:"",type:""})
              },2000)
            }
      
          }
      
          socket.on("call-declined", handleCallDeclined)
      
          const handleUserOffline = (offline)=>{
            if(offline) setCallResponse(false)
          }
        socket.on("user-offline",handleUserOffline)
      
        const handleRinging = (ringing)=>{
          if(ringing) setCallResponse(true)
        }
        socket.on("ringing",handleRinging)
      
      
            const handleEndCall = ({from}) => {
              if(from?.toString() === callState?.callerId?.toString() && callState.iceConnection !== "")
              {
               setAlert({msg:"call ended",type:"info"});
               setTimeout(()=>{
                setAlert({msg:"",type:""});
               },2000)
              }
            }
            socket.on("call-ended", handleEndCall);
      
            const handleOnOtherCall = ({onOtherCall})=>{
              if(onOtherCall)
              {
                setAlert({msg:"user on other call wait to end that call",type:"info"})
                setTimeout(()=>{
                  setAlert({msg:"",type:""});
                  endCall();
                },2500)
              }
            }
      
            socket.on("on-other-call",handleOnOtherCall)
        
      
          return ()=>{
            socket.off("user-offline",handleUserOffline);
            socket.off("ringing",handleRinging);
            socket.off("call-declined", handleCallDeclined)
            socket.off("call-ended", handleEndCall);
      
          }
      
        },[callResponse,callState.isCallActive,callState.callEnded])


  useEffect(() => {
    if (localAudioRef.current && !location.state?.incoming) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          
            localAudioRef.current.srcObject = stream;
            startCall(participant?._id, "audio", stream,user.id , setAlert ); 
        })
        .catch((err) => {
          let message = "Error accessing microphone.";

          if (err.name === "NotAllowedError") {
            message = "Permission denied. Please allow access to microphone.";
          } else if (err.name === "NotFoundError") {
            message = "No microphone found on this device.";
          } else if (err.name === "NotReadableError") {
            message = "Could not access your microphone. It may be in use by another app.";
          } else if (err.name === "OverconstrainedError") {
            message = "No audio device matches the requested constraints.";
          }

          setAlert({ msg: message, type: "error" });
          console.log("Error accessing microphone: ", err);
          setTimeout(() => {
            setAlert({ msg: "", type: "" });
            navigate("/chat",{replace:true})
          }, 3500);
        });
    }
  }, []);

  useEffect(() => {
    if (callState.remoteStream && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = callState.remoteStream;
    }
  }, [callState.remoteStream]);

  useEffect(() => {
      if (callState.localStream && localAudioRef.current) {
        localAudioRef.current.srcObject = callState.localStream;
      }
    }, [callState.localStream]);

    const handleAcceptCall = () => {
      if (callState.incomingOffer) {
        answerCall(caller._id, callState.incomingOffer,setAlert); 
      }
    };

    useEffect(()=>{
        if(callState.iceConnection === "connected" && callState.callAccepted && callState.isCallActive)
        {
          handleStart();
        }
        else{
          handleStop();
        }
    
      },[callState.iceConnection,callState.callAccepted,callState.isCallActive])

      const toggleMicrophone = () => {
        const audioTrack = localAudioRef.current?.srcObject?.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          setMicOff(!micOff)
        }
      };


  return (
    <div className="call-modal">
      <div className="modal-content">
        {callState.isReceivingCall && !callState.callAccepted && (
          <div className="incoming-call">
            <h2>Incoming Audio Call...</h2>
            <div className="caller-details">
            <h3 className="caller-name">{caller.name}</h3>
            <img  src={caller.profilePic} alt={caller.name} />
            </div>
            <div className="call-actions">
            <button onClick={() => handleAcceptCall()}>
              <img src="/svg/callaccept.svg" alt="accept call" /></button>
            <button style={{backgroundColor:"red"}} onClick={()=>{
                            socket.emit("call-rejected",{to:callState.callerId});
                            endCall()}}>
                              <img src="/svg/calldecline.svg" alt="decline call" /></button>
            </div>
          </div>
        )}
       
          <div style={{ display: callState.isCallActive && !callState.isReceivingCall  ? 'block' : 'none' }}>
            <h2>Audio Call</h2>
            <div className="call-screens" >
              <div className="screen" style={{ position:"static"}}>
                <img src={user.profilePic} alt="participant profile" />
            <audio ref={localAudioRef} style={{backgroundColor:"green"}} autoPlay muted />
            {!callState.callAccepted &&<span style={{bottom:"5rem"}}>{callResponse === false?"The user is offline , not reachable at this time.":callResponse === true?"Ringing":null}</span>}
                {callState.callAccepted && callState.iceConnection === "" &&<span style={{bottom:"5rem"}}>connceting</span>}
              </div>

              <div className="screen" style={{ position:"static", display: callState.callAccepted && callState.iceConnection === "connected" ? 'flex' : 'none' }}>
              <img src={location.state?.incoming?caller?.profilePic:participant.profilePic} alt="participant profile" />
            <audio ref={remoteAudioRef} style={{backgroundColor:"green"}} autoPlay />
              </div>

            </div>
            <div className="call-actions">
            <button  style={micOff?{opacity:"0.5"}:{opacity:"1"}} onClick={toggleMicrophone}>
                <img src="/svg/microphoneoff.svg" alt="micro phone off" />
              </button>
            <button style={{backgroundColor:"red"}} onClick={endCall}><img src="/svg/endcall.svg" alt="end call" /></button>
            </div>
            {callState.iceConnection === "connected" && callState.callAccepted && callState.isCallActive &&<span className="call-timer">{formatTime()}</span>}
          </div>
      </div>
    </div>
  );
};

export default AudioCallModal;

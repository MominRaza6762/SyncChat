import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { socket } from "../services/socket";

const CallContext = createContext();
export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const [callState, setCallState] = useState({
    isCallActive: false,
    isReceivingCall: false,
    callerId: null,
    callType: null,
    remoteStream: null,
    localStream: null,
    callAccepted: false,
    callEnded: false,
    incomingOffer:null,
    iceConnection : ""
  });

  const peerConnectionRef = useRef(null);
  const pendingCandidates = useRef([]); 
  

  // const iceServers = {
  //   iceServers: [
  //     {
  //       urls: ["stun:stun.l.google.com:19302"]  
  //     },
  //     {
  //       urls: "turn:openrelay.metered.ca:80",
  //       username: "openrelayproject",
  //       credential: "openrelayproject"
  //     },
  //      {
  //       urls: import.meta.env.VITE_STURN_SERVER1_URLS,
  //       username: import.meta.env.VITE_STURN_SERVER1_USERNAME,
  //       credential: import.meta.env.VITE_STURN_SERVER1_CREDENTIAL
  //     }, {
  //       urls: import.meta.env.VITE_STURN_SERVER2_URLS,
  //       username: import.meta.env.VITE_STURN_SERVER2_USERNAME,
  //       credential: import.meta.env.VITE_STURN_SERVER2_CREDENTIAL
  //     }
  //   ]
  // };

  const iceServers = [
  {
    urls: [ "stun:ss-turn1.xirsys.com" ]
  },
  {
    username: "1032IvzbszikpG6WX753KtWxXCTLyRCTCJKPBOVEym0Xa5Kn6rzK6h7l2sUgQYCdAAAAAGgHPRxNb21pblJhemE=",
    credential: "9dd3aa00-1f46-11f0-913d-0242ac140004",
    urls: [
      "turn:ss-turn1.xirsys.com:80?transport=udp",
      "turn:ss-turn1.xirsys.com:3478?transport=udp",
      "turn:ss-turn1.xirsys.com:80?transport=tcp",
      "turn:ss-turn1.xirsys.com:3478?transport=tcp",
      "turns:ss-turn1.xirsys.com:443?transport=tcp",
      "turns:ss-turn1.xirsys.com:5349?transport=tcp"
    ]
  }
];


  const startCall = async (to, callType, localStreamArg, userId ,setAlert ) => {
    socket.emit("join-call", { userId });
  
    let localStream = localStreamArg;
    if (!localStream) {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (error) {
        console.error("Error accessing media devices", error);
        return;
      }
    }
  
    const peerConnection = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = peerConnection;
      
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
  
    socket.emit("call-user", { to, offer, callType });
  
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { to, candidate: event.candidate });
      }
    };

    peerConnection.ontrack = (event) => {
  setCallState((prev) => ({
    ...prev,
    remoteStream: event.streams[0],
  }));
};
  
    setCallState((prev) => ({
      ...prev,
      isCallActive: true,
      callerId: to,
      callType,
      localStream,
    }));

    peerConnection.oniceconnectionstatechange = () => {
      console.log("Callee ICE State:", peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === "connected") {
        console.log("✅ Peer connection is successfully connected!");
        setCallState((prev) => ({
          ...prev,
          iceConnection:"connected"
        }));
        
      } else if (peerConnection.iceConnectionState === "disconnected") {
        endCall(null,to);
        console.warn("⚠️ Peer connection is temporarily disconnected!");
        setAlert({msg:"Peer connection is disconnected! unable to conncet with user",type:"error"})
        setCallState((prev) => ({
          ...prev,
          iceConnection:"disconnected"
        }));
      } else if (peerConnection.iceConnectionState === "failed") {
        endCall(null,to);
        console.error("❌ Peer connection failed! Please check your TURN/STUN servers or network.");
        setAlert({msg:"Peer connection failed! Please check TURN/STUN servers or network.",type:"error"})
        setCallState((prev) => ({
          ...prev,
          iceConnection:"failed"
        }));
      } else if (peerConnection.iceConnectionState === "closed") {
        endCall(null,to);
        console.log("🔒 Connection closed by one of the peers.");
        setAlert({msg:" call closed by other user.",type:"error"})
        setCallState((prev) => ({
          ...prev,
          iceConnection:"closed"
        }));
      }
      setTimeout(()=>{
        setAlert({msg:"",type:""})
      },2000)
    };
  };
  

  const answerCall = async (from, offer , setAlert ) => {
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    
    const peerConnection = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = peerConnection;
    

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
      setCallState((prev) => ({
        ...prev,
        remoteStream: event.streams[0],
      }));
    };


    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    await processPendingCandidates(); 
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("answer-call", { to: from, answer });


    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { to: from, candidate: event.candidate });
      }
    };

    setCallState((prev) => ({
      ...prev,
      isCallActive: true,
      callAccepted: true,
      isReceivingCall:false,
      localStream,
    }));

    peerConnection.oniceconnectionstatechange = () => {
      console.log("Callee ICE State:", peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === "connected") {
        console.log("✅ Peer connection is successfully connected!");
        setCallState((prev) => ({
          ...prev,
          iceConnection:"connected"
        }));
        
      } else if (peerConnection.iceConnectionState === "disconnected") {
        console.warn("⚠️ Peer connection is temporarily disconnected!");
        setAlert({msg:"Peer connection is disconnected! unable to conncet with user",type:"error"})
        setCallState((prev) => ({
          ...prev,
          iceConnection:"disconnected"
        }));
        endCall();
      } else if (peerConnection.iceConnectionState === "failed") {
        console.error("❌ Peer connection failed! Please check your TURN/STUN servers or network.");
        setAlert({msg:"Peer connection failed! Please check TURN/STUN servers or network.",type:"error"})
        setCallState((prev) => ({
          ...prev,
          iceConnection:"failed"
        }));
        endCall();
      } else if (peerConnection.iceConnectionState === "closed") {
        console.log("🔒 Connection closed by one of the peers.");
        setAlert({msg:" call closed by other user.",type:"error"})
        setCallState((prev) => ({
          ...prev,
          iceConnection:"closed"
        }));
        endCall();
      }
      setTimeout(()=>{
        setAlert({msg:"",type:""})
      },2000)
    }
  };

  
  const endCall = (fromEvent = false,to = null) => {
    const { callerId, localStream } = callState;

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    if (callerId && !fromEvent) {
      socket.emit("end-call", { to: callerId });
    }

    if (to && !fromEvent) {
      socket.emit("end-call", { to: to });
    }

    setTimeout(()=>{setCallState({
      isCallActive: false,
      isReceivingCall: false,
      callerId: null,
      callType: null,
      remoteStream: null,
      localStream: null,
      callAccepted: false,
      callEnded: true,
      incomingOffer:null,
      iceConnection : "disconnected"
    });},1000)
    
  }; 


  const processPendingCandidates = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    for (const candidate of pendingCandidates.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Error adding pending ICE candidate:", error);
      }
    }
    pendingCandidates.current = [];
  };

  const contextSwitchCamera = (newStream)=>{
    try{
    const senders = peerConnectionRef.current.getSenders();

    newStream.getTracks().forEach((newTrack) => {
      const sender = senders.find((s) => s.track.kind === newTrack.kind);
      if (sender) {
        sender.replaceTrack(newTrack);
      }
    }); 
  }catch(err){
    console.log("error while setting switching camera track on peer",err)
  }  
  
  }
  
  useEffect(() => {

    const handleCallAnswer = async ({ answer }) => {
      const peerConnection = peerConnectionRef.current;

      if (peerConnection) {
        peerConnection.ontrack = (event) => {
          setCallState((prev) => ({
            ...prev,
            remoteStream: event.streams[0],
            callAccepted: true,
            isCallActive: true
          }));
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        await processPendingCandidates();
        
      }

    }
    socket.on("call-answered", handleCallAnswer);

    const handleIceCandidate = async ({ candidate }) => {
      const pc = peerConnectionRef.current;
      if (!pc || !candidate) return;
      try {
        if (pc.remoteDescription ) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidates.current.push(candidate); 
        }
      } catch (err) {
        console.error("Error adding received ICE candidate", err);
      }
    };


    socket.on("ice-candidate", handleIceCandidate);

    const handleEndCall = ({from}) => {
      if(from?.toString() === callState?.callerId?.toString())
      {
        const fromEvent = true;
        endCall(fromEvent);
      }
    }
    socket.on("call-ended", handleEndCall);

    return () => {
      socket.off("call-ended", handleEndCall);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-answered", handleCallAnswer);
  };
  }, [callState.remoteStream, callState.callAccepted,callState.callerId]);

  const initialState = ()=>{
    setCallState({
      isCallActive: false,
      isReceivingCall: false,
      callerId: null,
      callType: null,
      remoteStream: null,
      localStream: null,
      callAccepted: false,
      callEnded: false,
      incomingOffer:null,
      iceConnection : ""
    })
  }

  return (
    <CallContext.Provider
      value={{
        callState,
        setCallState,
        startCall,
        answerCall,
        endCall,
        contextSwitchCamera,
        initialState
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

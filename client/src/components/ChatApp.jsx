import React, {   useEffect,  useRef,  useState } from "react";
import ChatList from "./ChatList";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import "../assets/chatApp.css";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { socket ,connectSocket , disconnectSocket } from "../services/socket";
import { requestPermission ,listenToNotifications } from "../services/Notification";
import { useCall } from "../context/CallContext";
import { useNavigate  } from "react-router-dom";


const ChatApp = () => {

  const navigate = useNavigate(); 
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatList , setChatList] = useState([])
  const {user ,setUser, setAlert } = useAuth();
  const socketConnected = useRef(false)
  const chatListRef = useRef(chatList);
  const [newMessagesIndicate , setNewMessagesIncicate] = useState([])
  const newMessagesIndicateRef = useRef(newMessagesIndicate);
  const [selectedChatIndicate , setSelectedChatIndicate] = useState({});
  const selectedChatRef = useRef(selectedChat);
  const { callState,setCallState } = useCall();
  const [leaveForCall , setLeaveForCall] = useState(false)
  const leaveForCallRef = useRef(leaveForCall);

  useEffect(()=>{
    leaveForCallRef.current = leaveForCall;
  },[leaveForCall])
  
  useEffect(()=>{
    const handleIncomingCall =  ({ from, offer, callType }) => {
      socket.emit("join-call", { userId:user.id });      
      setLeaveForCall(true);
      const caller = chatList.filter((c)=>!c.isGroupChat).flatMap((c)=>c.participants).filter((p)=>p._id!==user.id).find((user)=>user._id === from)

          if(callType === "video")
          {
            setTimeout(()=>{
              navigate(`/video_call/`, { replace: true , state:{incoming:true , caller} })
            },700)
          }
          else if(callType === "audio")
            {
              setTimeout(()=>{
                navigate(`/audio_call/`, { replace: true ,state:{incoming:true , caller} })
              },700)
            }
            setCallState((prev) => ({
              ...prev,
              isReceivingCall: true,
              isCallActive: true,
              callerId: from,
              callType,
              incomingOffer: offer,
            }));
        }
    socket.on("incoming-call",handleIncomingCall);
    return ()=>{
      socket.off("incoming-call",handleIncomingCall);
    }
  },[callState.isReceivingCall , chatList])


  useEffect(() => {
    const saveToken =async(token)=>{
      try{
        await API.post("/auth/save_token",{token})
        setUser((prev)=>{
          localStorage.setItem("user", JSON.stringify({...prev,fcmToken:token}))
          return {...prev,fcmToken:token}
        })
      }  catch(error)
      {
          console.error("Error While updating/saving fcm token to server",error.message);
      }
    }

    (async()=>{

      const token =await requestPermission(setAlert);
      if(token)
      {
        if(!user.fcmToken)
        {
          saveToken(token)
        }else
        {
          if(user.fcmToken !== token)
            {
             saveToken(token)
            }

        }
      }
    })()

    listenToNotifications();

  }, []);

  
    useEffect(()=>{
      newMessagesIndicate.forEach((indicate)=>{
        setChatList((prev)=>{
          let index = prev.map((c)=>c._id).indexOf(indicate.chatId);
          if (index === -1) return prev;
          const newList = [...prev];
          const [found] = newList.splice(index, 1);
          newList.unshift(found); 
          return newList
        })
      })

    },[newMessagesIndicate])

  
  


  useEffect(()=>{
    chatListRef.current =chatList;
    newMessagesIndicateRef.current = newMessagesIndicate;

  },[chatList , newMessagesIndicate])
  
  const getChats = async()=>{
    try
    {
      const response =await API.get('/chat/get_chats')
      setChatList(response.data.chatList)
     
    }
    catch(error)
    {
        console.error("Error While getting chats",error.message);
    }
  }

  const selectChat = (chat) => {
  
    setSelectedChatIndicate(
      newMessagesIndicate.find((indicate) => indicate.chatId === chat._id) || null
    )
    setSelectedChat(chat);
  
  };
  useEffect(()=>{
    selectedChatRef.current =selectedChat;
  },[selectedChat])
  

  useEffect(()=>{
    if(!socketConnected.current){
      connectSocket();
      socketConnected.current = true;

      setTimeout(()=>{
        socket.emit('user-online',user.id);
      },500)
      
      const handleOnline = (userId)=>{
        setChatList((prev)=>
          chatListRef.current.map((chat)=>{
            const updatedParticipants = chat.participants.map((participant) =>
              participant._id === userId 
                ? { ...participant, online: true } 
                : participant
            );
          
            return { ...chat, participants: updatedParticipants };
          })
          )
        }
      socket.on('online',handleOnline)

      const handleOffline = (userId)=>{
        setChatList((prev)=>
          chatListRef.current.map((chat)=>{
            const updatedParticipants = chat.participants.map((participant) =>
              participant._id === userId 
                ? { ...participant, online: false , lastSeen:new Date() } 
                : participant
            );
          
            return { ...chat, participants: updatedParticipants };
          })
      )
      }
  
      socket.on('offline',handleOffline)

      const handleGroupCreated =  (chat)=>{
        setChatList([chat ,...chatListRef.current])
      }

      socket.on("group-created",handleGroupCreated);

      const handleUserRemoved =(chatId , groupName)=>{
        setAlert({msg:`Admin remove you from "${groupName}" and deleted your chat`,type:"info"});
        if(selectedChatRef.current?._id === chatId)
          {
            setSelectedChat(null);
          }
          
        setTimeout(()=>{
          setAlert({msg:"",type:""});
        },3000)

        setChatList(chatListRef.current.filter((c)=>c._id !==chatId));

        const cachedChats = JSON.parse(localStorage.getItem("chatCache")) || {};
         delete cachedChats[chatId]; 
        localStorage.setItem("chatCache", JSON.stringify(cachedChats));     

      }

      socket.on("user-removed", handleUserRemoved);

      const handleUserLeaved = (userId , updatedChat)=>{

        setChatList(chatListRef.current.map((chat)=>chat._id === updatedChat._id?updatedChat:chat));

      }

      socket.on("user-leaved", handleUserLeaved);

      const handleGroupRemoved =  (chatId , groupName)=>{
        setAlert({msg:`The admin of '${groupName}' has permanently deleted this group.`,type:"info"});
        if(selectedChatRef.current?._id === chatId)
          {
            setSelectedChat(null);
          }
          
        setTimeout(()=>{
          setAlert({msg:"",type:""});
        },3000)

        setChatList(chatListRef.current.filter((c)=>c._id !==chatId));

        const cachedChats = JSON.parse(localStorage.getItem("chatCache")) || {};
         delete cachedChats[chatId]; 
        localStorage.setItem("chatCache", JSON.stringify(cachedChats));     

      }

      socket.on("group-removed",handleGroupRemoved);

      const handleMessagesIndicate =async (message)=>{
      
        if(!chatListRef.current.some((chat)=> message.chatId === chat._id ))
        {
          try
          {
            const response = await API.post('/chat/add_chat',{userId:message.sender})
      if(response.status === 200)
      {
        setChatList((prev)=>[response.data.chat,...chatListRef.current])
      }
           
          }
          catch(error)
          {
              console.error("Error While receiving new chat",error.message);
          }          
        }
        
        setNewMessagesIncicate([...newMessagesIndicateRef.current,{newMessage:true, chatId:message.chatId}])

      }
      socket.on("receive-message",handleMessagesIndicate);

      const handleGroupUpdated =  (updatedChat)=>{
        if(!chatListRef.current.filter((chat)=>chat.isGroupChat).map((chat)=>chat._id).includes(updatedChat._id))
        {
          setChatList([updatedChat , ...chatListRef.current])
          return;
        }
        setChatList(chatListRef.current.map((chat)=>chat._id === updatedChat._id?updatedChat:chat))

      }

      socket.on("group-updated", handleGroupUpdated)

      const handleMemberRemoved =  (updatedChat)=>{
          setChatList(chatListRef.current.map((chat)=>chat._id.toString() === updatedChat._id.toString()?updatedChat:chat))
        
        }

      socket.on("member-removed",handleMemberRemoved)
     
    return ()=>{
     
        socket.off("online", handleOnline);
        socket.off("offline", handleOffline);
        socket.off("receive-message",handleMessagesIndicate);
        socket.off("user-removed", handleUserRemoved);
        socket.off("group-created",handleGroupCreated);
        socket.off("group-removed",handleGroupRemoved);
        socket.off("user-leaved",handleUserLeaved);
        socket.off("group-updated",handleGroupUpdated);
        socket.off("member-removed", handleMemberRemoved);
                
        if(!leaveForCallRef.current)
        {
          disconnectSocket();
          socketConnected.current = false
        }
      
    }
    }

  },[])
  
  useEffect(()=>{
    getChats()
  },[])
  

  return (
    <div className="chat-container">
      <ChatList setChatList={setChatList} newMessagesIndicate={newMessagesIndicate}  chatList={chatList} selectChat={selectChat} />
      <div className="chat-space">
        {selectedChat ? (
          <>
            <ChatHeader setLeaveForCall={setLeaveForCall} chatList={chatList} selectChat={selectChat}  setSelectedChat={setSelectedChat} setChatList={setChatList} chat={selectedChat} />
            <ChatMessages setChatList={setChatList} setNewMessagesIncicate={setNewMessagesIncicate} selectedChatIndicate={selectedChatIndicate}   selectedChat = {selectedChat} />
          </>
        ) : (
          <p className="no-chat-selected"><svg width="200" height="200" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 5.58 2 10C2 12.56 3.64 14.81 6.11 16.11L5 21L9.32 18.38C10.19 18.46 11.08 18.5 12 18.5C17.52 18.5 22 14.92 22 10C22 5.58 17.52 2 12 2ZM12 16.5C11.12 16.5 10.27 16.42 9.5 16.27L7.16 17.66L7.83 14.92C6.18 13.92 5 12.21 5 10C5 6.69 8.58 4 12 4C15.42 4 19 6.69 19 10C19 13.31 15.42 16 12 16.5ZM11 9H13V14H11V9ZM11 7H13V8H11V7Z" fill="#B0BEC5"/>
        </svg>
        
            Select or add a chat to start messaging</p>
        )}
      </div>
    </div>
  );
};

export default ChatApp;

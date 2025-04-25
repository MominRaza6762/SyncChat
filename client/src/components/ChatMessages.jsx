import {  useEffect, useRef, useState  } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { socket } from "../services/socket";
import CustomDocumentPreview from "./CustomDocumentPreview";
import { FileText } from "lucide-react";


export default function ChatMessages({setChatList , selectedChat , selectedChatIndicate , setNewMessagesIncicate  }) {
    const [newMessage, setNewMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading , setLoading] = useState(false);
    const [hasMore , setHasMore] = useState(true);
    const chatRef = useRef(null);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const messagesRef = useRef(messages);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const [activeMessageId, setActiveMessageId] = useState(null);
    const [activeDelMessageId, setActiveDelMessageId] = useState(null);
    const [media, setMedia] = useState(null);
    const [fileType, setFileType] = useState(""); 
    const [sendingMedia , setSendingMedia] = useState(false);
    const [recording, setRecording] = useState(false);
    const [audioURL, setAudioURL] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);


    const {user , setAlert} = useAuth();

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (!event.target.closest(".message-time")) {
          setActiveMessageId(null);
          setActiveDelMessageId(null);
        }
      };
  
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    useEffect(()=>{
      messagesRef.current = messages;

    },[messages])


    useEffect(()=>{
      const cachedChats = JSON.parse(localStorage.getItem("chatCache")) || {};
      if (!cachedChats[selectedChat._id] || selectedChatIndicate?.chatId === selectedChat._id && selectedChatIndicate?.newMessage ) 
      {
        fetchMessages();
        markAsSeen();
        setNewMessagesIncicate((prev)=>prev.filter((indicate)=>indicate.chatId!==selectedChat._id))

      } else {
        setMessages(cachedChats[selectedChat._id]);
      }
      setHasMore(true);
       setIsFirstLoad(true);
       if(window.innerWidth >= 768)
       {
         inputRef.current.focus();
       }

    },[selectedChat._id])

    useEffect(() => {
      if (selectedChatIndicate?.chatId === selectedChat._id && selectedChatIndicate?.newMessage || isFirstLoad && messages.length > 0) {
        requestAnimationFrame(() => {
          if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
          }
        });
        setIsFirstLoad(false); 
      }
    }, [messages, isFirstLoad]);

    const handleMediaSelect = (e) => {
      const file = e.target.files[0];
      if (file) {
        const mime = file.type;
        let maxSize = 0;

        if (mime.startsWith("image/")) {
          maxSize = 2 * 1024 * 1024; 
          setFileType("image");
        } else if (mime.startsWith("audio/")) {
          maxSize = 5 * 1024 * 1024; 
          setFileType("audio");
        } else if (mime.startsWith("video/")) {
          maxSize = 20 * 1024 * 1024; 
          setFileType("video");
        } else if (mime === "application/pdf" || mime.includes("word")) {
          maxSize = 10 * 1024 * 1024; 
          setFileType("document");
        } else {
          setAlert({msg:"Unsupported file type.",type:"error"});
          setMedia(null); 
          setTimeout(()=>{
            setAlert({msg:"",type:""});
          },2000)
          return;
        }
  
        if (file.size > maxSize) {
          setAlert({msg:`File size must be less than ${maxSize / 1024 / 1024}MB.`,type:"error"});
          setMedia(null); 
          setTimeout(()=>{
            setAlert({msg:"",type:""});
          },2000)
        } else {
          setMedia(file);
        }
        fileInputRef.current.value = "";
      }
    };

    const sendMediaMessage = async () => {
      if (!media) return setAlert({msg:"Media is not selected",type:"error"});

      try {
        setSendingMedia(true)
      const tempId = `temp-${Date.now()}`;
        const bTime =new Date();
        const time = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
      });

      setMessages([...messages , {_id:tempId , sender:{_id:user.id} ,sending:true , name:media.name, messageType: fileType, time: time , chatId:selectedChat._id }])
      requestAnimationFrame(() => {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      });

      setMedia(null)
  
      const formData = new FormData();
      formData.append("messageType", fileType);
      formData.append("media", media);
      formData.append("chatId", selectedChat._id); 
      formData.append("time", bTime);
      formData.append("sender", user.id);  
      
      
      setChatList((prev)=>{
        let index = prev.map((c)=>c._id).indexOf(selectedChat._id);
        if (index === -1) return prev;
        const newList = [...prev];
        const [found] = newList.splice(index, 1);
        newList.unshift(found); 
        return newList
      })
  
      
        const {data} = await API.post("/message/send_media", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        setMessages((prev)=>{
          return prev.map((msg)=>{
            return msg._id === tempId?{...data.newMessage , time:time}:msg;
          } 
        );
        })
      const cachedChats = JSON.parse(localStorage.getItem("chatCache")) || {};
        cachedChats[selectedChat._id] = [...cachedChats[selectedChat._id] ,{...data.newMessage , time:time} ]
        localStorage.setItem("chatCache", JSON.stringify(cachedChats));
        
      } catch (error) {
        console.error("Error sending message:", error);
      }finally{
        setSendingMedia(false)
      }
    };
  

    
    const deleteForMe = async(messageId)=>{
      try
      {
        setAlert({msg:"deleting...",type:"loading"})
        await API.patch('/message/delete_for_me',{messageId})
        setMessages((prev)=>prev.filter((msg)=>msg._id!==messageId))
        setAlert({msg:"message is deleted from you...",type:"success"});
        setActiveDelMessageId(null);
        const cachedChats = JSON.parse(localStorage.getItem("chatCache")) || {};
       const updatedChat = cachedChats[selectedChat._id]?.filter((msg)=>msg._id !== messageId);
       cachedChats[selectedChat._id] = updatedChat;
       localStorage.setItem("chatCache" , JSON.stringify(cachedChats))
       
      }
      catch(error)
      {
        setAlert({msg:"Error While deleting message",type:"error"})
          console.error("Error While deleting message",error.message);

      }finally{
        setTimeout(()=>{
          setAlert({msg:"",type:""})
        },1500)
      }
    }

    const deleteFromEveryone = async(message)=>{
      try
      {
        setAlert({msg:"deleting...",type:"loading"})
        const messageId = message._id;
        await API.patch('/message/delete_from_everyone',{messageId , chatId:selectedChat._id})
        setMessages((prev)=>prev.filter((msg)=>msg._id!==messageId))
        setAlert({msg:"message is deleted from every one...",type:"success"});
       
        setActiveDelMessageId(null);
        const cachedChats = JSON.parse(localStorage.getItem("chatCache")) || {};
       const updatedChat = cachedChats[selectedChat._id]?.filter((msg)=>msg._id !== messageId);
       cachedChats[selectedChat._id] = updatedChat;
       localStorage.setItem("chatCache" , JSON.stringify(cachedChats))
       
      }
      catch(error)
      {
        setAlert({msg:"Error While deleting message",type:"error"})
          console.error("Error While deleting message",error.message);
      }
      finally{
        setTimeout(()=>{
          setAlert({msg:"",type:""})
        },1500)
      }
    }

    const formatDate = (timestamp) => {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(date);
    };

    const getTimeDifference = (createdAt, seenAt) => {
      if (!seenAt) return "Not seen yet";
    
      const sentTime = new Date(createdAt);
      const seenTime = new Date(seenAt);
      const diffMs = seenTime - sentTime; 
    
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes === 0) return "Immediately";
      if (diffDays > 0) return `${diffDays} days after sent`;
      if (diffHours > 0) return `${diffHours} hours after sent`;
      return `${diffMinutes} minutes after sent`;
    };

    const fetchMessages = async (lastMessageId = null) => {
      setLoading(true);
      try {
       
        const { data } = await API.get("/message/get",{params:{chatId :selectedChat._id , lastMessageId}});
        const formattedMessages = data.messages.map((msg) => ({
          ...msg,
          time: new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        }));
  
        setMessages((prev) =>
          lastMessageId ?  [...formattedMessages.reverse(), ...prev] : formattedMessages.reverse()
        );
 
        setHasMore(data.messages.length === 30);

          
        const cachedChats = JSON.parse(localStorage.getItem("chatCache")) || {};
        if(!lastMessageId)  cachedChats[selectedChat._id] = formattedMessages;
       
        const chatIds = Object.keys(cachedChats);
        if (chatIds.length > 5) delete cachedChats[chatIds[0]]; 
        localStorage.setItem("chatCache", JSON.stringify(cachedChats));
      } catch (error) {
        console.error("Error loading messages:", error);
      }
      setLoading(false);
    };
  
    const handleScroll = () => {
      if (chatRef.current.scrollTop === 10 || (chatRef.current.scrollTop === 0 && hasMore)) {
        const lastMessageId = messages[0]?._id;
        if (lastMessageId) {
          const prevScrollHeight = chatRef.current.scrollHeight; 
          fetchMessages(lastMessageId).then(() => {
            requestAnimationFrame(() => {
              chatRef.current.scrollTop = chatRef.current.scrollHeight - prevScrollHeight; 
            });
          });
        }
      }
    };

    const sendMessage =async () => {
      if (newMessage.trim() === "") return;
      try
      {
        const tempId = `temp-${Date.now()}`;
        const bTime =new Date();
        const time = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
      });

      setMessages([...messages , {_id:tempId , sender:{_id:user.id} , message: newMessage, time: time , chatId:selectedChat._id }])
      requestAnimationFrame(() => {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }); 
      setNewMessage("");
      setChatList((prev)=>{
        let index = prev.map((c)=>c._id).indexOf(selectedChat._id);
        if (index === -1) return prev;
        const newList = [...prev];
        const [found] = newList.splice(index, 1);
        newList.unshift(found); 
        return newList
      })
      const {data} = await API.post('/message/send',{ sender: user.id, message: newMessage, time: bTime , chatId:selectedChat._id })


      setMessages((prev)=>{
        return prev.map((msg)=>{
          return msg._id === tempId?{...data.newMessage , time:time}:msg;
        } 
      );
      })
    const cachedChats = JSON.parse(localStorage.getItem("chatCache")) || {};
      cachedChats[selectedChat._id] = [...cachedChats[selectedChat._id] ,{...data.newMessage , time:time} ]
      localStorage.setItem("chatCache", JSON.stringify(cachedChats));
      

      }
      catch(error)
      {
          console.error("Error While sending message",error.message);
      }
      
    };

    const markAsSeen =async () => {
      try
      {
       const {data} =await API.post('/message/mark_as_seen',{ chatId:selectedChat._id });
       data.messages.map((msg)=>socket.emit('mark-as-seen',msg))
      }
      catch(error)
      {
          console.error("Error While marking messages",error.message);
      }
      
    };

   
useEffect(()=>{
   const handleReceive = (message) => {
    if(message.chatId === selectedChat._id)
      { 
        message.time =new Date(message.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        setMessages((prevMessages) => [...messagesRef.current, message]);
        const cachedChats = JSON.parse(localStorage.getItem("chatCache")) || {};
        cachedChats[selectedChat?._id] = [...cachedChats[selectedChat?._id] , message]
        localStorage.setItem("chatCache", JSON.stringify(cachedChats));
        
        setNewMessagesIncicate((prev)=>prev.filter((indicate)=>indicate.chatId!==selectedChat?._id))
        
        requestAnimationFrame(() => {
          if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
          }
        })
        setTimeout(()=>{
          socket.emit('mark-as-seen',message)
        },500)

}
    }
    socket.on("receive-message",handleReceive);

    const handleDelivered = (id)=>{
      setTimeout(()=>{
        setMessages(messagesRef.current.map((msg)=> msg._id === id?{...msg,delivered:true}:msg))
      },500)

    }
    
    socket.on("delivered-message",handleDelivered);

  
      
      return ()=>{
        socket.off("receive-message",handleReceive);
        socket.off("delivered-message",handleDelivered);
      }

},[selectedChat._id])

useEffect(()=>{
  const handleSeen = (id)=>{
    setTimeout(()=>{
      setMessages(messagesRef.current.map((msg)=> msg._id === id?{...msg,seen:true, seenAt:new Date()}:msg))
    },500)
  }
  
  socket.on("seen-message",handleSeen);

 
  socket.on("delete-from-everyone",(message)=>{
    setTimeout(() => {
      if(message.chatId === selectedChat._id)
        {
          setMessages((prev)=>prev.map((msg)=>msg._id === message._id?{
            _id:msg._id,
            deletedFromEveyOne:true
          }:msg)
          )
        }
    }, 500);    
  });

  return ()=>{
    socket.off("seen-message");
    socket.off("delete-from-everyone");

  }

},[messages])
let participant;
if(!selectedChat.isGroupChat)
{
   participant= selectedChat.participants.find((p)=>p._id!==user.id);

}

const extractFileName = (url)=> {
  const parts = url.split('/');
  const filenameWithExt = parts[parts.length - 1]; 

  const lastUnderscoreIndex = filenameWithExt.lastIndexOf('_');
  const dotIndex = filenameWithExt.lastIndexOf('.');

  if (lastUnderscoreIndex === -1 || dotIndex === -1) return filenameWithExt;

  const nameWithoutTimestamp = filenameWithExt.substring(0, lastUnderscoreIndex);
  const ext = filenameWithExt.substring(dotIndex);

  return nameWithoutTimestamp + ext;
}

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = event => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      setMedia(audioBlob);
      setFileType("audio")
    };

    mediaRecorderRef.current.start();
    setRecording(true);
    setAlert({msg:"",type:""}); 
  } catch (err) {
    console.error("Microphone permission denied or error occurred:", err);
    setAlert({msg:"Microphone access is required to record voice messages.",type:"error"});
  }
};
const stopRecording = () => {
  if (mediaRecorderRef.current) {
    mediaRecorderRef.current.stop();
    setRecording(false);
  }
};

    return (
      <>
        <div className="chat-messages"
        ref={chatRef}
        onScroll={handleScroll}
        >
          {loading && <p style={{textAlign:"center"}}>loading...</p>}
          {messages.length === 0?selectedChat.isGroupChat?<p style={{textAlign:"center"}}>"Say Hi 👋 and start chatting with everyone!"</p> :<p style={{textAlign:"center"}}>Say Hi 👋 and start the conversation with {participant.name}</p>: messages.map((msg) => (msg.deletedFromEveyOne?<p key={msg._id}>message is deleted from sender</p>
            :<div key={msg._id} className={`message ${msg.sender._id === user.id ? "sent" : "received"}`}
            onClick={(e) => {
              e.stopPropagation(); 
              setActiveDelMessageId(activeDelMessageId === msg._id ? null : msg._id);
            }}
            >
              <div className="message-info">
                <strong>{msg.sender._id === user.id ? "You" : msg.sender.name}</strong>
                {msg.messageType === "image"?msg.sending?<div className="sending-media-preview">
      <div  className="document-name">{msg.name}</div>
      <div className="loader"></div>
    </div>:<img
              src={msg.mediaUrl}
              alt="Preview"
            />:msg.messageType === "video"?msg.sending?<div className="sending-media-preview">
            <div  className="document-name">{msg.name}</div>
            <div className="loader"></div>
          </div>:<video controls src={msg.mediaUrl} />:msg.messageType === "audio"?msg.sending?<div className="sending-media-preview">
            <div  className="document-name">{msg.name}</div>
            <div className="loader"></div>
          </div>:<audio controls src={msg.mediaUrl} />:  msg.messageType === "document" ?msg.sending?<div className="sending-media-preview">
      <div  className="document-name">{msg.name}</div>
      <div className="loader"></div>
    </div>:
           <div className="document-preview" style={{marginRight:"0"}} 
           onClick={() => window.open(msg.mediaUrl, "_blank")}>
           <div  className="document-name">{extractFileName(msg.mediaUrl)}</div>
           <div  className="document-icon"><FileText  /></div>
         </div>:<p>{msg.message}</p>}
                
              </div>
                <span className="message-time"  onClick={(e) => {
            e.stopPropagation(); 
            setActiveMessageId(activeMessageId === msg._id ? null : msg._id);
          }}>{!selectedChat.isGroupChat?msg.sender._id === user.id?msg.seen?<img src="/svg/seen.svg" alt="seen" />:(msg.delivered === true?<img src="/svg/deliverd.svg" alt="deliverd" />:<img src="/svg/sended.svg" alt="sended" /> 
                ):null:null}{msg.time}</span>
                 { activeMessageId === msg._id && (
        <div className="tooltip">
          <p><strong>Sent:</strong> {formatDate(msg.createdAt)}</p>
          {!selectedChat.isGroupChat && msg.sender._id === user.id && <p><strong>Seen:</strong> {getTimeDifference(msg.createdAt,msg.seenAt)}</p>}
        </div>
      )}

{ activeDelMessageId === msg._id && (
          <div className="message-options">
            <button onClick={() => deleteForMe(activeDelMessageId)}>Delete from me</button>
            {msg.sender._id === user.id &&<button onClick={() => deleteFromEveryone(msg)}>Delete for Everyone</button>}
          </div>
        )}
       <div>
       </div>

            </div>
          ))}
      
        
        </div>
  
        <div className="chat-input">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) =>{
              setNewMessage(e.target.value)
              setMedia(null)
            } }
            ref={inputRef}
            onKeyDown={(e) => {
              if (e.key === "Enter" ) {
                sendMessage();
              }
            }}
          />
        <input
        type="file"
        onChange={(e)=>handleMediaSelect(e)}
        style={{ display: "none" }}
        ref={fileInputRef}
        accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      />
       {media && (
        <div className="media-div">
          <div>
          <p>Selected Media:</p>
          {fileType === "document"?null:<p>{media.name}</p> }
          </div>
          {fileType === "image" && (
            <img
              src={URL.createObjectURL(media)}
              alt="Preview"
              
            />
          )}
          {fileType === "audio" && <audio controls src={URL.createObjectURL(media)} />}
          {fileType === "video" && <video controls src={URL.createObjectURL(media)} />}
          {fileType === "document" && <CustomDocumentPreview file={media} />}
          <button onClick={sendMediaMessage}>Send Media</button>
        </div>
      )}

     
      <button style={sendingMedia?{cursor:"not-allowed"}:null} onClick={() =>!sendingMedia?fileInputRef.current.click():null}>📎 Media</button>
          {!newMessage?recording ? (
        <button onClick={stopRecording}>🛑 Stop</button>
      ) : (
        <button onClick={startRecording}>🎙️ Record</button>
      ):<button onClick={sendMessage}>Send</button>}
        </div>
      </>
    );
}

import { useEffect, useState } from "react";
import { socket } from "../services/socket";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ChatHeader({setLeaveForCall ,chat , setSelectedChat,  setChatList , chatList ,selectChat }) {
  const navigate = useNavigate();
  const [online , setOnline] = useState(false)
  const [lastSeen , setLasSeen] = useState()
  const [menuOpen, setMenuOpen] = useState(false);
  const {user , setAlert} = useAuth();
  const [showList, setShowList] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [groupName, setGroupName]= useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [showEditGroup, setShowEditGroup] = useState(false);

  const participant = chat.participants.find((p)=>p._id!==user.id);

  
  const members = chat.participants.filter((p) => p._id !== chat.groupAdmin?._id);


  const toggleParticipant = (user) => {
    setSelectedParticipants((prev) =>
      prev.some((p) => p._id === user._id)
        ? prev.filter((p) => p._id !== user._id)
        : [...prev, user]
    );
  };

  const handleUpdateGroup =async()=>{
    let isEmpity = true;
    const formData = new FormData();
    if(chat.groupName !== groupName)
      {
        formData.append('groupName',groupName)
        isEmpity = false;
      } 
        
    if(selectedParticipants.map((p)=>p._id).length !== 0)
      {
         formData.append("participants",JSON.stringify(selectedParticipants.map((p)=>p._id)))
         isEmpity = false;
        }
      if(image)
        {
          formData.append('profilePic',image);
          isEmpity = false;
        } 
        formData.append('chatId',chat._id);

        if(isEmpity)
        {
          return setShowEditGroup(false);
        }
        setAlert({ msg: "updating Group...", type: "loading" })
        try {
          const response = await API.patch("/chat/update_group",formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
          selectChat(response.data.chat);
          setShowEditGroup(false);
          setChatList((prev) =>prev.map((c)=>c._id !== chat._id?c:response.data.chat));
          setGroupName('');
          setImage(null);
          setPreview(null);
          setSelectedParticipants([]);
          setAlert({ msg: "", type: "" });
        } catch (error) {
          setAlert({ msg: error.message, type: "error" });
          setTimeout(()=>{
            setAlert({ msg: "", type: "" });
          },5000)
          console.error("Error whule updating group", error.message);
        }
    
    
  }

  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      if (!file.type.startsWith("image/")) {
        setAlert({msg:"Only image files are allowed.", type:"error"});
        return;
      }

      if (file.size > 1024 * 1024) {
        setAlert({msg:"Image must be less than 1MB.", type:"error"});
        return;
      }
      setAlert({msg:"", type:""});  
      setImage(file);
      setPreview(URL.createObjectURL(file)); 
    }
  };


  const handleRemoveUser = async(participantId)=>{

    try
    {
      setAlert({msg:"Removing participant from group", type:"loading"})    
     const {data} =await API.patch('/chat/remove_participant',{chatId:chat._id,participantId})
     selectChat(data.chat)
     setChatList((prev)=>prev.map((chat)=>data.chat._id === chat._id?data.chat:chat))
     setAlert({msg:"", type:""})    
    }
    catch(error)
    {
      setAlert({msg:"Error While Removing participant", type:"error"})    
        console.error("Error While Removing participant",error.message);
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".status-text")) {
        setShowList(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".header-avatar")) {
        setShowImage(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  
  
  useEffect(()=>{
    const handleUserLeave = (userId , updatedChat)=>{
      if(updatedChat._id === chat._id)
      {
        const leavedUser = chat.participants.find((participant)=>participant._id === userId);
        setAlert({msg:`${leavedUser.name} leaved this Group chat`, type:"info"});
        setTimeout(()=>{
          setAlert({msg:"", type:""});
        },1500)
        selectChat(updatedChat)

      }
    }
    socket.on("user-leaved", handleUserLeave)
    
    const handleGroupUpdate =(updatedChat)=>{
      if(chat._id === updatedChat._id)
      {
        if(chat.groupName !== updatedChat.groupName)
        {
          setAlert({msg:`admin change the name of group from "${chat.groupName}" to "${updatedChat.groupName}"`, type:"info"})
          setTimeout(()=>{
            setAlert({msg:"",type:""})
          },1000)
        }

        if(chat.profilePic !== updatedChat.profilePic)
          {
            setAlert({msg:`admin change the profile Picture of group`, type:"info"})
            setTimeout(()=>{
              setAlert({msg:"",type:""})
            },700)
          }
          const newParticipants = updatedChat.participants.filter((p)=>!chat.participants.map((c)=>c._id).includes(p._id))
          if(newParticipants.length > 0)
          {
            setAlert({msg:`admin add some new prticipants`, type:"info"})
            setTimeout(()=>{
              setAlert({msg:"",type:""})
            },700)

          }

          
        selectChat(updatedChat);

      }

    }
    socket.on("group-updated",  handleGroupUpdate)

    const handleMemberRemoved =(updatedChat)=>{
      if(updatedChat._id === chat._id)
      {
        setChatList((prev)=>prev.map((chatt)=>chatt._id.toString() === updatedChat._id.toString()?updatedChat:chatt))
        selectChat(updatedChat)

      }
      }

    socket.on("member-removed", handleMemberRemoved)

    if(!chat.isGroupChat)
    {
      setOnline(participant.online);
    setLasSeen(participant.lastSeen)
    var on = (userId)=>{
      userId === participant._id?setOnline(true):null;
    }
    socket.on('online',on)

    var off = (userId)=>{
      userId === participant._id? setOnline(()=>{
        setLasSeen(new Date());
        return false
      }):null;
    }
    socket.on('offline',off)

  }
    return ()=>{
      socket.off('online', on);
      socket.off('offline', off);
      socket.off("user-leaved", handleUserLeave);
      socket.off("group-updated",handleGroupUpdate)
      socket.off("member-removed",handleMemberRemoved)
    }

  },[chat])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".menu-container")) {
        setMenuOpen(false)
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
  
  const formatLastSeen = (timestamp) => {
    if (!timestamp) return "Last seen unavailable";
  
    const lastSeenTime = new Date(timestamp);
    const now = new Date();
  
    const options = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
  
    const formattedTime = new Intl.DateTimeFormat("en-US", options).format(lastSeenTime);
  
    const diffMs = now - lastSeenTime;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
    if (diffDays === 0) return `Last seen today at ${formattedTime}`;
    if (diffDays === 1) return `Last seen yesterday at ${formattedTime}`;
  
    const dateOptions = { day: "2-digit", month: "short" };
    const formattedDate = new Intl.DateTimeFormat("en-US", dateOptions).format(lastSeenTime);
  
    return `Last seen on ${formattedDate} at ${formattedTime}`;
  };

  const deleteChat = async()=>{
    try
    {
     await API.patch('/chat/delete_chat',{chatId:chat._id})
     setChatList((prev)=>prev.filter((c)=>c._id!==chat._id));
     setSelectedChat(null);
     const cachedChats = JSON.parse(localStorage.getItem("chatCache")) || {};
         delete cachedChats[chat._id]; 
        localStorage.setItem("chatCache", JSON.stringify(cachedChats));     
    }
    catch(error)
    {
        console.error("Error While deleting chat",error.message);
    }
  }

  const openChat = async(member)=>{
    if(!chatList.find((chat)=>!chat.isGroupChat && chat.participants.some((p)=>p._id === member._id)))
    {
      try
    {
      
      const response = await API.post('/chat/add_chat',{userId:member._id})
      if(response.status === 201)
        {
        setChatList((prev)=>[response.data.chat,...prev])
      }
      else if(response.status === 200)
      {
        if(!chatList.some((chat)=>chat._id === response.data.chat._id))
        {
          setChatList((prev)=>[response.data.chat,...prev])
        }
      }
      selectChat(response.data.chat);

    }
    catch(error)
    {
        console.error("Error While Creating chat with this user",error.message);
    }

    }
    else
    {
      selectChat(chatList.find((chat)=>!chat.isGroupChat && chat.participants.some((p)=>p._id === member._id)))
    }
  }

  const deletePermanently = async()=>{
    try
    {
      setAlert({msg:"Deleting Group Premanently...",type:"loading"});
     await API.delete('/chat/delete_permanently',{data:{
      chatId:chat._id
     }})
     setChatList((prev)=>prev.filter((c)=>c._id!==chat._id));
     setSelectedChat(null);
     const cachedChats = JSON.parse(localStorage.getItem("chatCache")) || {};
         delete cachedChats[chat._id]; 
        localStorage.setItem("chatCache", JSON.stringify(cachedChats));     
        setAlert({msg:"Group has been permanently deleted successfully",type:"success"});
    }
    catch(error)
    {
      setAlert({msg:"Error While Deleting Group Premanently...",type:"error"});
        console.error("Error While Deleting Group Premanently",error.message);
    }finally{
      setTimeout(()=>{
        setAlert({msg:"",type:""});
      },1500)
    }
  }

  const leaveChat = async()=>{

    try
    {
      setAlert({msg:"Exiting group and Deleting chat...",type :"loading" })
     await API.patch('/chat/leave_chat',{chatId:chat._id})
     setChatList((prev)=>prev.filter((c)=>c._id!==chat._id));
     setSelectedChat(null);
     const cachedChats = JSON.parse(localStorage.getItem("chatCache")) || {};
         delete cachedChats[chat._id]; 
        localStorage.setItem("chatCache", JSON.stringify(cachedChats));     
        setAlert({msg:"",type :"" })
    }
    catch(error)
    {
        console.error("Error While deleting chat",error.message);
    }
   
  }
  const handleEditGroup = ()=>{
    setGroupName(chat.groupName);
    setPreview(chat.profilePic)
    setShowEditGroup(true)
  }

    return (<>
        <div className="chat-header">
          
          {chat.isGroupChat?<>
          
          {showImage && <img src={chat.profilePic?chat.profilePic:'/svg/pgroup.svg'} alt="group profile" className="profile-box" />}
            {chat.profilePic?<img onClick={()=>setShowImage(true)} src={chat.profilePic} alt="group profile" className="header-avatar" />:<img onClick={()=>setShowImage(true)} src='/svg/pgroup.svg' alt="group profile" className="header-avatar" />}
          <div className="header-text-details">
            <h3>{chat.groupName}</h3>
            {chat.participants.map((p, index)=>{
              return <span key={p._id}  onClick={() => setShowList(!showList)}
              style={{ cursor: "pointer" }} className="status-text" >
             {p.name}{index !== chat.participants.length - 1 ? ", " : ""} 
              </span>
            })}

{showList && (
        <div className="members-list">
          <h4>Group Participants</h4>
          <ul>
              <li className="admin">
                <img className="user-profile" src={chat.groupAdmin.profilePic} alt="admin profile" />
                {chat.groupAdmin.name} <span className="admin-badge">👑 Admin</span>
              </li>
        
            {members.map((member) => (
              <li key={member._id} onClick={()=>openChat(member)}><img className="user-profile" src={member.profilePic} alt="member profile"  /> {member.name} {chat.groupAdmin._id === user.id?<img src="/svg/removeuser.svg" alt="remove user" className="remove-user" onClick={(e)=>{
                e.stopPropagation();
                handleRemoveUser(member._id)
              }} />:null}</li>
            ))}
          </ul>
        </div>
      )}
            
          </div>
          </>:<>
          {showImage && <img src={participant.profilePic} alt={participant.name} className="profile-box" />}
            <img src={participant.profilePic} alt={participant.name} onClick={()=>setShowImage(true)} className="header-avatar" />
          <div>
            <h3 >{participant.name}</h3>
            <span className={`status-text ${online ? "online" :null}`}>
              {online ? "Online" : formatLastSeen(lastSeen)}
            </span>
          </div>
          </>
          }
          
          <div className="menu-container" >
            {chat.isGroupChat?null:<>
              <img src="/svg/voicecall.svg"  onClick={() =>{
                setLeaveForCall(true);
               navigate(`/audio_call/`, { replace: true , state:{participant} })
              }} alt="audio call" style={{cursor:"pointer",  width:"22px"}} />
              <img  onClick={() =>{
                setLeaveForCall(true);
               navigate(`/video_call/`, { replace: true ,state:{participant} })
              }} src="/svg/videocall.svg"  alt="video call" style={{cursor:"pointer" ,width:"27px"}} /></>}
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)}>
          ⋮
        </button>

        {menuOpen && (
          <div className="dropdown-menu">
            {chat.groupAdmin?._id === user.id && <button onClick={handleEditGroup} >
              Edit Group
              </button>}

            <button onClick={chat.isGroupChat?chat.groupAdmin?._id === user.id?deletePermanently:leaveChat:deleteChat}>{chat.isGroupChat?chat.groupAdmin._id === user.id?"Permanently Delete Group":"Exit Group & Delete this Chat":"Delete This Chat"}</button>
          </div>
        )}
      </div>
      </div>

      {showEditGroup && <div className="modal">
      <div className="modal-content">
      <button className="close-btn" onClick={() =>{
        setShowEditGroup(false);
        setImage(null);
        setSelectedParticipants([]);
      } }>✖</button>
      <div className="create-group " >
                <h3>Edit Group</h3>
                <h2 style={{margin:"0", textAlign:"center"}}>Profile</h2>
          <label className="image-upload" style={{margin:"0.3rem auto", width:"70px" , height:"70px"}}>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {preview ? <img src={preview} alt="Preview" className="preview-image" /> : <span>+</span>}
          </label>
                <input
                  type="text"
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <h4>Add Participants</h4>
                <div className="participants-list" >
                  {chatList.map((chatfromList) => {
                     if (chatfromList.isGroupChat) return null; 

                     const participant = chatfromList.participants.find(
                       (p) =>
                         p._id.toString() !== user.id.toString() &&
                         !members.map((m) => m._id).includes(p._id)
                     );
                     if (!participant) return null; 
                      return <div key={chatfromList?._id}  className="user-item" onClick={() => toggleParticipant(participant)}>
                      <img src={participant?.profilePic} alt={participant?.name} className="avatar" />
                      <p>{participant?.name}</p>
                    </div>
                    
})}
                </div>

                <h4>Selected Participants</h4>
                <div className="selected-participants">
                  {selectedParticipants.map((user) => (
                    <div key={user?._id}  className="participant">
                      <img src={user?.profilePic} alt={user?.name} className="avatar" />
                      <p>{user?.name}</p>
                    </div>
                  ))}
                </div>

                <button onClick={handleUpdateGroup} >
                  Update Group 
                </button>
              </div>
              </div>
              </div>}

        
      </>);
}

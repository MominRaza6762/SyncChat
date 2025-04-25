import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

export default function ChatList({ chatList, selectChat ,setChatList , newMessagesIndicate }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [foundedUser , setFoundedUser] = useState(false);
  const {user,setUser ,setAlert} = useAuth();
  const [showOptions, setShowOptions] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleLogout =async()=>{
    try {
      setAlert({msg:"Logging you out...", type:"loading"});
      await API.delete("/auth/log_out");
      setUser({auth:false})
       localStorage.removeItem("user"); 
       localStorage.removeItem("chatCache"); 

    } catch (error) {
      setAlert({msg:"error while logging out", type:"error"});
      console.error(error);
    }finally{
      setTimeout(()=>{
        setAlert({msg:"",type:""})
      },2000)
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
  

  const handleSelect = async()=>{
    try
    {
      
      const response = await API.post('/chat/add_chat',{userId:foundedUser._id})
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
    }finally{
      setFoundedUser(false);
      setModalType(null);
    }
  }

  const handleSearch = async() => {
    if(!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(searchQuery))
    {
      setAlert({msg:"Enter valid email.",type:"error"})
      setTimeout(()=>{
        setAlert({msg:"",type:""})
      },1500)
      return;
    }
    try
    {
      setAlert({msg:"Finding a user with the provided email address...",type:"loading"})
     const response = await API.get('/chat/add_user',{params:{emailId:searchQuery}})
      setFoundedUser(response.data.user)
      setSearchQuery('');
      setAlert({msg:"",type:""})
    }
    catch(error)
    {
      if(error.response.status === 400)
      {
        setAlert({msg:error.response.data.message,type:"error"})
      }
     else if(error.response.status === 404)
        {
          setAlert({msg:error.response.data.message+' with '+searchQuery,type:"error"})
        }
        else
        {setAlert({msg:"Error while finding a user with the provided email address",type:"error"})
          console.error("Error while finding a user with the provided email address",error.message);

        }
        setSearchQuery('');
    }
   
  };
  
  const toggleParticipant = (user) => {
    setSelectedParticipants((prev) =>
      prev.some((p) => p._id === user._id)
        ? prev.filter((p) => p._id !== user._id)
        : [...prev, user]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length < 1) {
      setAlert({ msg: "Group name required & at least 2 participants", type: "error" });
      return;
    }
    setAlert({msg:"Creating Group",type:"loading"});
    const participants = selectedParticipants.map((p) => p._id)
    const formData = new FormData();
    formData.append("groupName", groupName);
    formData.append("participants", JSON.stringify(participants) );
    formData.append("profilePic", image);

    try {
      const response = await API.post("/chat/create_group",formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setAlert({ msg: "", type: "" });
      selectChat(response.data.group);
      setChatList((prev) => [response.data.group, ...prev]);
      setModalType(null);
      setGroupName('');
      setImage(null);
      setPreview(null);
      setSelectedParticipants([]);
    } catch (error) {
      setAlert({ msg: error.message, type: "error" });
      setTimeout(()=>{
        setAlert({ msg: "", type: "" });
      },5000)
      
      console.error("Error creating group", error.message);
    }
  };

 
  return (
    <div className="chat-list">
       
      <h2>Chats</h2>
      {chatList.map((chat) => {
        if(chat.isGroupChat)
        {
          return <div key={chat._id} className="chat-item" onClick={() => selectChat(chat)}>
          <div className="avatar-wrapper">
          {chat.profilePic?<img src={chat.profilePic} alt="group profile" className="avatar" />:<img src='/svg/pgroup.svg' alt="group profile" className="avatar" />}
  
  { newMessagesIndicate.some((msg)=>msg.chatId === chat._id)  && (
    <svg className="new-msg-badge" width="12" height="12" viewBox="0 0 24 24" fill="red">
      <circle cx="12" cy="12" r="10" />
    </svg>
  )}
</div>
        <p>{chat.groupName}</p>
      </div>
        }
        else
        {
          const participant = chat.participants.find((p)=>p._id.toString() !==user.id.toString())
          return <div key={chat._id} className="chat-item" onClick={() => selectChat(chat)}>
          <div className="avatar-wrapper">
  <img src={participant.profilePic} alt={participant.name} className="avatar" />
  { newMessagesIndicate.some((msg)=>msg.chatId === chat._id)  && (
    <svg className="new-msg-badge" width="12" height="12" viewBox="0 0 24 24" fill="red">
      <circle cx="12" cy="12" r="10" />
    </svg>
  )}
</div>
        <p>{participant.name}</p>
      </div>
        }
        
})}

<button className="floating-btn" onClick={() => setShowOptions(!showOptions)}>
        ➕
      </button>
      <button onClick={handleLogout} className="logout-btn"  >
            <img src="/svg/logout.svg" alt="logout" />
          </button>

      {showOptions && (
        <div className="popup-buttons">
          <button className="icon-btn" onClick={() => setModalType("createGroup")} title="Create Group">
            <img src="/svg/group.svg" alt="Create Group" />
          </button>
          <button className="icon-btn" onClick={() => setModalType("addChat")} title="Add Chat">
            <img src="/svg/adduser.svg" alt="Add Chat" />
          </button>
          
        </div>
      )}

{modalType && (
        <div className="modal">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setModalType(null)}>✖</button>

            {modalType === "addChat" && (
              <div className="add-chat">
                <h3>Add Chat</h3>
                <input
                  type="text"
                  placeholder="Enter email to add user"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button onClick={handleSearch}>Search</button>
                {foundedUser && (
                  <div className="search-item" onClick={handleSelect}>
                    <img src={foundedUser.profilePic} alt="user profile" className="avatar" />
                    <p>{foundedUser.email}</p>
                  </div>
                )}
              </div>
            )}

            {modalType === "createGroup" && (
              <div className="create-group">
                <h3>Create Group</h3>
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
                <h4>Select Participants</h4>
                <div className="participants-list">
                  {chatList.map((chat) => {
                    if(!chat.isGroupChat){
                      const participant = chat.participants.find((p)=>p._id.toString() !==user.id.toString()) 
                      return <div key={chat._id} className="user-item" onClick={() => toggleParticipant(participant)}>
                      <img src={participant.profilePic} alt={participant.name} className="avatar" />
                      <p>{participant.name}</p>
                    </div>

                    }
                    
})}
                </div>

                <h4>Selected Participants</h4>
                <div className="selected-participants">
                  {selectedParticipants.map((user) => (
                    <div key={user._id} className="participant">
                      <img src={user.profilePic} alt={user.name} className="avatar" />
                      <p>{user.name}</p>
                    </div>
                  ))}
                </div>

                <button onClick={handleCreateGroup} >
                  Create Group
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

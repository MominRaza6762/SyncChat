import User from "../models/User.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import {activeUsers , io} from "../utils/socket.js"
import cloudinary from "../config/cloudinary.js";
import {sendNotification} from "../utils/sendnotifications.js"

export const addUser = async (req , res)=>{
    try
    {
        const {emailId} = req.query;
        if(!emailId) return;
        
        const user = await User.findOne({  email: new RegExp(emailId, "i"), name: { $exists: true, $ne: null }}).select("_id email name profilePic ")
        if(!user)
            {
                return res.status(404).json({
                    message: "No user found " ,
                    success: false
                })
            } 
            if(user.email === req.user.email)
            {
                return res.status(400).json({
                    message: "You cannot add yourself" ,
                    success: false
                })

            }

            res.status(200).json({
                message: "User found " ,
                success: true,
                user: user
            })     
    }
    catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            message: "Internal Server Error: " + error.message,
            success: false
        });
    }

}

export const addChat = async(req , res)=>{
    try
    {
        const self = req.user.id;
        const otherUser = req.body.userId;

        if(!self && !otherUser) return;

        const existingChat = await Chat.findOne({
            participants: { $all: [self, otherUser], $size: 2 } 
        }).populate("participants groupAdmin" , "_id email name profilePic online lastSeen ").select("_id isGroupChat participants groupName groupAdmin profilePic");

        if (existingChat) {
            await Chat.findByIdAndUpdate(existingChat._id, { $set: { deletedBy: [] } });


            return res.status(200).json({
                success: true,
                message: "Chat already exists.",
                chat: existingChat
            });
        }
        const newChat = new Chat({
            participants: [self, otherUser]
        })
        await newChat.save();
        
        let chat = await Chat.findOne(newChat._id).populate("participants" , "_id email name profilePic online lastSeen").select("_id isGroupChat participants profilePic");

        res.status(201).json({
            success: true,
            message: "New Chat created",
            chat: chat
        });

     
    }
    catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            message: "Internal Server Error: " + error.message,
            success: false
        });
    }

}


export const getChats = async(req , res)=>{
    try
    {
        if(!req.user.id) return ;
        
        const list = await Chat.find({participants:req.user.id  , deletedBy:{$nin:[req.user.id]}}).populate("participants groupAdmin" , "_id email name profilePic online lastSeen ").select("_id isGroupChat participants groupName groupAdmin profilePic").sort({createdAt:-1});

        
        res.status(200).json({success:true ,chatList :list});
     
    }
    catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            message: "Internal Server Error: " + error.message,
            success: false
        });
    }
}

export const deleteChat = async(req , res)=>{
    try
    {
        const {chatId } = req.body;

        if(!chatId) return;

       
        await Message.updateMany(
            { chatId: chatId },  
            { $addToSet: { deletedBy: req.user.id } }
        );

        await Chat.findByIdAndUpdate(chatId, 
                    { $push: { deletedBy: req.user.id} }
                  );
              
      

        res.status(200).json({
            message: "Chat deleted from you successfully..." ,
            success: true,
        });

     
    }
    catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            message: "Internal Server Error: " + error.message,
            success: false
        });
    }
}

export const createGroup = async(req , res)=>{
    try
    {
        var { groupName, participants  } = req.body;
        if(!groupName && ! participants) return;
        participants = JSON.parse(participants); 

        const updatedParticipants = [...participants , req.user.id];
        if (!groupName || updatedParticipants.length < 2) {
            return res.status(400).json({ message: "At least 2 participants required for a group", success: false });
        }
        const newGroupChat = new Chat({
            isGroupChat: true,
            groupName,
            participants:updatedParticipants,
            groupAdmin: req.user.id,
            profilePic:req.file?req.file.path:null,
            profilePicPublicId :req.file? req.file.filename:null,
        });

        await newGroupChat.save();

        let chat = await Chat.findOne(newGroupChat._id).populate("participants groupAdmin" , "_id email name profilePic online lastSeen fcmToken").select("_id isGroupChat participants groupName groupAdmin profilePic");

        chat.participants.forEach(async(participant)=>{
            if (participant._id.toString() !== req.user.id.toString())
            {
                if(participant.fcmToken)
                {
                    await sendNotification(participant.fcmToken, `You were added in a Group Chat `, chat.groupName);
                }

                const userSocketId = activeUsers[participant._id.toString()] ;
                if (userSocketId) {
                    io.to(userSocketId).emit("group-created", chat);
                }
            }
        })

        res.status(201).json({
            message: "Group chat created successfully!",
            success: true,
            group: chat
        });

     
    }
    catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            message: "Internal Server Error: " + error.message,
            success: false
        });
    }
}

export const removeParticipant = async(req , res)=>{
    try
    {
        const {chatId , participantId } = req.body;

        if(!chatId || !participantId) return;

        const chat = await Chat.findById(chatId);
        if(!chat) return;

        if(chat.groupAdmin.toString() !== req.user.id.toString())
        {
            return res.status(401).json({success: false , message:"Access denied." });
        }
        
        chat.participants = chat.participants.filter((p)=>p.toString()!==participantId.toString());
        if (!chat.deletedBy.includes(participantId)) {
            chat.deletedBy.push(participantId);
        }


        await chat.save();

        await Message.updateMany(
            { chatId: chatId },  
            { $addToSet: { deletedBy: participantId } }
        );


        const userSocketId = activeUsers[participantId] || null;
                            if (userSocketId) {
                                io.to(userSocketId).emit("user-removed", chat._id , chat.groupName);
                            }

        const updatedChat = await Chat.findById(chatId).populate("participants groupAdmin" , "_id email name profilePic online lastSeen ").select("_id isGroupChat participants groupName groupAdmin profilePic");
      
        updatedChat.participants.forEach((participant)=>{
        if(participant._id.toString() !== req.user.id.toString())
        {
            const userSocketId = activeUsers[participant._id.toString()] ;
                            if (userSocketId) {
                                io.to(userSocketId).emit("member-removed", updatedChat);
                            }
        }
       })
        res.status(200).json({
            message: "Participant Removed successfully..." ,
            success: true,
            chat:updatedChat
        });

     
    }
    catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            message: "Internal Server Error: " + error.message,
            success: false
        });
    }
}

export const deletePermanently = async(req , res)=>{
    try
    {
        const {chatId } = req.body;

        if(!chatId ) return;

        const chat = await Chat.findById(chatId);
        if(!chat) return;

        if(chat.groupAdmin.toString() !== req.user.id.toString())
        {
            return res.status(401).json({success: false , message:"Access denied." });
        }

        if (chat.profilePicPublicId) {
            await cloudinary.uploader.destroy(chat.profilePicPublicId, (error, result) => {
                if (error) {
                    console.error("Error deleting image from Cloudinary:", error);
                } else {
                    console.log("Image deleted from Cloudinary:", result);
                }
            });
        }
        
        const participants = chat.participants.filter((p)=>p.toString() !== req.user.id.toString());

        const messages = await Message.find({ chatId: chatId , messageType:{$ne:"text"} } );

        messages.forEach(async(msg)=>{
            if(msg.mediaPublicId)
                {
                    let resourceType;
                    if(msg.messageType === "image") resourceType ="image";
                    if(msg.messageType === "video" || msg.messageType === "audio" ) resourceType ="video";
                    if(msg.messageType === "document") resourceType ="raw";
                    await cloudinary.uploader.destroy(msg.mediaPublicId,  {resource_type: resourceType}, (error, result) => {
                                    if (error) {
                                        console.error("Error deleting image from Cloudinary:", error);
                                    } else {
                                        console.log("Image deleted from Cloudinary:", result);
                                    }
                                });
        
                }
        })
        
        await Message.deleteMany({ chatId: chatId } );
        await Chat.findByIdAndDelete(chatId)

        participants.forEach((participant)=>{
            const userSocketId = activeUsers[participant.toString()];
                            if (userSocketId) {
                                io.to(userSocketId).emit("group-removed", chat._id , chat.groupName);
                            }
        })
        

       
        res.status(200).json({
            message: "Group Deleted Permanently successfully..." ,
            success: true,
        });

     
    }
    catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            message: "Internal Server Error: " + error.message,
            success: false
        });
    }
}

export const leaveChat = async(req , res)=>{
    try
    {
        const {chatId  } = req.body;

        if(!chatId) return;

        const chat = await Chat.findById(chatId);
        if(!chat) return;

         
        chat.participants = chat.participants.filter((p)=>p.toString() !== req.user.id.toString());
        if (!chat.deletedBy.includes(req.user.id)) {
            chat.deletedBy.push(req.user.id);
        }
        const participants = chat.participants;

        await chat.save();

        await Message.updateMany(
            { chatId: chatId },  
            { $addToSet: { deletedBy: req.user.id } }
        );

        const updatedChat = await Chat.findById(chatId).populate("participants groupAdmin" , "_id email name profilePic online lastSeen ").select("_id isGroupChat participants groupName groupAdmin profilePic");


        participants.forEach((participant)=>{
            const userSocketId = activeUsers[participant.toString()] ;
                            if (userSocketId) {
                                io.to(userSocketId).emit("user-leaved", req.user.id , updatedChat);
                            }
        })

        
        res.status(200).json({
            message: "Chat Leaved successfully..." ,
            success: true,
        });

     
    }
    catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            message: "Internal Server Error: " + error.message,
            success: false
        });
    }
}

export const updateGroup = async(req , res)=>{
    try
    {
        const {chatId ,groupName , participants } = req.body;

        if(!chatId) return;

        const chat = await Chat.findById(chatId);

        if(!chat) return;

        if(chat.groupAdmin.toString() !== req.user.id.toString())
            {
                return res.status(401).json({success: false , message:"Access denied." });
            }

        if(req.file)
        {
            if (chat.profilePicPublicId) 
            {
                await cloudinary.uploader.destroy(chat.profilePicPublicId, (error, result) => {
                    if (error) {
                        console.error("Error deleting image from Cloudinary:", error);
                    } else {
                        console.log("Image deleted from Cloudinary:", result);
                    }
                });
            }
                chat.profilePic = req.file.path;
                chat.profilePicPublicId = req.file.filename;
        }
        let parsedParticipants;
        if(participants) parsedParticipants = JSON.parse(participants)
        
        if(groupName) chat.groupName = groupName;
        if(participants)
        {
            if(parsedParticipants.length > 0)
                {
                    chat.participants.push(...parsedParticipants);
                    chat.deletedBy = chat.deletedBy.filter(
                        (userId) => !parsedParticipants.includes(userId.toString())
                      );
                }
        }

            await chat.save();

        const updatedChat = await Chat.findById(chatId).populate("participants groupAdmin" , "_id email name profilePic online lastSeen fcmToken").select("_id isGroupChat participants groupName groupAdmin profilePic");

        if(parsedParticipants?.length > 0)
        {
            const newParticipants = updatedChat.participants.filter((p)=>parsedParticipants.includes(p._id.toString()) && p._id.toString() !== req.user.id);
            
            newParticipants.forEach(async(p)=>{
                if(p.fcmToken)
                    {
                        await sendNotification(p.fcmToken, `You were added in a Group Chat `, updatedChat.groupName);
                    }
                })
            }
        
        updatedChat.participants.forEach((participant)=>{
            if(participant._id.toString() !== req.user.id.toString())
            {
                const userSocketId = activeUsers[participant._id.toString()] ;
                if (userSocketId) {
                    io.to(userSocketId).emit("group-updated",  updatedChat);
                }
            }
        })


        res.status(200).json({
            message: "Chat Leaved successfully..." ,
            success: true,
            chat:updatedChat
        });

     
        }
    catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            message: "Internal Server Error: " + error.message,
            success: false
        });
    }

}
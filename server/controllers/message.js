import Message from "../models/Message.js";
import Chat from "../models/Chat.js"
import {activeUsers , io} from "../utils/socket.js"
import cloudinary from "../config/cloudinary.js";
import {sendNotification} from "../utils/sendnotifications.js"

export const sendMediaMessage = async(req , res)=>{
    try
    {
        const { sender, messageType , time, chatId} = req.body;


        if(!sender && !messageType && !time && !chatId ) return;

        const chat = await Chat.findById(chatId).populate("participants");

        if (!chat) {
            return res.status(404).json({ message: "Chat not found", success: false });
        }

        let newMessage = new Message({
            chatId:chatId,
            sender:sender,
            messageType:messageType,
            createdAt:time,
            mediaUrl:req.file.path,
            mediaPublicId:req.file.filename
        })
        
        await newMessage.save();

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



        newMessage = await Message.findById(newMessage._id).populate("sender" , "_id email name profilePic online lastSeen ");
        
     
        let body = `${newMessage.messageType === "image"?"Image":newMessage.messageType === "video"?"Video":newMessage.messageType === "audio"?"Audio":newMessage.messageType === "document"?"Document":null} - ${extractFileName(newMessage.mediaUrl)}`
        

        if (chat.isGroupChat) {
            chat.participants.forEach(async user => {
                if (user._id.toString() !== sender) {
                    if(user.fcmToken)
                        {

                            await sendNotification(user.fcmToken, `New Media Message from "${newMessage.sender.name}" in Group Chat "${chat.groupName}"`, body);
                        }

                    const receiverSocketId = activeUsers[user._id.toString()] ;
                    if (receiverSocketId) {

                        io.to(receiverSocketId).emit("receive-message", newMessage);
                        newMessage = await Message.findByIdAndUpdate(newMessage._id, { delivered: true }, { new: true }).populate("sender" , "_id email name profilePic online lastSeen ");
                    }
                }
            });
        } else {
            const user = chat.participants.find(user => user._id.toString() !== sender)
            if(user.fcmToken)
                {
                    await sendNotification(user.fcmToken, `New Media Message from "${newMessage.sender.name}"`, body);
                }
            const receiverSocketId = activeUsers[user._id.toString()] ;
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("receive-message", newMessage);
                newMessage = await Message.findByIdAndUpdate(newMessage._id, { delivered: true }, { new: true }).populate("sender" , "_id email name profilePic online lastSeen ");
            }
        }
        
        res.status(201).json({
            message: "Message Sent successfully..." ,
            success: true,
            newMessage
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

export const sendMessage = async(req , res)=>{
    try
    {
        const { sender, message, time, chatId} = req.body;


        if(!sender && !message && !time && !chatId ) return;

        const chat = await Chat.findById(chatId).populate("participants");

        if (!chat) {
            return res.status(404).json({ message: "Chat not found", success: false });
        }

        let newMessage = new Message({
            chatId:chatId,
            sender:sender,
            message:message,
            createdAt:time
        })
        
        await newMessage.save();

        newMessage = await Message.findById(newMessage._id).populate("sender" , "_id email name profilePic online lastSeen ");

        if (chat.isGroupChat) {
            chat.participants.forEach(async user => {
                if (user._id.toString() !== sender) {
                    if(user.fcmToken)
                    {
                        await sendNotification(user.fcmToken, `New Message from "${newMessage.sender.name}" in Group Chat "${chat.groupName}"`, message);
                    }
                    const receiverSocketId = activeUsers[user._id.toString()] ;
                    if (receiverSocketId) {

                        io.to(receiverSocketId).emit("receive-message", newMessage);
                        newMessage = await Message.findByIdAndUpdate(newMessage._id, { delivered: true }, { new: true }).populate("sender" , "_id email name profilePic online lastSeen ");
                    }
                }
            });
        } else {
            const user = chat.participants.find(user => user._id.toString() !== sender)
            if(user.fcmToken)
                {
                    await sendNotification(user.fcmToken, `New Message from "${newMessage.sender.name}"`, message);
                }
            const receiverSocketId = activeUsers[user._id.toString()] ;

            if (receiverSocketId) {
                io.to(receiverSocketId).emit("receive-message", newMessage);
                newMessage = await Message.findByIdAndUpdate(newMessage._id, { delivered: true }, { new: true }).populate("sender" , "_id email name profilePic online lastSeen ");
            }
        }
        
        res.status(201).json({
            message: "Message Sent successfully..." ,
            success: true,
            newMessage
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

export const getChat = async(req , res)=>{
    try
    {
        const {chatId , lastMessageId} = req.query;

         if(!chatId) return;

         const chat = await Chat.findById(chatId);

         if (!chat) {
             return res.status(404).json({ message: "Chat not found", success: false });
         }

        const limit =30;
        let dbQuery = { chatId, deletedBy: { $nin: req.user.id } };

            if (lastMessageId) {
            dbQuery._id = { $lt: lastMessageId };
        }


        const messages = await Message.find(dbQuery).populate("sender" , "_id email name profilePic online lastSeen ").sort({createdAt:-1}).limit(limit);

        res.status(200).json({
            message: "Chat Messages fetched successfully...",
            success: true,
            messages
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

export const markAsSeen = async(req , res)=>{
    try
    {
        const {chatId } = req.body;

        if(!chatId) return;

        const messages = await Message.find({chatId, sender: { $ne: req.user.id },deletedBy: { $nin: [req.user.id]}, seen:false}).populate("sender" , "_id email name profilePic online lastSeen ");;
       
        await Message.updateMany(
            {chatId, sender: { $ne: req.user.id },deletedBy: { $nin: [req.user.id]}, seen:false}, 
            { $set: { delivered: true , seen: true, seenAt: new Date() } }
        );
      

        res.status(201).json({
            message: "Chat Messeges geted successfully..." ,
            success: true,
            messages
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

export const deleteForMe = async(req , res)=>{
    try
    {
        const {messageId } = req.body;

        if(!messageId) return;

       
        await Message.findByIdAndUpdate(messageId, 
            { $push: { deletedBy: req.user.id} }, {new:true}
          );
      

        res.status(200).json({
            message: "Messeges deleted from you successfully..." ,
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

export const deleteFromEveryOne = async(req , res)=>{
    try
    {
        const {messageId , chatId } = req.body;

        if(!messageId || !chatId) return;

        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ message: "Chat not found", success: false });
        }

        const participants = chat.participants.map(user => user.toString());

        const message = await Message.findById(messageId);
            
        if (!message) {
            return res.status(404).json({ message: "Message not found", success: false });
        }

        if(message.mediaPublicId)
        {
            let resourceType;
            if(message.messageType === "image") resourceType ="image";
            if(message.messageType === "video" || message.messageType === "audio" ) resourceType ="video";
            if(message.messageType === "document") resourceType ="raw";
            await cloudinary.uploader.destroy(message.mediaPublicId,  {resource_type: resourceType}, (error, result) => {
                            if (error) {
                                console.error("Error deleting image from Cloudinary:", error);
                            } else {
                                console.log("Image deleted from Cloudinary:", result);
                            }
                        });

        }

        for (const user of participants) {
            if (user !== req.user.id) {
                const receiverSocketId = activeUsers[user] || null;
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("delete-from-everyone", message);
                }
            }
        }

        await Message.findByIdAndDelete(messageId);


        res.status(200).json({
            message: "Messeges deleted from everyone successfully..." ,
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
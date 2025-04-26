import { createServer } from "http";
import { Server } from "socket.io";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import { sendNotification } from "./sendnotifications.js";


export let io;
export const activeUsers = {};


export function initializeSocket(app) {
    const httpServer = createServer(app);  
    const activeCalls = new Map(); 

      io = new Server(httpServer, {
        cors: {
            origin: ['https://sync-chat-client-nine.vercel.app'],
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    

    io.on('connection', (socket) => {
        console.log("User Connected: ",socket.id)
        
        socket.on("user-online", async (userId) => {
            console.log("online event")
            if(!userId) return;
            await User.findByIdAndUpdate(userId, { online: true });
            activeUsers[userId] = socket.id;
            socket.broadcast.emit('online',userId);
            

            const pendingMessages = await Message.find( {
                chatId: { 
                  $in: await Chat.find({ participants: userId }).distinct("_id") 
                }, 
                sender: { $ne: userId },  
                delivered: false,              
                deletedBy: { $nin: [userId] } 
              });

            pendingMessages.forEach(async (msg) => {
                io.to(socket.id).emit("receive-message", msg);

                const senderSocketId = activeUsers[msg.sender]

                if(senderSocketId)
                {
                    io.to(senderSocketId).emit("delivered-message", msg._id);
                }

    
                await Message.findByIdAndUpdate(msg._id, { delivered: true });
            });
        });

        socket.on('mark-as-seen', async(msg)=>{
                const senderSocketId = activeUsers[msg.sender._id]
                if(senderSocketId)
                {
                    io.to(senderSocketId).emit("seen-message", msg._id);
                }

                await Message.updateOne(
                    { _id: msg._id, chatId:msg.chatId, seen:false }, 
                    { $set: { delivered: true , seen: true, seenAt: new Date() } }
                  );
        })

        socket.on("join-call", ({ userId }) => {
            socket.userId = userId;
            activeCalls.set(userId, null); 
          });
          
          socket.on("call-user", async({ to, offer, callType }) => {
            if(!to) return;

            if (activeCalls.has(to)) {
              socket.emit("on-other-call",{onOtherCall:true})
              
            } else {
              const user = activeUsers[to.toString()]
            if(user){
              io.to(user).emit("incoming-call", {
                from: socket.userId,
                offer,
                callType,
              });
              socket.emit("ringing",{ringing:true})

            }else{
              socket.emit("user-offline",{offline:true})
            }
            const caller = await User.findById(socket.userId);
              const callee = await User.findById(to);

              if(!caller && !callee) return;
              if(callee.fcmToken)
              {
                await sendNotification(callee.fcmToken, `incomming ${callType} call from`, caller.name);
              }
              
            }
            
          });
          
          socket.on("answer-call", ({ to, answer }) => {
            if(!to) return;
            const user = activeUsers[to.toString()]
            io.to(user).emit("call-answered", {
              from: socket.userId,
              answer,
            });
          });
          
          socket.on("ice-candidate", ({ to, candidate }) => {
            if(!to) return;
            const user = activeUsers[to.toString()]
            io.to(user).emit("ice-candidate", {
              from: socket.userId,
              candidate,
            });
          });

          socket.on("call-rejected",({to})=>{
            const user = activeUsers[to.toString()]
            if(user)
            {
              io.to(user).emit("call-declined", { from: socket.userId  }); 
            }
          })

          socket.on("end-call", ({ to  }) => {
            activeCalls.delete(socket.userId);
            activeCalls.delete(to)
            const user = activeUsers[to.toString()]
            if(user)
            {
              io.to(user).emit("call-ended", { from: socket.userId  });
            }
          });

          

        socket.on("disconnect", async() => {
            console.log("User Disconnected:", socket.id);
            activeCalls.delete(socket.userId);
            for(const userId in activeUsers)
            {
                if(activeUsers[userId] === socket.id)
                {
                    socket.broadcast.emit('offline',userId);
                    await User.findByIdAndUpdate(userId, { online: false , lastSeen:new Date() });
                    delete activeUsers[userId];
                    break;
                }
            }

        });
    });



    return {httpServer } ;  
}

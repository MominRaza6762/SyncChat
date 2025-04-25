import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import AuthRouter from "./routes/auth.js";
import cookieParser from "cookie-parser";
import MessageRouter from "./routes/message.js"
import ChatRouer from "./routes/chat.js"
import { initializeSocket } from "./utils/socket.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors({
    origin:['https://sync-chat-client-8cfrcx2ne-mominraza355-gmailcoms-projects.vercel.app',
  'https://sync-chat-client-nine.vercel.app'],
    credentials:true
}));
app.use(express.json());
app.use(cookieParser()); 



const retry = ()=>{
    console.log("🔄 Trying to connect to MongoDB...");
mongoose.connect(process.env.MONGO_URI).then(()=>{
    console.log("Data Base connected Successfully..")
}).catch((error)=>{
    console.log(error)
    setTimeout(()=>{
       retry(); 
    },5000)
});

}
retry();

app.use("/auth",AuthRouter);

app.use("/chat",ChatRouer);

app.use("/message",MessageRouter);

app.get("/",(req , res)=>{
    res.send("Running...")
});

app.use((err, req, res, next) => {
    console.error("🔴 Express Error:", err);
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Multer: ${err.message}` });
    }
    res.status(500).json({ error: err.message || "Unknown server error" });
  });


const {httpServer} = initializeSocket(app);

httpServer.listen(PORT, () => console.log(`Server running on at http://localhost:${PORT}`));

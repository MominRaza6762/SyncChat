import express from "express";
import authenticateUser from "../middleware/auth.js";
import { updateGroup ,deletePermanently ,removeParticipant, addUser , addChat ,getChats , deleteChat , createGroup, leaveChat } from "../controllers/chat.js";
import cloudinary from "../config/cloudinary.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const router = express.Router();

const storage = new CloudinaryStorage({
    cloudinary,
    params:{
        folder:"syncChat/profile_pictures",
        allowed_formats : ["jpg" , "png" , "jpeg"],
        transformation: [
            {width: 512, height: 512, crop: 'fill', gravity: 'face'},
            {quality: 'auto', fetch_format: 'auto'}
        ]
    }
})
const upload = multer({storage , 
    limits:{fileSize: 1* 1024 * 1024 ,fieldSize: 2 * 1024 * 1024}
})

router.post("/create_group",authenticateUser ,upload.single('profilePic'), createGroup)

router.patch("/update_group",authenticateUser ,upload.single('profilePic'), updateGroup)

router.patch("/delete_chat",authenticateUser , deleteChat)

router.patch("/leave_chat",authenticateUser , leaveChat)

router.patch("/remove_participant",authenticateUser , removeParticipant)

router.post("/add_chat",authenticateUser , addChat)

router.get("/add_user",authenticateUser , addUser)

router.get("/get_chats",authenticateUser, getChats)

router.delete("/delete_permanently",authenticateUser, deletePermanently)

export default router;

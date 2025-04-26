import express from "express";
import {saveFCMToken ,logOut, sendOtp , verifyOtp , saveProfile} from "../controllers/auth.js";
const router  = express.Router();
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { loginLimiter } from "../middleware/rateLimit.js";
import authenticateUser from "../middleware/auth.js";

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
    limits:{fieldSize: 1 * 1024 * 1024}
})

router.post("/save_token",authenticateUser, saveFCMToken);

router.post("/send_otp", loginLimiter, sendOtp);

router.post("/verify_otp", verifyOtp);

router.put("/save_profile", upload.single('profilePic'), saveProfile);

router.delete("/log_out",authenticateUser, logOut);

router.get("/me", authenticateUser, (req , res)=>{
    console.log(req.user)
    res.status(200).json({user:req.user})
});

export default router;

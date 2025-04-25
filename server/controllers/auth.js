import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
});


export const sendOtp = async (req , res)=>{
    const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
    const {email}  = req.body;
    if(!email) return;
    try
    {
        let user = await User.findOne({email:email});

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now()+10*60*1000)

        if(!user)
        {
            user = new User({email , otp , otpExpiry});
        }
        else
        {
            user.otp = otp;
            user.otpExpiry = otpExpiry;
        }
        await user.save();
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP is ${otp}. It will expire in 10 minutes.`
        })
        res.status(200).json({ success: true, message: 'OTP sent successfully' });
        
     
    }
    catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            message: "Internal Server Error: " + error.message,
            success: false
        });
    }
}

export const verifyOtp = async (req , res)=>{
    try
    {
        const {email , otp}  = req.body;
        if(!email && !otp) return;

        const user = await User.findOne({email:email});
        if(!user || user.otp !== otp || new Date() > user.otpExpiry )
        {
            return res.status(400).json({success: false , message:"Invalid or Expired otp"});
        }

        user.isVerified = true;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        if(!user.name || !user.profilePic)
        {
            return res.status(201).json({success: true , message:"new User" , newUser : true})

        }

        const token = jwt.sign({id : user._id , email: user.email ,name : user.name , profilePic : user.profilePic,fcmToken:user.fcmToken || null},process.env.SECRET_KEY , {expiresIn:"7d"})

        res.cookie("token", token ,{
            httpOnly:true,
            sameSite:"strict",
            maxAge: 7 * 24 * 60 * 60 * 1000  
        })
        res.status(200).json({success: true , message:"user verified successfully..." })

     
    }
    catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            message: "Internal Server Error: " + error.message,
            success: false
        });
    }
}

export const saveProfile = async(req , res)=>{
    try
    {
        const {name , email} = req.body;
        if(!name && ! email) return;

        const user  = await User.findOne({email})
        if (!user || !user.isVerified) {
            return res.status(400).json({success: false , message:"user is not verified " });
          }

          if(req.file)
          {
            if (user.profilePicPublicId) {
                await cloudinary.uploader.destroy(user.profilePicPublicId);
              }

              user.profilePic = req.file.path; 
              user.profilePicPublicId = req.file.filename; 
          }
          user.name = name;

          await user.save();

          const token = jwt.sign({id : user._id , email: user.email ,name : user.name , profilePic : user.profilePic,fcmToken:user.fcmToken || null},process.env.SECRET_KEY  , {expiresIn:"7d"});
          
          res.cookie("token", token ,{
            httpOnly:true,
            sameSite:"strict",
            maxAge: 7 * 24 * 60 * 60 * 1000  
        })
          res.status(200).json({success: true , message:"user profile saved successfully..." });
      
     
    }
    catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            message: "Internal Server Error: " + error.message,
            success: false
        });
    }
}

export const logOut = async(req , res)=>{
    try
    {
        await User.findByIdAndUpdate(
            req.user.id,
            { $unset: { fcmToken: 1 } },
            { new: true }
          );
        res.clearCookie('token',{
            httpOnly:true,
            sameSite:"strict",
            maxAge: 7 * 24 * 60 * 60 * 1000  
        })
        res.status(200).json({success: true , message:"user logged out successfully..." });
     
    }
    catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            message: "Internal Server Error: " + error.message,
            success: false
        });
    }
}

export const  saveFCMToken  = async (req, res) => {
    const { token } = req.body;
  
    if (!token) return res.status(400).json({success: false , message:"FCM token is required" });
  
    try {
      const updatedUser = await User.findByIdAndUpdate(req.user.id, { fcmToken: token }, { new: true });

      const authToken = jwt.sign({id : updatedUser._id , email: updatedUser.email ,name : updatedUser.name , profilePic : updatedUser.profilePic,fcmToken:updatedUser.fcmToken || null},process.env.SECRET_KEY  , {expiresIn:"7d"});
                
                res.cookie("token", authToken ,{
                  httpOnly:true,
                  sameSite:"strict",
                  maxAge: 7 * 24 * 60 * 60 * 1000  
              })
      res.status(200).json({ success:true , message: "fcm token saved!" });

    } catch (error) {
        console.error(" Error:", error);
        res.status(500).json({
            message: "Internal Server Error: " + error.message,
            success: false
        });
    }
  }

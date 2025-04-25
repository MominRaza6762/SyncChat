import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String },
    profilePic: { type: String },
    profilePicPublicId:{type: String},
    fcmToken: { type: String },
    isVerified: { type: Boolean, default: false },
    online: { type: Boolean, default: false },
    lastSeen:{ type: Date , default:new Date() },
    otp: { type: String },
    otpExpiry: { type: Date }
});
export default mongoose.model("User", userSchema);
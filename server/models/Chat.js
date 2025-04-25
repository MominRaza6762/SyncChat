import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    isGroupChat: { type: Boolean, default: false },  
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], 
    groupName: { type: String, default: null }, 
    groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, 
    createdAt: { type: Date, default: Date.now },
    deletedBy: { type: [String], default: [] },
    profilePic: { type: String, default: null },
    profilePicPublicId:{type: String , default: null}
});

export default mongoose.model("Chat", chatSchema);
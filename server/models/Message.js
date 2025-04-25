import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  message: { type: String},
  messageType: {type: String, enum: ["text", "image", "video", "audio", "document"], default: "text"},
  mediaUrl: { type: String }, 
  mediaPublicId: { type: String },
  delivered: { type: Boolean, default: false, index: true },
  seen: { type: Boolean, default: false, index: true },
  seenAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  deletedBy:{type:[String] , default:[]}
})

export default mongoose.model("Message", messageSchema);
import express from "express";
import path from "path";
import authenticateUser from "../middleware/auth.js";
import {sendMediaMessage, sendMessage ,getChat , markAsSeen , deleteForMe , deleteFromEveryOne} from "../controllers/message.js";
import cloudinary from "../config/cloudinary.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";


const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const mime = file.mimetype;
    const originalName = file.originalname; 
    const ext = path.extname(originalName); 
    const baseName = path.basename(originalName, ext); 
    const sanitizedBaseName = baseName.replace(/\s+/g, "_");
    const timestamp = Date.now();

    let folder = "syncChat/MessagesMedia/others";
    let allowed_formats = [];
    let resource_type = "auto";
    let public_id = `${sanitizedBaseName}_${timestamp}${ext}`;

    if (mime.startsWith("image/")) {
      folder = "syncChat/MessagesMedia/images";
      allowed_formats = ["jpg", "png", "jpeg", "webp"];
      resource_type = "image";
    } else if (mime.startsWith("video/")) {
      folder = "syncChat/MessagesMedia/videos";
      allowed_formats = ["mp4", "mov", "avi", "webm"];
      resource_type = "video";
    } else if (mime.startsWith("audio/")) {
      folder = "syncChat/MessagesMedia/audios";
      allowed_formats = ["mp3", "wav", "ogg", "webm"];
      resource_type = "video"; 
    } else if (
      mime === "application/pdf" ||
      mime === "application/msword" ||
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      folder = "syncChat/MessagesMedia/documents";
      allowed_formats = []; 
      resource_type = "raw";
    }

    return {
      folder,
      allowed_formats,
      resource_type,
      public_id 
    };
  },
});

  const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
      const mime = file.mimetype;
      const size = parseInt(req.headers["content-length"]); 
      
      let maxSize = 1 * 1024 * 1024; 
  
      if (mime.startsWith("image/")) {
        maxSize = 2 * 1024 * 1024; 
      } else if (mime.startsWith("audio/")) {
        maxSize = 5 * 1024 * 1024; 
      } else if (mime.startsWith("video/")) {
        maxSize = 20 * 1024 * 1024; 
      } else if (mime === "application/pdf" || mime.includes("word")) {
        maxSize = 10 * 1024 * 1024; 
      }
  
      if (size > maxSize) {
        return cb(
          new Error(`File too large. Max allowed size is ${maxSize / (1024 * 1024)}MB.`)
        );
      }
  
      cb(null, true);
    }
  });

router.post("/send_media",authenticateUser,upload.single("media"), sendMediaMessage)

router.post("/send",authenticateUser, sendMessage)

router.patch("/delete_for_me",authenticateUser, deleteForMe)

router.patch("/delete_from_everyone",authenticateUser, deleteFromEveryOne)

router.post("/mark_as_seen",authenticateUser, markAsSeen)

router.get("/get",authenticateUser, getChat)

export default router;

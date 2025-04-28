# SyncChat

SyncChat is a real-time chat application that functions similarly to WhatsApp, featuring essential features such as OTP-based authentication, real-time messaging, media sharing, and more. It uses email-based authentication with JWT token expiry for added security and includes advanced features such as voice/video calls and group chats.

## Live Demo
Check out the live demo of the project:
[SyncChat Live Demo](https://sync-chat-client-nine.vercel.app/)

## GitHub Repository
Access the project code and repository:
[SyncChat GitHub](https://github.com/MominRaza6762/SyncChat)

## Features

- **Email-based Authentication**: Log in with email and OTP.
- **JWT Authentication**: 7-day expiry JWT token stored in HTTP-only cookies.
- **Real-Time Messaging**: Chat messages sent and received in real-time using Socket.IO.
- **Push Notifications**: Get notifications for new messages.
- **Audio/Video Calls**: Real-time voice and video calling through WebRTC.
- **Media Sharing**: Share images, videos, and audio files in chats.
- **Voice Messages**: Send voice messages in individual and group chats.
- **Group Chats**: Create, update, and manage group chats (admin-only permissions for group management).
- **Message Delivery Indicators**: See if the message is delivered or read.
- **Online/Offline Status**: See the online status of users.
- **Message Deletion**: Delete messages for yourself or everyone in the chat.
- **Admin Controls**: Admins can remove participants from the group and update group details.

## Tech Stack

- **Frontend**: React.js, Socket.IO client, WebRTC, React Router DOM
- **Backend**: Node.js, Express.js, JWT, Multer (for file uploads), Cloudinary (for image/video storage), Socket.IO
- **Database**: MongoDB
- **Libraries/Tools**:
  - **Frontend**: React, Socket.IO client, WebRTC, React Router DOM
  - **Backend**: JWT, bcryptjs, Cloudinary, Multer, Socket.IO

## Installation

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/MominRaza6762/SyncChat.git

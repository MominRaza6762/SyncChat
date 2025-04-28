# SyncChat

SyncChat is a real-time chat application that functions similarly to WhatsApp, featuring essential features such as OTP-based authentication, real-time messaging, media sharing, and more. It uses email-based authentication with JWT token expiry for added security and includes advanced features such as voice/video calls and group chats.

## Table of Contents
- [Live Demo](#live-demo)
- [GitHub Repository](#github-repository)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [API Endpoints](#api-endpoints)
  - [Authentication Endpoints](#authentication-endpoints-authjs)
  - [Chat Endpoints](#chat-endpoints-chatjs)
  - [Message Endpoints](#message-endpoints-messagejs)
- [Usage](#usage)


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
- **Push Notifications**: Get notifications for new messages using Firebase Cloud Messaging.
- **Audio/Video Calls**: Real-time voice and video calling through WebRTC.
- **Media Sharing**: Share images, videos, and audio files in chats.
- **Voice Messages**: Send voice messages in individual and group chats.
- **Group Chats**: Create, update, and manage group chats (admin-only permissions for group management).
- **Message Delivery Indicators**: See if the message is delivered or read.
- **Online/Offline Status**: See the online status of users.
- **Message Deletion**: Delete messages for yourself or everyone in the chat.
- **Admin Controls**: Admins can remove participants from the group and update group details.

## Tech Stack

- **Frontend**: CSS , React.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Libraries/Tools**:
  - **Frontend**: React, Socket.IO client, WebRTC, React Router DOM
  - **Backend**: JWT, bcryptjs, Cloudinary (for image/video storage), Multer (for file uploads), Socket.IO, Firebase Cloud Messaging

## Installation

### Backend Setup

1. Clone the repository:
   ```bash
  git clone https://github.com/MominRaza6762/SyncChat.git
   cd Job-Board
2. Install dependencies:

   ```bash
   cd server
   npm install

3. Set up environment variables (.env):
   PORT (server port)

PORT=5000
- JWT_SECRET=your_secret_key
- CLOUDINARY_URL=your_cloudinary_url
- MONGO_URI=your_mongo_connection_uri
- FIREBASE_SERVER_KEY=your_firebase_server_key

4. Firebase Setup:
- [Go to Firebase Console.](https://console.firebase.google.com/)
- Set up Firebase Cloud Messaging (FCM).
- Generate the server key and add it as FIREBASE_SERVER_KEY in the .env file.

5. Start the backend server:
   ```bash
   npm start
   

### Frontend Setup

1. Navigate to the client folder:
   ```bash
   cd client
2. Install frontend dependencies:
   ```bash
   npm install
3. Update backend API URLs in the frontend (src/api.js) to match your backend.
4. Run the frontend server:
   ```bash
   npm run dev

## API Endpoints

###Authentication Endpoints:
- POST /api/auth/save_token: Save FCM token for push notifications.
- POST /api/auth/send_otp: Send OTP for email verification.
- POST /api/auth/verify_otp: Verify OTP to log in.
- PUT /api/auth/save_profile: Save profile details (upload profile picture).
- DELETE /api/auth/log_out: Log out the user and clear JWT.
- GET /api/auth/me: Get current user information (protected route).

###Chat Endpoints:
- POST /api/chat/create_group: Create a new group (only for authenticated users).
- PATCH /api/chat/update_group: Update group details (only for authenticated users).
- PATCH /api/chat/delete_chat: Delete a chat (only for authenticated users).
- PATCH /api/chat/leave_chat: Leave a chat (only for authenticated users).
- PATCH /api/chat/remove_participant: Remove a participant from a group (only for admins).
- POST /api/chat/add_chat: Add a new user to a group (only for authenticated users).
- GET /api/chat/add_user: Add user to chat.
- GET /api/chat/get_chats: Get all chats for the current user.
-DELETE /api/chat/delete_permanently: Permanently delete chat.

###Message Endpoints:
- POST /api/message/send_media: Send media files in a message.
- POST /api/message/send: Send a regular text message.
- PATCH /api/message/delete_for_me: Delete a message for the user.
- PATCH /api/message/delete_from_everyone: Delete a message from everyone.
- POST /api/message/mark_as_seen: Mark a message as seen.
- GET /api/message/get: Get messages from a specific chat.


## Usage

1. Once the backend and frontend are set up, visit the live demo or run it locally.
2. Log in using the OTP-based email authentication.
3. After logging in, you can:
  - Create a new group or join an existing one.
  - Start messaging users or groups.
  - Share media, send voice messages, and more.
4. You can test the app by adding users such as mominraza354@gmail.com to test chat functionalities.

import admin from "../config/firebase.js"

export const sendNotification = async (token, title, body) => {
    const message = {
      data : { title, body },
      token,
    };
  
    try {
      const response = await admin.messaging().send(message);
      console.log("Successfully sent notification:", response);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

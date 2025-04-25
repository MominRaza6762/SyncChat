import { messaging , getToken , onMessage } from "./firebaseconfig";

export const requestPermission = async (setAlert) => {
  
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_VAPID_KEY
      });
      return token;
    } else if (Notification.permission === 'denied') {
      setAlert({msg:"Notifications are blocked. Please enable them from your browser settings.", type:"info"});
      setTimeout(()=>{
        setAlert({msg:"",type:""})
      },3000)
    } else {
     
      requestPermission(); 
    }
  } catch (error) {
    console.error('Error getting token:', error);
  }
};

export const listenToNotifications = () => {
  onMessage(messaging, (payload) => {
    const { title, body } = payload.data;

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon:"/images/nicon.png",
      });
    }
    
  });
};

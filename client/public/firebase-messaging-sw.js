importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyD0xpg5bP2MxKPVsl7PdWYIo-4wtkIzP9A",
    authDomain:"sycnchat.firebaseapp.com",
    projectId: "sycnchat",
    messagingSenderId: "1015571059408",
    appId: "1:1015571059408:web:b45a1943d22e91e2f884d5",
    storageBucket: "sycnchat.firebasestorage.app"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log('Received background message: ', payload);
  const { title, body } = payload.data;

  self.registration.showNotification(title, {
    body,
    icon: "/images/nicon.png", 
    
  });
});

self.addEventListener('notificationclick', function(event) {
  console.log("notification")
  event.notification.close();
  event.waitUntil(
    clients.openWindow('https://sync-chat-client-nine.vercel.app/') 
  );
});

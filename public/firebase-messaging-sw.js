importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAH6mQtHLu3gqtPrwAi-67S-VwNYWAwE2c",
  authDomain: "pranavdroptaxi-808ff.firebaseapp.com",
  projectId: "pranavdroptaxi-808ff",
  storageBucket: "pranavdroptaxi-808ff.firebasestorage.app",
  messagingSenderId: "473028998497",
  appId: "1:473028998497:web:776e4c40d3b3985ae7c120"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico', // Path to your logo
    badge: '/favicon.ico',
    // Clicking the notification opens the app
    click_action: "https://pranavdroptaxiadmin.vercel.app/bookings" 
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
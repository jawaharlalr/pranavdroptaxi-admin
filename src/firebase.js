import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// 1. Import Messaging
import { getMessaging, getToken, onMessage } from "firebase/messaging"; 

const firebaseConfig = {
  apiKey: "AIzaSyAH6mQtHLu3gqtPrwAi-67S-VwNYWAwE2c",
  authDomain: "pranavdroptaxi-808ff.firebaseapp.com",
  projectId: "pranavdroptaxi-808ff",
  storageBucket: "pranavdroptaxi-808ff.firebasestorage.app",
  messagingSenderId: "473028998497",
  appId: "1:473028998497:web:776e4c40d3b3985ae7c120"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// 2. Initialize Messaging
export const messaging = getMessaging(app);

// 3. Helper to Request Permission (Call this when Admin logs in)
export const requestNotificationPermission = async (adminUid) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // ⚠️ Paste the VAPID Key you generated in Step 1 below
      const token = await getToken(messaging, { 
        vapidKey: "BMXvq6ET-CFCgcv4ob_YFN-xwuAe1P2k7O7rQczWoQIC-MUl9iCXiEfjYVv10Yz4ZaRcxFgVKQeCX2jzb5B9E-Q" 
      });
      console.log("FCM Token:", token);
      return token;
    } else {
      console.log('Notification permission denied.');
      return null;
    }
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

// 4. Listener for foreground messages (when app is open)
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
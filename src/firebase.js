import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";  // ✅ Correct import for Realtime DB

const firebaseConfig = {
  apiKey: "AIzaSyBImdjeuiYgYnZhlZWMFzXhUlNjKYUudsw",
  authDomain: "smart-weather-a0993.firebaseapp.com",
  databaseURL: "https://smart-weather-a0993-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-weather-a0993",
  storageBucket: "smart-weather-a0993.appspot.com",
  messagingSenderId: "812400993144",
  appId: "1:812400993144:web:9ac52f1fe192c2c3b61e8d",
  measurementId: "G-EP7TKSY7LC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);  // ✅ Get Realtime Database instance

export { db };

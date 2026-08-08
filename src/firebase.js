import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Вставь сюда твои данные из консоли Firebase (Firebase Console)
const firebaseConfig = {
  apiKey: "ТВОЙ_API_KEY",
  authDomain: "ТВОЙ_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://ТВОЙ_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "ТВОЙ_PROJECT_ID",
  storageBucket: "ТВОЙ_PROJECT_ID.appspot.com",
  messagingSenderId: "ТВОЙ_SENDER_ID",
  appId: "ТВОЙ_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
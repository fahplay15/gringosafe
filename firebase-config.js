// Configuração Firebase - GringoSafe Web
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDFsKM3nO9kMqOfqNkUL5rW3ukS4yzzTzs",
  authDomain: "gringosafe-1f434.firebaseapp.com",
  projectId: "gringosafe-1f434",
  storageBucket: "gringosafe-1f434.firebasestorage.app",
  messagingSenderId: "949745647794",
  appId: "1:949745647794:web:e81698e40bd8d7aa5d09ab",
  measurementId: "G-JTQT05JKZW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const analytics = getAnalytics(app);

export { db, auth, provider, analytics };

// Importações necessárias
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDFsKM3nO9kMqOfqNkUL5rW3ukS4yzzTzs",
  authDomain: "gringosafe-1f434.firebaseapp.com",
  projectId: "gringosafe-1f434",
  storageBucket: "gringosafe-1f434.firebasestorage.app",
  messagingSenderId: "949745647794",
  appId: "1:949745647794:web:e81698e40bd8d7aa5d09ab",
  measurementId: "G-JTQT05JKZW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Exportar para uso no app
export { db, auth, provider, analytics };

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getStorage} from "firebase/storage";
import  {getAuth,GoogleAuthProvider} from "firebase/auth"
const firebaseConfig = {
  apiKey: "AIzaSyDTcOdIfdHe4JiMj_xey4-q4HHGFIkgGhU",
  authDomain: "video-calling-app-2d09f.firebaseapp.com",
  projectId: "video-calling-app-2d09f",
  storageBucket: "video-calling-app-2d09f.firebasestorage.app",
  messagingSenderId: "916948668130",
  appId: "1:916948668130:web:8974bba3799353a71b18bb",
  measurementId: "G-EDRS1RZMGP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const provider= new GoogleAuthProvider();
const auth= getAuth(app);
const storage=getStorage(app)
export  {provider,auth,storage}


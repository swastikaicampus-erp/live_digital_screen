import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase कॉन्फ़िगरेशन (आपके द्वारा प्रदान की गई नकली कुंजियों के साथ)
const firebaseConfig = {
    apiKey: "AIzaSyD2LYyKFrQc53BCssYOvLB8uXkVmXcLx24",
    authDomain: "digital-screen-b6fd3.firebaseapp.com",
    projectId: "digital-screen-b6fd3",
    storageBucket: "digital-screen-b6fd3.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID", 
    appId: "YOUR_APP_ID"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Manual Sign In Function
export const manualSignIn = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const logOut = () => signOut(auth);
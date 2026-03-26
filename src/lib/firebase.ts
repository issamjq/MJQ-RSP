import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBKIRRoBZU3PmUa1ziztqNshRvwVsrciko",
  authDomain: "mjq-app-308e2.firebaseapp.com",
  projectId: "mjq-app-308e2",
  storageBucket: "mjq-app-308e2.firebasestorage.app",
  messagingSenderId: "739692932221",
  appId: "1:739692932221:web:19cbb8e1233bf9a5f65514",
  measurementId: "G-47BYTFEZFH",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

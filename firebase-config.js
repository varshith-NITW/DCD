// Firebase Web SDK Configuration for DCD Showcase Hub
// Activated using your web app configuration credentials.

const firebaseConfig = {
  apiKey: "AIzaSyCrOg8zC0pALmnhcRX5q-egz5235XYUn0Q",
  authDomain: "dcd-showcase.firebaseapp.com",
  projectId: "dcd-showcase",
  storageBucket: "dcd-showcase.firebasestorage.app",
  messagingSenderId: "1056285964314",
  appId: "1:1056285964314:web:bdb94c1756d34f786bb9a3"
};

let useFirebase = false;
let dbInstance = null;

try {
  // Check if the firebase scripts are loaded
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    dbInstance = firebase.firestore();
    
    // Bypass ISP/Browser QUIC protocol blockages (ERR_QUIC_PROTOCOL_ERROR)
    try {
      dbInstance.settings({
        experimentalForceLongPolling: true
      });
      console.log("⚡ DCD Cloud: Firestore long-polling settings applied!");
    } catch (e) {
      console.warn("Could not apply Firestore settings:", e);
    }
    
    useFirebase = true;
    console.log("⚡ DCD Cloud: Firebase Firestore initialized successfully!");
  } else {
    console.error("⚡ DCD Cloud: Firebase scripts not loaded. Check script tag imports.");
  }
} catch (error) {
  console.error("⚡ DCD Cloud: Firebase initialization error:", error);
}

// Export config context globally for db.js
window.DcdFirebase = {
  useFirebase: useFirebase,
  db: dbInstance
};
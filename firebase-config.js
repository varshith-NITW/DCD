// Firebase Web SDK Configuration for DCD Showcase Hub
// To activate the cloud database, paste your web app configuration credentials from the Firebase Console below.

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let useFirebase = false;
let dbInstance = null;

// Initialize Firebase if configuration is completed
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
  try {
    // Check if the firebase scripts are loaded
    if (typeof firebase !== 'undefined') {
      firebase.initializeApp(firebaseConfig);
      dbInstance = firebase.firestore();
      useFirebase = true;
      console.log("⚡ DCD Cloud: Firebase Firestore initialized successfully!");
    } else {
      console.error("⚡ DCD Cloud: Firebase scripts not loaded. Check script tag imports.");
    }
  } catch (error) {
    console.error("⚡ DCD Cloud: Firebase initialization error:", error);
  }
} else {
  console.log("⚡ DCD Local: Running in local storage fallback mode. Paste your Firebase credentials in firebase-config.js to enable cloud syncing.");
}

// Export config context globally for db.js
window.DcdFirebase = {
  useFirebase: useFirebase,
  db: dbInstance
};

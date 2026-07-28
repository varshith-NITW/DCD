// MongoDB Atlas App Services (Realm) Web SDK Configuration
// To activate MongoDB Atlas cloud database, paste your App ID from the MongoDB Atlas App Services dashboard below.

const MONGODB_APP_ID = "YOUR_MONGODB_APP_ID";

let useMongo = false;
let mongoApp = null;

if (MONGODB_APP_ID && MONGODB_APP_ID !== "YOUR_MONGODB_APP_ID") {
  try {
    if (typeof Realm !== 'undefined') {
      mongoApp = new Realm.App({ id: MONGODB_APP_ID });
      useMongo = true;
      console.log("⚡ DCD Cloud: MongoDB Atlas App Services initialized successfully!");
    } else {
      console.error("⚡ DCD Cloud: MongoDB Realm Web SDK script not loaded. Check script tag imports.");
    }
  } catch (error) {
    console.error("⚡ DCD Cloud: MongoDB App Services initialization error:", error);
  }
} else {
  console.log("⚡ DCD Local: MongoDB App ID not set. Paste your MongoDB App ID in mongodb-config.js to enable MongoDB Atlas syncing.");
}

// Export config context globally for db.js
window.DcdMongo = {
  useMongo: useMongo,
  app: mongoApp
};

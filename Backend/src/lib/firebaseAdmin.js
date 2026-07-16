import admin from "firebase-admin";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Initialize Firebase Admin SDK once.
// Loads the service account JSON file directly (avoids private key corruption
// that occurs when embedding the key in environment variable strings).
if (!admin.apps.length) {
  try {
    const serviceAccount = require("../../storesaarthi-b831b-firebase-adminsdk-fbsvc-b4c744df90.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("[Firebase Admin] Initialized successfully for project:", serviceAccount.project_id);
  } catch (err) {
    console.error("[Firebase Admin] Failed to initialize:", err.message);
  }
}

export default admin;

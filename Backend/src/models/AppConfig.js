// models/AppConfig.js
import mongoose from "mongoose";

const appConfigSchema = new mongoose.Schema(
  {
    updateAvailable: { type: Boolean, default: false },
    latestVersion: { type: String },
    forceUpdate: { type: Boolean, default: false },
    updateMessage: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("AppConfig", appConfigSchema);

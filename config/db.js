const mongoose = require('mongoose');

let isConnected = false; // Track connection state

const connectDB = async () => {
  if (isConnected) {
    console.log("MongoDB already connected.");
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    isConnected = conn.connections[0].readyState;
    console.log("MongoDB Connected:", conn.connection.host);

  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    // Retry after 5s ONLY for development or local fail cases
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;

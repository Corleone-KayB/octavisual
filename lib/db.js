const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and add your MongoDB connection string.');
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  return mongoose.connection;
}

module.exports = { connectDB, mongoose };

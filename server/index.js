import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
// import multer from 'multer';
import proxy from 'express-http-proxy';

import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import fs from 'fs';
import analyzeRoute from './routes/analyze.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
// Load .env relative to the project root (one level above server folder)
dotenv.config({ path: path.join(currentDir, '../.env') });
// const upload = multer({ dest: 'uploads/' });
const app = express();

app.use(cors({
  exposedHeaders: 'Content-Disposition',
}));
app.use(express.json());

app.get("/",(req,res)=>{
  res.send("Server is running.")
});
// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scene';
if (!process.env.MONGODB_URI) {
  console.warn('WARNING: MONGODB_URI is not defined in environment; using fallback:', mongoURI);
}

if (!mongoURI.startsWith('mongodb://') && !mongoURI.startsWith('mongodb+srv://')) {
  console.error('Invalid MongoDB URI scheme:', mongoURI);
  process.exit(1);
}

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
})
  .then(() => console.log('Connected to MongoDB:', mongoURI))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });


// Routes
app.use('/api/auth', authRoutes);
// app.use('/api/analyze', analyzeRoute);
app.use('/api/generate-pdf', (req, res, next) => {
  proxy('http://localhost:8000', {
    // This option prevents the proxy from parsing the request body,
    // ensuring the file stream is passed through untouched.
    parseReqBody: false,
    
    // This sets the destination path on the FastAPI server.
    proxyReqPathResolver: () => '/analyze',

  })(req, res, next);
});

// Serve static files from the 'dist' directory
app.use(express.static(path.join(currentDir, '../dist')));

// Handle any requests that don't match the API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(currentDir, '../dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
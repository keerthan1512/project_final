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

dotenv.config();
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
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));


import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analyze', analyzeRoute);
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
app.use(express.static(path.join(__dirname, '../dist')));

// Handle any requests that don't match the API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
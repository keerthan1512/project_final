import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
router.get("/", (req, res) => {
  res.send("Api is running")
})

router.get("/register", (req, res) => {
  res.send("register is working")
})

router.get("/login",(req,res)=>{
  res.send("login is working")
})

// Register
router.post('/register', async (req, res) => {
  console.log('Register route called');
  try {
    console.log('Register route - before destructuring req.body');
    const { email, password, name } = req.body;
    console.log('Register route - after destructuring req.body');

    // Check if user exists
    console.log('Register route - before User.findOne');
    let user = await User.findOne({ email });
    console.log('Register route - after User.findOne');
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    console.log('Register route - before bcrypt.genSalt');
    const salt = await bcrypt.genSalt(10);
    console.log('Register route - after bcrypt.genSalt');
    console.log('Register route - before bcrypt.hash');
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Register route - after bcrypt.hash');

    // Create user
    user = new User({
      email,
      password: hashedPassword,
      name,
    });

    console.log('Register route - before user.save');
    await user.save();
    console.log('Register route - after user.save');

    // Create token
    console.log('Register route - before jwt.sign');
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('Register route - after jwt.sign');

    console.log('Register route - before sending response');
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // In a real application, you would:
    // 1. Generate a reset token
    // 2. Save it to the user document with an expiry
    // 3. Send an email with a reset link
    // For this demo, we'll just return a success message
    res.json({ message: 'Password reset instructions sent to your email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

import multer from 'multer';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.post('/upload', upload.array('files'), (req, res) => {
  try {
    console.log('Files uploaded:', req.files);
    res.status(200).json({ message: 'Files uploaded successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
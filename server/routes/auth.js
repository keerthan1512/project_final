import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import CrimeHistory from '../models/CrimeHistory.js';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Api is running")
})

router.get("/register", (req, res) => {
  res.send("register is working")
})

router.get("/login", (req, res) => {
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
      { expiresIn: '30d' }
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
    const { email, password, token2fa } = req.body;

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

    // Check if 2FA is enabled for the user
    if (user.isTwoFactorEnabled) {
      // If 2FA is enabled but no token provided, return requires2FA flag
      if (!token2fa) {
        return res.status(403).json({
          message: '2FA token required',
          requires2FA: true
        });
      }

      // Verify 2FA token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token2fa
      });

      if (!verified) {
        return res.status(400).json({ message: 'Invalid 2FA token' });
      }
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isTwoFactorEnabled: user.isTwoFactorEnabled
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Setup 2FA
router.post('/2fa/setup', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `SceneX:${user.email}`
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Save secret to user
    user.twoFactorSecret = secret.base32;
    await user.save();

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify and Enable 2FA
router.post('/2fa/verify', async (req, res) => {
  try {
    const { token: verificationToken } = req.body;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: verificationToken
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.isTwoFactorEnabled = true;
    await user.save();

    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Disable 2FA
router.post('/2fa/disable', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
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

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    const transporter = nodemailer.createTransport({
      secure: true,
      host: "smtp.gmail.com",
      port: 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const resetLink = `https://scene-x.vercel.app/reset-password?token=${resetToken}`;

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Password Reset',
      html: `
        <p>You requested a password reset.</p>
        <p>Click the link below to reset it:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email send error:", error);
        return res.status(500).json({ message: 'Error sending email', error: error.message });
      } else {
        console.log('Email sent: ' + info.response);
        res.status(200).json({ message: 'Password reset instructions sent to your email' });
      }
    });
  } catch (error) {
    console.error("Reset Password API Error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/reset-password-confirm', async(req,res)=>{
  res.send("Reset password is working");
});

router.post('/reset-password-confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Find user by reset password token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gte: Date.now() },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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

router.post('/upload', async (req, res) => {
  try {
    // Assuming user ID is available in the request (e.g., from JWT)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        console.error("JWT Verification Error:", err);
        return res.status(401).json({ message: 'Unauthorized - Invalid token' });
      }
    } else {
      return res.status(401).json({ message: 'Unauthorized - Missing token' });
    }

    const { filename, classificationResult , featureType} = req.body;

    // Store the classification history in the database
    const crimeHistory = new CrimeHistory({
      userId: userId,
      filename: filename,
      classificationResult: classificationResult,
      featureType: featureType
    });
    await crimeHistory.save();

    res.status(200).json({ message: 'Classification result stored successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// New History Routes
router.get('/history', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    let query = { userId: decoded.userId };

    // Search
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Feature type filter
    if (req.query.featureType && req.query.featureType !== 'all') {
      query.featureType = req.query.featureType;
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.timestamp = {};
      if (req.query.startDate) {
        query.timestamp.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.timestamp.$lte = new Date(req.query.endDate);
      }
    }

    // Sort
    const sortField = req.query.sortBy || 'timestamp';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const items = await CrimeHistory.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await CrimeHistory.countDocuments(query);
    const hasMore = total > skip + items.length;

    res.json({ items, hasMore });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/history/clear', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await CrimeHistory.deleteMany({ userId: decoded.userId });

    res.json({ message: 'History cleared successfully' });
  } catch (error) {
    console.error('History clear error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/history/download', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const history = await CrimeHistory.find({ userId: decoded.userId });

    const format = req.query.format || 'json';

    switch (format) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=history.csv');
        
        // CSV header
        let csv = 'Filename,Type,Result,Confidence,Date\n';
        
        // CSV rows
        history.forEach(item => {
          csv += `${item.filename},${item.featureType},${item.classificationResult},${item.confidence || ''},${item.timestamp}\n`;
        });
        
        res.send(csv);
        break;

    default:
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=history.json');
      res.json(history);
  }
} catch (error) {
    console.error('History download error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
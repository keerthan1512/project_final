import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import CrimeHistory from '../models/CrimeHistory.js';
import multer from 'multer';

const router = express.Router();

// Existing routes...
// (Keep all existing routes unchange)

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
    res.status(500).json({ message: 'Server error' });
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
    res.status(500).json({ message: 'Server error' });
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

      case 'pdf':
        // Implementation for PDF format would go here
        // You would need to add a PDF generation library to package.json
        res.status(501).json({ message: 'PDF format not implemented yet' });
        break;

      case 'json':
      default:
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=history.json');
        res.json(history);
    }
  } catch (error) {
    console.error('History download error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
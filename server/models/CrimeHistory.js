import mongoose from 'mongoose';

const crimeHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  classificationResult: {
    type: String,
    required: true
  },
  featureType: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100
  },
  imageUrl: String,
  details: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Add text indexes for search functionality
crimeHistorySchema.index({
  filename: 'text',
  classificationResult: 'text'
});

export default mongoose.model('CrimeHistory', crimeHistorySchema);
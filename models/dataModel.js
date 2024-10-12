// models/dataModel.js
import mongoose from 'mongoose';

const DataSchema = new mongoose.Schema({
  ipfsHash: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Data', DataSchema);

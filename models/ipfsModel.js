// models/ipfsModel.js
import mongoose from 'mongoose';

const IpfsSchema = new mongoose.Schema({
  ipfsHash: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('IpfsData', IpfsSchema);

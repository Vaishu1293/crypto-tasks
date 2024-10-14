// models/NftMetadata.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

// Define a Mongoose schema for transaction history
const simpleTransactionSchema = new mongoose.Schema({
    fromAddress: String,
    toAddress: String,
    amount: Number,
    transactionHash: String,
    status: String,
    timestamp: { type: Date, default: Date.now }
  });
  
  // Create the Mongoose model
  const simpleTransaction = mongoose.model("simpleTransaction",simpleTransactionSchema);
  
  export default simpleTransaction;
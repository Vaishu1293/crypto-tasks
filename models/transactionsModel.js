import mongoose from 'mongoose';

// Define the schema for a transaction
const transactionSchema = new mongoose.Schema({
  blockNumber: { type: Number, required: true },
  timeStamp: { type: Number, required: true },
  hash: { type: String, required: true, unique: true }, // Ensure uniqueness of each transaction hash
  nonce: { type: Number },
  blockHash: { type: String, required: true },
  transactionIndex: { type: Number },
  from: { type: String, required: true },
  to: { type: String, required: true },
  value: { type: String }, // Keep value as string to avoid floating point errors
  gas: { type: Number },
  gasPrice: { type: Number },
  isError: { type: String },
  txreceipt_status: { type: String },
  input: { type: String },
  contractAddress: { type: String, default: '' },
  cumulativeGasUsed: { type: String },
  gasUsed: { type: Number },
  confirmations: { type: String },
  methodId: { type: Number },
  functionName: { type: String }
});

// Static method to parse and create transactions
transactionSchema.statics.parseAndCreate = async function(transactionsData, contractAddress) {
  const parsedTransactions = transactionsData.map(tx => ({
    blockNumber: tx.blockNumber,
    timeStamp: tx.timeStamp,
    hash: tx.hash,
    nonce: tx.nonce,
    blockHash: tx.blockHash,
    transactionIndex: tx.transactionIndex,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    gas: tx.gas,
    gasPrice: tx.gasPrice,
    isError: tx.isError,
    txreceipt_status: tx.txreceipt_status,
    input: tx.input,
    contractAddress: contractAddress,
    cumulativeGasUsed: tx.cumulativeGasUsed,
    gasUsed: tx.gasUsed,
    confirmations: tx.confirmations,
    methodId: tx.methodId,
    functionName: tx.functionName
  }));

  // Store parsed transactions in MongoDB
  const transactionPromises = parsedTransactions.map(async transaction => {
    try {
      const existingTransaction = await this.findOne({ hash: transaction.hash });
      if (!existingTransaction) {
        return new this(transaction).save();
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  });

  // Wait for all transactions to be saved
  return Promise.all(transactionPromises);
};

// Create and export the model
const TransactionModel = mongoose.model('Transaction', transactionSchema);

export default TransactionModel;

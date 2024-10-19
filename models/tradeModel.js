import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const tradeSchema = new Schema({
    userId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    currencyPair: { type: String, required: true },
    amount: { type: Number, required: true },
    price: { type: Number, required: true },
    orderType: { type: String, enum: ['market', 'limit'], required: true },
    transactionHash: { type: String },
    status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' }
});

export default mongoose.model('Trade', tradeSchema);

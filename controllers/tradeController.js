import Web3 from 'web3';
import Trade from '../models/tradeModel.js';
// Web3 instance connected to Infura (Sepolia testnet)
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_SEPI_URL));
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount


// Order validation helper function
function validateOrder(order) {
    const { currencyPair, amount, price, orderType } = order;
    if (!currencyPair || typeof currencyPair !== 'string') {
        return 'Invalid currency pair';
    }
    if (!amount || isNaN(amount) || amount <= 0) {
        return 'Invalid amount';
    }
    if (!price || isNaN(price) || price <= 0) {
        return 'Invalid price';
    }
    if (!['market', 'limit'].includes(orderType)) {
        return 'Invalid order type';
    }
    return null;
}

// Create the /api/trade endpoint
const trade = async (req, res) => {
    const { userId, currencyPair, amount, price, orderType } = req.body;

    // Validate order parameters
    const validationError = validateOrder({ currencyPair, amount, price, orderType });
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    let savedTrade; // Declare savedTrade outside the try block for error handling

    try {
        const fromAddress = account.address;

        // Get current balance of the sender's account
        const balance = await web3.eth.getBalance(fromAddress);

        // Fetch the current gas price for Sepolia
        const gasPrice = await web3.eth.getGasPrice();

        // Estimate gas limit for the transaction
        const gasLimit = 21000; // Standard for ETH transfer, adjust for contract interaction if needed

        // Calculate the total cost (value + gas fee) using web3.utils.BN for Big Numbers
        const totalCost = new web3.utils.BN(web3.utils.toWei(amount.toString(), 'ether')).add(new web3.utils.BN(gasLimit * gasPrice));

        // Check if the account has enough balance to cover the total cost
        if (new web3.utils.BN(balance).lt(totalCost)) {
            return res.status(402).json({ error: 'Insufficient funds for transaction' });
        }

        // Create a new trade record and save it to the database (status: pending)
        const newTrade = new Trade({
            userId, // User ID should come from the request body
            currencyPair,
            amount,
            price,
            orderType,
            status: 'pending'
        });
        savedTrade = await newTrade.save();

        // Define the transaction parameters
        const txParams = {
            from: fromAddress,
            to: '0x49cEb5bbc998b876b32169c9a2Ba56855bCd54da', // Replace with actual recipient address
            value: web3.utils.toWei(amount.toString(), 'ether'), // Assuming the amount is in ETH
            gas: gasLimit,
            gasPrice: gasPrice,
        };

        // Sign the transaction using the private key
        const signedTx = await web3.eth.accounts.signTransaction(txParams, privateKey);

        // Broadcast the signed transaction to the Sepolia testnet
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        // Update trade record with transaction hash and status 'confirmed'
        savedTrade.transactionHash = receipt.transactionHash;
        savedTrade.status = 'confirmed';
        await savedTrade.save();

        // Return the transaction hash to the frontend
        res.json({ txHash: receipt.transactionHash });

    } catch (error) {
        console.error('Error placing order:', error);

        // If savedTrade is defined, update trade status to 'failed'
        if (savedTrade) {
            await Trade.findByIdAndUpdate(savedTrade._id, { status: 'failed' });
        }

        // Handle specific blockchain errors
        if (error.message.includes('insufficient funds')) {
            return res.status(402).json({ error: 'Insufficient funds for transaction' });
        } else if (error.message.includes('invalid signature')) {
            return res.status(400).json({ error: 'Invalid transaction signature' });
        } else {
            return res.status(500).json({ error: 'Transaction failed' });
        }
    }
};

export {
    trade
}

import TransactionModel from '../models/transactionsModel.js';
import Web3 from 'web3';
import axios from 'axios';
import fs from 'fs';
import simpleTransaction from '../models/simpleTransactionModel.js';

// Web3 instance connected to Infura (Sepolia testnet)
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_SEPI_URL));
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

const getContractABI = async () => {
  try {
    const response = await axios.get(`https://api-sepolia.etherscan.io/api`, {
      params: {
        module: 'contract',
        action: 'getabi',
        address: process.env.CONTRACT_ADDRESS,
        apikey: process.env.ETHERSCAN_API_KEY,  // Etherscan API key from your .env
      },
    });

    console.log(response);

    if (response.data.status === '1') {
      // ABI fetched successfully
      console.log(response.data.result);
      return JSON.parse(response.data.result);
    } else {
      throw new Error('Error fetching ABI from Etherscan');
    }
  } catch (error) {
    console.error('Error fetching ABI:', error.message);
    throw error;
  }
}

// Load the contract ABI and address from JSON file (adjust the path if needed)
// const contractABI = JSON.parse(fs.readFileSync(`${__dirname}/../MyToken.json`, 'utf8'));
const contractABI = await getContractABI();
const contractAddress = process.env.CONTRACT_ADDRESS;
const myTokenContract = new web3.eth.Contract(contractABI, contractAddress);

// const createTransaction = async (req, res) => {
//   const { id, quantity, price, spent, date } = req.body;

//   const user_id = req.user._id;

//   if (!user_id) {
//     return res.status(400).json({ error: "User ID is required" });
//   }

//   if (!id) {
//     return res.status(400).json({ error: "Please provide an ID" });
//   }

//   if (!quantity) {
//     return res.status(400).json({ error: "Please provide a quantity" });
//   }

//   if (!price) {
//     return res.status(400).json({ error: "Please provide a price" });
//   }

//   if (!spent) {
//     return res.status(400).json({ error: "Please provide a spend" });
//   }

//   if (!date) {
//     return res.status(400).json({ error: "Please provide a date" });
//   }

//   try {
//     const transaction = await TransactionsSchema.create({
//       id,
//       quantity,
//       price,
//       spent,
//       date,
//       user_id,
//     });

//     let portfolio = await PortfolioSchema.findOne({ user_id: user_id });

//     if (!portfolio) {
//       res.status(404).json({
//         error: "portfolio not found",
//       });
//     }

//     res.status(200).json(transaction);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// };

// const getTransactions = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const userFolio = await PortfolioSchema.findOne({
//       user_id: userId,
//     }).populate("transactions");

//     if (!userFolio) {
//       return res.status(404).json({ error: "Portfolio not found" });
//     }

//     res.status(200).json(userFolio.transactions);
//   } catch (error) {
//     res.status(500).json({
//       error:
//         "Une erreur s'est produite lors de la récupération du portfolio de l'utilisateur.",
//     });
//   }
// };

// **4. Fetching Transactions from Etherscan**
const getTransactions = async (req, res) => {
  const {address} = req.body;

  const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=5&sort=desc&apikey=${process.env.ETHERSCAN_API_KEY}`;

  try {
    const response = await axios.get(url);

    if (response.data.status === '1') {
      // Pass the response data to the Mongoose static method for parsing and saving
      const savedTransactions = await TransactionModel.parseAndCreate(response.data.result, address);

      res.json(savedTransactions);  // Return the saved transactions
    } else {
      return res.status(404).json({ message: 'No transactions found' });
    }
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
};

// **5. Querying Transactions by Date Range**
const queryTransactions = async (req, res) => {
  const { startDate, endDate } = req.query;
  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

  try {
    const transactions = await TransactionModel.find({
      timeStamp: { $gte: startTimestamp, $lte: endTimestamp },
    });

    if (!transactions.length) {
      return res.status(404).json({ message: 'No transactions found for the specified address and date range' });
    }

    res.json(transactions);
  } catch (error) {
    console.error('Error querying transactions:', error);
    return res.status(500).json({ message: 'Error querying transactions', error: error.message });
  }
};

const transferTokens = async (req, res) => {
  const { fromAddress, toAddress, amount } = req.body;

  try {
    

    // Prepare the transaction
    const decimals = await myTokenContract.methods.decimals().call();
    const amountInWei = web3.utils.toWei(amount.toString(), 'ether'); // Adjust the decimals accordingly

    const tx = myTokenContract.methods.transfer(toAddress, amountInWei);

    // Estimate gas and send transaction
    const gas = await tx.estimateGas({ from: fromAddress });
    const gasPrice = await web3.eth.getGasPrice();

    const receipt = await tx.send({
      from: fromAddress,
      gas,
      gasPrice,
    });

    const transaction = new simpleTransaction({
      fromAddress,
      toAddress,
      amount,
      transactionHash: receipt.transactionHash,
      status: receipt.status ? 'confirmed' : 'failed',
    });
    await transaction.save();
    console.log("Transaction saved to MongoDB");

    res.status(200).json({ transactionHash: receipt.transactionHash, message: "Transfer successful" });
  } catch (error) {
    console.error("Error transferring tokens:", error);
    res.status(500).json({ message: "Transfer failed", error });
  }
}

export {
  getTransactions,
  queryTransactions,
  transferTokens
}

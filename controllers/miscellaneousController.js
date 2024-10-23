import NftMetadata from '../models/NFTMetadataModel.js';
import Web3 from 'web3';
import Moralis from 'moralis';
import { EvmChain } from '@moralisweb3/common-evm-utils';
import ipfsModel from '../models/ipfsModel.js';
import https from 'https';
import { exec } from 'child_process';
import fs from 'fs';
import { path as kuboPath } from 'kubo'; // Path to the Kubo binary
import axios from 'axios';

// Web3 instance connected to Infura (Sepolia testnet)
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_SEPI_URL));
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount

// Start Moralis
await Moralis.start({
  apiKey: process.env.MORALIS_API_KEY,
  // ...and any other configuration if needed
});

const getNFTMetaData = async (req, res) => {
  try {
  
    // Get address and tokenId from req.body
    const { address, tokenId } = req.body;

    // Validate inputs
    if (!address || !tokenId) {
      return res.status(400).json({ error: 'Address and tokenId are required.' });
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid contract address format.' });
    }

    // Define the chain (adjust if you're using a different network)
    // const chain = EvmChain.SEPOLIA; // For Sepolia testnet
    // Define the chain
    const chain = EvmChain.ETHEREUM; // Change to EvmChain.SEPOLIA if using Sepolia testnet

    // Fetch NFT metadata from Moralis
    const response = await Moralis.EvmApi.nft.getNFTMetadata({
      address,
      chain,
      tokenId,
    });

    // Extract data from response
    const data = response.toJSON();

    // Parse the 'metadata' field from JSON string to an object
    let metadata = data.metadata;
    if (typeof metadata === 'string') {
      metadata = JSON.parse(metadata);
    }

    // Prepare data for saving
    const nftData = {
      amount: data.amount,
      tokenId: tokenId,
      contractAddress: address,
      contractType: data.contract_type,
      ownerOf: data.owner_of,
      lastMetadataSync: data.last_metadata_sync ? new Date(data.last_metadata_sync) : null,
      lastTokenUriSync: data.last_token_uri_sync ? new Date(data.last_token_uri_sync) : null,
      metadata: metadata,
      blockNumber: data.block_number,
      blockNumberMinted: data.block_number_minted,
      name: data.name,
      symbol: data.symbol,
      tokenHash: data.token_hash,
      tokenUri: data.token_uri,
      minterAddress: data.minter_address,
      rarityRank: data.rarity_rank,
      rarityPercentage: data.rarity_percentage,
      rarityLabel: data.rarity_label,
      verifiedCollection: data.verified_collection,
      possibleSpam: data.possible_spam,
      collectionLogo: data.collection_logo,
      collectionBannerImage: data.collection_banner_image,
      floorPrice: data.floor_price,
      floorPriceUsd: data.floor_price_usd,
      floorPriceCurrency: data.floor_price_currency,
    };

    // Save to MongoDB
    const nftMetadata = new NftMetadata(nftData);
    await nftMetadata.save();

    // Return the saved data as response
    return res.status(200).json(nftMetadata);
  } catch (error) {
    console.error('Error fetching NFT metadata:', error);
    // Handle specific Moralis API errors
    if (error.response && error.response.data) {
      return res.status(400).json({
        error: 'Failed to fetch NFT metadata.',
        details: error.response.data,
      });
    }
    // General error
    return res.status(500).json({
      error: 'Internal server error.',
      details: error.message,
    });
  }
};

const storeData = async (req, res) => {
  try {
    const textData = req.body.textData || "Default text data"; // The text data you want to store

    // Convert text data to a buffer to send with the request
    const postData = Buffer.from(textData, 'utf-8');

    // Define the Infura API endpoint and request options
    const options = {
      host: 'ipfs.infura.io',
      port: 5001,
      path: '/api/v0/add',
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${process.env.INFURA_API_KEY}:${process.env.INFURA_API_SECRET}`).toString('base64'),
        'Content-Type': 'multipart/form-data',
        'Content-Length': postData.length
      }
    };

    // Create the request inside the try block
    const ipfsReq = https.request(options, (ipfsRes) => {
      let body = '';
      ipfsRes.on('data', (chunk) => {
        body += chunk;
      });

      ipfsRes.on('end', () => {
        console.log('Response:', body);
        // Send back the IPFS hash to the user
        res.status(200).json({ success: true, ipfsHash: body });
      });
    });

    ipfsReq.on('error', (e) => {
      console.error(`Error: ${e.message}`);
      res.status(500).json({ success: false, message: e.message });
    });

    // Write the data to the request body
    ipfsReq.write(postData);
    ipfsReq.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to store data on IPFS via Infura', error });
  }
};

const storeKuboData = async (req, res) => {
  try {
    // Get text data from the request body
    const { textData } = req.body;

    // Validate if text data is provided
    if (!textData) {
      return res.status(400).json({ success: false, message: "Text data is required" });
    }

    // Write the text data to a temporary file
    fs.writeFileSync('temp.txt', textData, 'utf8');

    // Use the `ipfs add` command to add the file to IPFS via Kubo
    exec(`${kuboPath()} add temp.txt`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Kubo: ${error}`);
        return res.status(500).json({ success: false, message: 'Failed to store data on IPFS', error });
      }

      // Even if there's something in stderr (like progress), it doesn't necessarily mean failure
      if (stderr && stderr.includes('error')) {
        console.error(`Error: ${stderr}`);
        return res.status(500).json({ success: false, message: 'Error with IPFS command', error: stderr });
      }

      // Extract and return the IPFS hash (CID)
      const ipfsHash = stdout.trim().split(' ')[1]; // Extracting the hash from stdout
      console.log(`IPFS Hash: ${ipfsHash}`);

      try {
        const ipfsData = new ipfsModel({ ipfsHash });
        ipfsData.save();
        console.log('IPFS hash saved to MongoDB');
      } catch (dbError) {
        console.error(`Error saving hash to MongoDB: ${dbError}`);
        return res.status(500).json({ success: false, message: 'Error saving hash to MongoDB', error: dbError });
      }

      // Send response back with the IPFS hash
      return res.status(200).json({ success: true, ipfsHash });
    });
  } catch (error) {
    console.error(`Error in storeKuboData: ${error}`);
    return res.status(500).json({ success: false, message: 'Server error', error });
  }
};

const retrieveKuboData = async (req, res) => {
  try {
    // Get the hash from the request params
    const { hash } = req.body;

    // Find the hash in MongoDB
    const ipfsData = await ipfsModel.findOne({ ipfsHash: hash });

    if (!ipfsData) {
      return res.status(404).json({ success: false, message: 'Hash not found in database' });
    }

    // Use the `ipfs cat` command to retrieve the file from IPFS using the hash
    exec(`${kuboPath()} cat ${hash}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error retrieving data from IPFS: ${error}`);
        return res.status(500).json({ success: false, message: 'Failed to retrieve data from IPFS', error });
      }

      if (stderr) {
        console.error(`Error: ${stderr}`);
        return res.status(500).json({ success: false, message: 'Error with IPFS command', error: stderr });
      }

      // Send the retrieved data back to the client
      return res.status(200).json({ success: true, data: stdout });
    });
  } catch (error) {
    console.error(`Error in retrieveKuboData: ${error}`);
    return res.status(500).json({ success: false, message: 'Server error', error });
  }
};

const getTokenBalance = async (req, res) => {

  const { contractAddress, walletAddress } = req.body;

  console.log(contractAddress);

  try {
    const url = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${walletAddress}&tag=latest&apikey=${process.env.ETHERSCAN_API_KEY}`;

    const response = await axios.get(url);
    const data = response.data;

    if (data.status === "1") {
      // The balance is usually in the smallest denomination (e.g., wei for Ethereum-based tokens)
      console.log(`Token Balance: ${data.result}`);

      // Send the retrieved data back to the client
      return res.status(200).json({ success: true, tokenBalance: data.result });

    } else {
      console.log('Error fetching balance:', data.message);
      return res.status(500).json({ success: false, message: "Couldn't retrive token balance", error: data.message });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: "Couldn't call the api", error: error });
  }
};

export {
  getNFTMetaData,
  storeData,
  storeKuboData,
  retrieveKuboData,
  getTokenBalance
}


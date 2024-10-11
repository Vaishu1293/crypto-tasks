import NftMetadata from '../models/NFTMetadataModel.js';
import Web3 from 'web3';
import axios from 'axios';
import Moralis from 'moralis';
import { EvmChain } from '@moralisweb3/common-evm-utils';

// Web3 instance connected to Infura (Sepolia testnet)
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.INFURA_SEPI_URL));
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount

const getNFTMetaData = async (req, res) => {
  try {
    // Start Moralis
    await Moralis.start({
      apiKey: process.env.MORALIS_API_KEY,
      // ...and any other configuration if needed
    });

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

export {
  getNFTMetaData
}


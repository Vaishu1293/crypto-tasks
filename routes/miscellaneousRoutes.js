import express from 'express';
import { getNFTMetaData, storeKuboData, retrieveKuboData, getTokenBalance } from '../controllers/miscellaneousController.js';
// const requireAuth = require("../middleware/requireAuth.js");

const router = express.Router();

// router.use(requireAuth);

router.post("/nft", getNFTMetaData);

// Route to store data in IPFS
router.post('/store', storeKuboData);

router.post('/get-ipfs-data', retrieveKuboData);

router.post('/get-token-balance', getTokenBalance)

const miscellaneousRoutes = router

export default miscellaneousRoutes

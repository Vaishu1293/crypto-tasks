import express from 'express';
import { getNFTMetaData } from '../controllers/miscellaneousController.js';
// import { createTransaction, getTransactions } from '../controllers/transactionsController.js';
// const requireAuth = require("../middleware/requireAuth.js");

const router = express.Router();

// router.use(requireAuth);

router.post("/nft", getNFTMetaData);



const miscellaneousRoutes = router

export default miscellaneousRoutes

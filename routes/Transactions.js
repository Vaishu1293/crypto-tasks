import express from 'express';
import { getTransactions, queryTransactions, transferTokens } from '../controllers/transactionsController.js';
// const requireAuth = require("../middleware/requireAuth.js");

const router = express.Router();

// router.use(requireAuth);

// router.post("/", createTransaction);
// Route to get transactions by address
router.post('/', getTransactions);

// Route to query transactions by date range
router.get('/query', queryTransactions);

router.post('/transfer-tokens', transferTokens);

const transactionsRoutes = router

export default transactionsRoutes

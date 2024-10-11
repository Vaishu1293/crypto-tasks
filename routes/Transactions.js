import express from 'express';
import { createTransaction, getTransactions } from '../controllers/transactionsController.js';
// const requireAuth = require("../middleware/requireAuth.js");

const router = express.Router();

// router.use(requireAuth);

router.post("/", createTransaction);

router.get("/", getTransactions);

const transactionsRoutes = router

export default transactionsRoutes

import express from 'express';
import { trade } from '../controllers/tradeController.js';

const router = express.Router();

// router.use(requireAuth);

router.post("/", trade);

const tradeRoutes = router

export default tradeRoutes

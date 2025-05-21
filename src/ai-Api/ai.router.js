import express from 'express';
import { getAiPredictionsByTask } from '../ai-Api/ai.controller.js';
import {authenticateToken} from '../middleware/auth.js';
const router = express.Router();

router.get('/ai-predictions/:task_id',authenticateToken ,getAiPredictionsByTask);

export default router;
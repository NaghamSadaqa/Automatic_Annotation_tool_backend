import express from 'express';
import {authenticateToken} from '../middleware/auth.js';
import { asyncHandler } from '../utils/catchError.js';
import { getAllSentences, getSentenceByid, getSentencesByTask, getSentenceTextsByTask } from './sentence.controller.js';

const router = express.Router();


router.get("/getallsentences", authenticateToken, asyncHandler(getAllSentences));

router.get("/:id",authenticateToken , asyncHandler(getSentenceByid));

router.get('/:task_id/sentences', authenticateToken,getSentencesByTask);

router.get('/:task_id/sentenceText', authenticateToken,getSentenceTextsByTask);
export default router;


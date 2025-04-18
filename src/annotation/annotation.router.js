import express from 'express';
import {authenticateToken} from '../middleware/auth.js';
import { annotateSentence, getSentenceWithPosition } from './annotation.controller.js';
const router = express.Router();

router.post("/:task_id/annotate", authenticateToken,annotateSentence );
router.get("/:task_id/position",authenticateToken , getSentenceWithPosition )

export default router;
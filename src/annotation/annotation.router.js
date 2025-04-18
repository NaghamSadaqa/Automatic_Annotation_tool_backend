import express from 'express';
import {authenticateToken} from '../middleware/auth.js';
import { annotateSentence, getSentenceWithPosition, updateAnnotation } from './annotation.controller.js';
const router = express.Router();

router.post("/:task_id/annotate", authenticateToken,annotateSentence );
router.get("/:task_id/position",authenticateToken , getSentenceWithPosition );
router.post("/:task_id/updateLabeling", authenticateToken, updateAnnotation);
export default router;
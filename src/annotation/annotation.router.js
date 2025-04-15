import express from 'express';
import {authenticateToken} from '../middleware/auth.js';
import { annotateSentence } from './annotation.controller.js';
const router = express.Router();

router.post("/:task_id/annotate", authenticateToken,annotateSentence );


export default router;
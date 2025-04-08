

import {authenticateToken }from '../middleware/auth.js';
import {Router} from 'express';
import upload from '../utils/multer.js';
import { asyncHandler } from '../utils/catchError.js';
import { uploadFile } from './upload.controller.js';
const router = Router();


router.post("/upload", authenticateToken, upload.single("dataSetFile"), asyncHandler(uploadFile));

export default router;
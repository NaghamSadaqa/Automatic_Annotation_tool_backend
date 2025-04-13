import express from "express";
const router = express.Router();
import {authenticateToken} from '../middleware/auth.js';
import {owntasks, taskcollaborator} from './user.controller.js';



router.get('/owned-tasks',authenticateToken,owntasks);
router.get('/collaborated-tasks',authenticateToken,taskcollaborator)
export default router;
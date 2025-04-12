import express from "express";
const router = express.Router();
import {authenticateToken} from '../middleware/auth.js';
import {owntasks} from './user.controller.js';



router.get('/:user_id/owned-tasks',owntasks);

export default router;
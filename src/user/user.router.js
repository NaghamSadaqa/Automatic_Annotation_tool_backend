import express from "express";
const router = express.Router();
import {authenticateToken} from '../middleware/auth.js';
import {owntasks, taskcollaborator} from './user.controller.js';



router.get('/:user_id/owned-tasks',owntasks);
router.get('/:user_id/collaborated-tasks',taskcollaborator)
export default router;
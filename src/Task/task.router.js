import express from "express";
const router = express.Router();


import {authenticateToken} from '../middleware/auth.js';
import {newCollaborator} from './task.controller.js';
import {search} from './task.controller.js';

router.post("/:task_id/invite", authenticateToken , newCollaborator);
router.get("/search",search)


export default router;
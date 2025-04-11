import express from "express";
const router = express.Router();


import {authenticateToken} from '../middleware/auth.js';
import {newCollaborator} from './task.controller.js';


router.post("/:task_id/invite", authenticateToken , newCollaborator);



export default router;
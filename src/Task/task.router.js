import express from "express";
const router = express.Router();
import {authenticateToken} from '../middleware/auth.js';
import {people_with_access, reject, sendinvitation} from './task.controller.js';
import {search} from './task.controller.js';
import { accept } from "./task.controller.js";


router.get("/search",search);
router.post("/:task_id/invite", authenticateToken , sendinvitation);
router.post("/invitations/:invitation_id/accept",  authenticateToken , accept);
router.post("/invitations/:invitation_id/reject",  authenticateToken , reject);
router.get("/:task_id/collaborators", people_with_access);


export default router;
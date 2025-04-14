import express from "express";
const router = express.Router();
import {authenticateToken} from '../middleware/auth.js';
import {getTaskDetails, people_with_access, reject, sendinvitation} from './task.controller.js';
import {search} from './task.controller.js';
import { accept } from "./task.controller.js";


router.get("/search",authenticateToken,search);
router.post("/:task_id/invite", authenticateToken , sendinvitation);
router.post("/invitations/:invitation_id/accept",  authenticateToken , accept);
router.post("/invitations/:invitation_id/reject",  authenticateToken , reject);
router.get("/:task_id/collaborators",authenticateToken ,people_with_access);
router.get("/:task_id/details",authenticateToken ,getTaskDetails);

export default router;
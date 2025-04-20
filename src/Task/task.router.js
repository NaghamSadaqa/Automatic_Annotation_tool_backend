import express from "express";
const router = express.Router();
import {authenticateToken} from '../middleware/auth.js';
import {deleteTask, getReceivedInvitations, getTaskDetails, people_with_access, reject, sendinvitation, UnannotatedSentence, updateTask} from './task.controller.js';
import {search} from './task.controller.js';
import { accept } from "./task.controller.js";


router.get("/search",authenticateToken,search);
router.post("/:task_id/invite", authenticateToken , sendinvitation);
router.post("/invitations/:invitation_id/accept",  authenticateToken , accept);
router.post("/invitations/:invitation_id/reject",  authenticateToken , reject);
router.get("/:task_id/collaborators",authenticateToken ,people_with_access);
router.get("/:task_id/details",authenticateToken ,getTaskDetails);
router.delete('/:task_id', authenticateToken, deleteTask);

router.get('/:task_id/sentences/unannotated',authenticateToken , UnannotatedSentence);
router.get('/getUserInvitation',authenticateToken , getReceivedInvitations );
router.post('/:task_id/updateTask', authenticateToken ,updateTask );
export default router;
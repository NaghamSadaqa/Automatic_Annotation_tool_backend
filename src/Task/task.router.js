import express from "express";
const router = express.Router();
import {authenticateToken} from '../middleware/auth.js';
import {deleteTask, getReceivedInvitations, getTaskDetails, getTaskFiles, people_with_access, reject, removeCollaborator, sendinvitation, UnannotatedSentence, updateTask} from './task.controller.js';
import {search} from './task.controller.js';
import { accept } from "./task.controller.js";


router.get("/search",authenticateToken,search);
router.post("/:task_id/invite", authenticateToken , sendinvitation);
router.post("/invitations/:invitation_id/accept",  authenticateToken , accept);
router.post("/invitations/:invitation_id/reject",  authenticateToken , reject);
router.get("/:task_id/collaborators",authenticateToken ,people_with_access);
router.get("/:task_id/details",authenticateToken ,getTaskDetails);

router.delete('/:task_id', authenticateToken, deleteTask);// وهاي برضو عشان دستروي ما بدنا اياها فرح اضيف عمود بجدول الانوتيشن تاسك 

router.get('/:task_id/sentences/unannotated',authenticateToken , UnannotatedSentence);
router.get('/getUserInvitation',authenticateToken , getReceivedInvitations );


router.post('/:task_id/updateTask', authenticateToken ,updateTask );//  لازم اضيف هون شرط انه بس المالكين للتاسك بقدرو يعدلو عليها
router.delete('/:task_id/collaborators/:collaborator_id', authenticateToken , removeCollaborator); // تم هون رح نخليها دستروي

router.get('/:task_id/files', authenticateToken ,getTaskFiles);


export default router;

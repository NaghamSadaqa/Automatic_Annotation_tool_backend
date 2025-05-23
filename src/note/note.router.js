import express from 'express';
import {authenticateToken} from '../middleware/auth.js';
import { addNote, getallNotes } from './note.controller.js';
const router = express.Router();


router.post("/addnotes", authenticateToken , addNote );
router.get("/:task_id/getallnotes", authenticateToken, getallNotes);
export default router;
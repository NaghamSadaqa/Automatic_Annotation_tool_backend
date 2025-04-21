import express from "express";
const router = express.Router();
import {authenticateToken} from '../middleware/auth.js';
import {changePassword, owntasks, taskcollaborator, updateProfile} from './user.controller.js';



router.get('/owned-tasks',authenticateToken,owntasks);
router.get('/collaborated-tasks',authenticateToken,taskcollaborator);

router.post('/editAccountInfo', authenticateToken,updateProfile );
router.post('/changePassword',authenticateToken,  changePassword);
export default router;
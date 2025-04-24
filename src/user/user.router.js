import express from "express";
const router = express.Router();
import {authenticateToken} from '../middleware/auth.js';
import {changePassword, deleteAccount, getUserData, getUserTaskStatus, owntasks, taskcollaborator, updateProfile} from './user.controller.js';



router.get('/owned-tasks',authenticateToken,owntasks);
router.get('/collaborated-tasks',authenticateToken,taskcollaborator);

router.post('/editAccountInfo', authenticateToken,updateProfile );
router.post('/changePassword',authenticateToken,  changePassword);
router.post('/deleteAccount', authenticateToken,deleteAccount);
router.get('/getUserData', authenticateToken, getUserData);
router.get('/task-status', authenticateToken , getUserTaskStatus);
export default router;
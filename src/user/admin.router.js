import {authenticateToken} from '../middleware/auth.js';
import UserModel from "../../DB/model/user.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { where } from 'sequelize';
import { AppError } from '../utils/AppError.js';
import {Router} from 'express';
import { addUsers, deleteTasks, deleteUsers, fetchAllData } from './admin.controller.js';
const router = Router();


// اضافة مستخدمين من قبل الادمن فقط 
router.post("/addusers", authenticateToken, addUsers);

  
router.delete('/deleteTasks',authenticateToken , deleteTasks );
router.delete('/deleteUsers', authenticateToken , deleteUsers);
router.get('/data', authenticateToken , fetchAllData);





export default router;
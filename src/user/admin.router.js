import {authenticateToken} from '../middleware/auth.js';
import UserModel from "../../DB/model/user.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { where } from 'sequelize';
import { AppError } from '../utils/AppError.js';
import {Router} from 'express';
const router = Router();


// اضافة مستخدمين من قبل الادمن فقط 
router.post("/addusers", authenticateToken, async (req, res) => {
    
    if (req.user.role !== "admin")  return next(new AppError("Access denied!", 403));

    const {userName, email, password, dateofbirth } = req.body;
        
    const existingUser = await UserModel.findOne({ where: { email } });
    if (existingUser) {
        return next(new AppError("Email already exists!", 400));
    }
        const hashedPassword =  bcrypt.hash(password, 8);
        
        const newUser = await UserModel.create({userName, email, password: hashedPassword, dateofbirth });
        await user.save();
        res.status(201).json({
            message: "User created successfully!",
            user: {
                id: newUser.user_id,
                userName: newUser.userName,
                email: newUser.email,
                dateofbirth: newUser.dateofbirth
            }
        });
    });

  


router.delete("/users/:id", authenticateToken, async (req, res) => {
    
        if (req.user.role !== "admin") return next(new AppError("Access denied!", 403));

        const { id } = req.params;
        const user = await UserModel.findByPk(id);
        
        if (!user || user.is_deleted)  return next(new AppError("User not found!", 404));

        user.is_deleted = true;
        await user.save();

        res.json({ message: "User marked as deleted!" });

    
});

export default router;
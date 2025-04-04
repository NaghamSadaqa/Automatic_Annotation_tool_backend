import authenticateToken from '../middleware/auth.js';
import UserModel from "../../DB/model/user.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { where } from 'sequelize';
import {Router} from 'express';
const router = Router();


// اضافة مستخدمين من قبل الادمن فقط 
router.post("/addusers", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied!" });

        const {userName, email, password, dateofbirth } = req.body;
        const hashedPassword =  bcrypt.hash(password, 8);
        
        const newUser = await UserModel.create({userName, email, password: hashedPassword, dateofbirth });
        await user.save();
        res.status(201).json({ message: "User created successfully!", user: newUser });

    } catch (error) {
        res.status(500).json({ error: "Internal server error!" });
    }
});

router.delete("/users/:id", authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied!" });

        const { id } = req.params;
        const user = await UserModel.findByPk(id);
        
        if (!user || user.is_deleted) return res.status(404).json({ error: "User not found!" });

        user.is_deleted = true;
        await user.save();

        res.json({ message: "User marked as deleted!" });

    } catch (error) {
        res.status(500).json({ error: "Internal server error!" });
    }
});

export default router;
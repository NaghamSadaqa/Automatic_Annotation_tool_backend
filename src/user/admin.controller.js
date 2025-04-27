import {authenticateToken} from '../middleware/auth.js';
import UserModel from "../../DB/model/user.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { where } from 'sequelize';
import { AppError } from '../utils/AppError.js';
import {Router} from 'express';
import AnnotationTaskModel from '../../DB/model/annotationtask.js';
import { Sequelize } from "sequelize";
import { Op } from "sequelize";
const router = Router();


export const deleteTasks = async (req, res)=>{
    try{
        if (req.user.role !== "admin"){
        return res.status(400).json({message:"Access denied, Admins only."});
        }   
    const {taskIds }= req.body;
    if(!Array.isArray(taskIds)|| taskIds.length===0){
        return res.status(400).json({message:"Task ids array is required."});
    }
    await AnnotationTaskModel.destroy({
        where:{
            task_id : taskIds
        }
    });
    return res.status(200).json({message:"tasks deleted successfully"});

    }catch(error){
        console.error("Error deleting tasks:", error);
        res.status(500).json({ message: "Server error." });
    }
};


export const deleteUsers = async (req, res) => {
    try {
      const { userIds } = req.body;
      const requesterRole = req.user.role; // من التوكن
  
      if (requesterRole !== "admin") {
        return res.status(403).json({ message: "Unauthorized, Only admins can delete users." });
      }
  
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "Please provide a list of user IDs to delete." });
      }
  
      // نعمل update للـ is_deleted بدل destroy
      const updated = await UserModel.update(
        { is_deleted: true },
        { where: { user_id: { [Op.in]: userIds } } }
      );
  
      return res.status(200).json({ message: "Users soft-deleted successfully.", updated });
      
    } catch (error) {
      console.error("Error deleting users:", error);
      return res.status(500).json({ message: "Server error." });
    }
  };



  export const fetchAllData = async (req, res) => {
    try {
        if (req.user.role !== "admin"){
            return res.status(400).json({message:"Access denied, Admins only."});
         }    
      const users = await UserModel.findAll({
        attributes: ['user_id', 'userName', 'email', 'role', 'createdAt'],
        where: { is_deleted: false , 
            role: { [Sequelize.Op.ne]: 'admin' }  
        }
      });
  
      const tasks = await AnnotationTaskModel.findAll({
        attributes: ['task_id', 'task_name', 'task_description', 'annotation_type', 'labels', 'status', 'created_by', 'createdAt'],
        include: [{
          model: UserModel,
          as: 'Owner',
          attributes: ['user_id', 'userName', 'email']
        }]
      });
  
      res.status(200).json({
        users,
        tasks
      });
  
    } catch (error) {
      console.error("Error fetching all data:", error);
      res.status(500).json({ message: "Server error." });
    }
  };















export const addUsers = async (req, res) => {
    
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
    };
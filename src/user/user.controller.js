import express from 'express';
import AnnotationTaskModel from '../../DB/model/annotationtask.js';
import TaskCollaboratorModel from '../../DB/model/taskcollaborator.js';
import AnnotationModel from '../../DB/model/annotation.js';
import SentenceModel from '../../DB/model/sentence.js';
import UserModel from '../../DB/model/user.js';
import { Op } from "sequelize";
import bcrypt from 'bcryptjs';
const router = express.Router();

export const owntasks = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    //  Owned Tasks
    const ownedTasks = await AnnotationTaskModel.findAll({
      where: { created_by: user_id },
      attributes: ['task_id', 'task_name', 'task_description', 'labels', 'annotation_type', 'createdAt'],
    });

    //  Shared Tasks (اللي المستخدم مشارك فيها عن طريق TaskCollaborator)
    const collaborations = await TaskCollaboratorModel.findAll({
      where: { user_id },
      include: [{
        model: AnnotationTaskModel,
        as: 'Task',
        attributes: ['task_id', 'task_name', 'task_description', 'labels', 'annotation_type', 'created_by', 'createdAt'],
      }]
    });

    // استخراج التاسكات المشتركة من العلاقات
    const sharedTasks = collaborations
      .map(collab => collab.Task)
      .filter(task => task && task.created_by !== user_id);  // نتاكد انه مش مالك

    const buildTaskData = async (task) => {
      const totalClassified = await AnnotationModel.count({
        where: {
          task_id: task.task_id,
          annotator_id: user_id,
          label: { [Op.not]: 'none' }
        }
      });

      const totalSkipped = await AnnotationModel.count({
        where: {
          task_id: task.task_id,
          annotator_id: user_id,
          label: 'none'
        }
      });

      const totalSentences = await SentenceModel.count({
        where: { task_id: task.task_id }
      });

      return {
        ...task.toJSON(),
        status: {
          total_classified: totalClassified,
          total_skipped: totalSkipped,
          total_sentences: totalSentences
        }
      };
    };

    const ownedTaskDetails = await Promise.all(ownedTasks.map(buildTaskData));
    const sharedTaskDetails = await Promise.all(sharedTasks.map(buildTaskData));

    res.json({
      ownedTasks: ownedTaskDetails,
      sharedTasks: sharedTaskDetails
    });

  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};







export const taskcollaborator = async (req, res) => {
    const { user_id } = req.user;
  
    try {
      const collaborations = await TaskCollaboratorModel.findAll({
        where: { user_id },
        include: {
          model: AnnotationTaskModel,
          as: 'Task',
          attributes: ['task_id', 'task_name', 'task_description', 'annotation_type', 'labels', 'created_by', 'createdAt']
        }
      });
  
      const collaboratedTasks = collaborations.map(col => col.Task);
  
      res.status(200).json({ tasks: collaboratedTasks });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };


  export const updateProfile = async (req, res) => {
    const user_id = req.user.user_id;
    const { userName , email, birthofdate } = req.body;
  
    try {
      const user = await UserModel.findOne({ where: { user_id, is_deleted: false } });
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      // تحديث البيانات
      if (userName) user.userName = userName;
      if (email) user.email = email;
      if (birthofdate) user.dateofbirth = birthofdate;
  
      await user.save();
  
      res.status(200).json({
        message: "Profile updated successfully.",
        user: {
          user_id: user.user_id,
          userName: user.userName,
          email: user.email,
          birthofdate: user.dateofbirth,
          role: user.role
        }
      });
  
    } catch (err) {
      console.error("Update profile error:", err);
      res.status(500).json({ message: "Server error." });
    }
  };




  export const changePassword = async (req, res) => {
    const user_id = req.user.user_id;
    const { current_password, new_password } = req.body;
  
    try {
      const user = await UserModel.findOne({ where: { user_id, is_deleted: false } });
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      const isMatch = await bcrypt.compare(current_password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect." });
      }
  
      const hashedPassword = await bcrypt.hash(new_password, 8);
      user.password = hashedPassword;
      await user.save();
  
      res.status(200).json({ message: "Password changed successfully." });
  
    } catch (err) {
      console.error("Change password error:", err);
      res.status(500).json({ message: "Server error." });
    }
  };
  

  export const deleteAccount = async (req, res) => {
    const user_id = req.user.user_id;
  
    try {
      const user = await UserModel.findOne({
        where: {
          user_id,
          is_deleted: false
        }
      });
  
      if (!user) {
        return res.status(404).json({ message: "User not found or already deleted." });
      }
  
      await user.update({ is_deleted: true });
  
      return res.status(200).json({ message: "Account deleted successfully." });
    } catch (error) {
      console.error("Error deleting account:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };


  export const getUserData = async (req, res) => {
    const user_id = req.user.user_id;
  
    try {
      const user = await UserModel.findOne({
        where: { user_id, is_deleted: false },
        attributes: ['userName', 'email', 'dateofbirth', 'createdAt', 'updatedAt']
      });
  
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      return res.status(200).json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  };



  export const getUserTaskStatus = async (req, res) => {
    try {
      const user_id = req.user.user_id;
  
      // عدد المهام التي يملكها المستخدم
      const ownedTasks = await AnnotationTaskModel.count({
        where: { created_by: user_id }
      });
  
      // عدد المهام التي تم مشاركتها مع المستخدم
      const sharedTasks = await TaskCollaboratorModel.count({
        where: { user_id: user_id }
      });
  
      // عدد المهام المكتملة التي يملكها المستخدم
      const ownedCompletedTasks = await AnnotationTaskModel.count({
        where: {
          created_by: user_id,
          status: 'completed'
        }
      });
  
      // عدد المهام المكتملة التي تمت مشاركتها مع المستخدم
      const sharedCompletedTasks = await AnnotationTaskModel.count({
        include: [{
          model: TaskCollaboratorModel,
         as: "Collaborators", 
          where: { user_id: user_id , status: 'completed'}
        }]
       
      });
  
      return res.status(200).json({
        information: {
          ownedTasks,
          sharedTasks,
          sharedCompletedTasks,
          ownedCompletedTasks
        }
      });
  
    } catch (error) {
      console.error("Error getting task stats:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };






  




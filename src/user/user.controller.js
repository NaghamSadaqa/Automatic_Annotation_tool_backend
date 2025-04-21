import express from 'express';
import AnnotationTaskModel from '../../DB/model/annotationtask.js';
import TaskCollaboratorModel from '../../DB/model/taskcollaborator.js';
import AnnotationModel from '../../DB/model/annotation.js';
import SentenceModel from '../../DB/model/sentence.js';
import UserModel from '../../DB/model/user.js';
import { Op } from "sequelize";
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
        return res.status(401).json({ message: "User not found." });
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
  




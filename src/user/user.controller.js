import express from 'express';
import AnnotationTaskModel from '../../DB/model/annotationtask.js';
import TaskCollaboratorModel from '../../DB/model/taskcollaborator.js'
const router = express.Router();

export const owntasks = async (req, res) => {
  const { user_id } = req.params;

  try {
    const ownedTasks = await AnnotationTaskModel.findAll({
      where: { created_by: user_id },
      attributes: ['task_id', 'task_name', 'task_description', 'annotation_type', 'labels', 'created_by', 'createdAt']
    });

    res.status(200).json({ tasks: ownedTasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


export const taskcollaborator = async (req, res) => {
    const { user_id } = req.params;
  
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
  




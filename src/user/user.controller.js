import express from 'express';
import AnnotationTaskModel from '../../DB/model/annotationtask.js';

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




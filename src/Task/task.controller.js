import express from "express";
import TaskCollaboratorModel from "../../DB/model/taskcollaborator.js";
import AnnotationTaskModel from "../../DB/model/annotationtask.js";
import {authenticateToken} from "../middleware/auth.js";
import UserModel from "../../DB/model/user.js";
import InvitationModel from '../../DB/model/invitation.js';
import AnnotationModel from "../../DB/model/annotation.js";
import SentenceModel from "../../DB/model/sentence.js";
import { Op } from "sequelize";

// هاد عشان عملية البحث عن الايميل باول حرف بدخله
export const search = async (req, res) => {
  const { query, task_id } = req.query;

  if (!query || query.trim() === "" || !task_id) {
    return res.status(400).send({
      ErrorMsg: "Please provide a valid search query and task_id.",
      ErrorFields: {
        query: "Query is required.",
        task_id: "Task ID is required."
      },
    });
  }

  try {
    //  هات اليوزرز المشاركين بالتاسك
    const sharedUsers = await TaskCollaboratorModel.findAll({
      where: { task_id },
      attributes: ['user_id'],
    });

    const sharedUserIds = sharedUsers.map(user => user.user_id);

    // جيب فقط اليوزرز اللي مش مشاركين بالتاسك وببلشو بالايميل اللي ببحث عنه
    const users = await UserModel.findAll({
      where: {
        email: {
          [Op.like]: `${query}%`,
        },
        is_deleted: 0,
        user_id: {
          [Op.notIn]: sharedUserIds,
        }
      },
      attributes: ['user_id', 'email', 'userName'],
      limit: 10,
    });

    const response = users.map(user => ({
      user_id: user.user_id,
      email: user.email,
      name: user.userName,
    }));

    res.json(response);

  } catch (error) {
    console.error(error);
    return res.status(500).send({
      ErrorMsg: "Oops! Something went wrong while searching. Please try again later.",
      ErrorFields: null,
    });
  }
};





  // ارسال دعوة للمستخدمين يعملو انوتيشن على نفس التاسك
  export const sendinvitation= async (req, res) => {
    const { task_id } = req.params;
    const { selectedUsers, message } = req.body;
    const sender_id = req.user.user_id;
  
    if (!Array.isArray(selectedUsers) || selectedUsers.length === 0) {
      return res.status(400).send({
        ErrorMsg: "No users selected for invitation.",
        ErrorFields: {
          selectedUsers: "Please select at least one user."
        }
      });
    }
  
    try {
      const task = await AnnotationTaskModel.findByPk(task_id);
      if (!task) {
        return res.status(404).send({
          ErrorMsg: "Task not found.",
          ErrorFields: null
        });
      }
  
      for (const email of selectedUsers) {
        const receiver = await UserModel.findOne({ where: { email, is_deleted: false } });
        if (!receiver) continue;
  
        const alreadyInvited = await InvitationModel.findOne({
          where: {
            task_id,
            receiver_id: receiver.user_id,
            status: 'pending'
          }
        });
  
        if (alreadyInvited) continue;
  
        await InvitationModel.create({
          task_id,
          sender_id,
          receiver_id: receiver.user_id,
          message
        });
      }
  
      return res.status(200).json({ message: "Invitations sent successfully" });
  
    } catch (err) {
      console.error(err);
      return res.status(500).send({
        ErrorMsg: "Oops, an error occurred during the process, try again.",
        ErrorFields: null
      });
    }
  };



 //قبول الدعوة

 export const accept = async (req, res) => {
  const { invitation_id } = req.params;
  const receiver_id = req.user.user_id;

  try {
    const invitation = await InvitationModel.findOne({
      where: {
        id: invitation_id,
        receiver_id,
        status: 'pending'
      }
    });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found or already processed" });
    }

    
    await TaskCollaboratorModel.create({
      task_id: invitation.task_id,
      user_id: receiver_id
    });

    
    invitation.status = 'accepted';
    await invitation.save();

    return res.status(200).json({ message: "Invitation accepted and added to task" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



// رفض الدعوة 
export const reject = async (req, res) => {
  const { invitation_id } = req.params;
  const receiver_id = req.user.user_id;

  try {
    const invitation = await InvitationModel.findOne({
      where: {
        id: invitation_id,
        receiver_id,
        status: 'pending'
      }
    });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found or already processed" });
    }

    // Update status to rejected
    invitation.status = 'rejected';
    await invitation.save();

    return res.status(200).json({ message: "Invitation rejected" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};




// نجيب كل المستخدمين الي مسموحلهم يشتغلو على التاسك سواء كان مالك المهمة نفسها او مشارك فيها
export const people_with_access = async (req, res) => {
  const { task_id } = req.params;

  try {
    // 1. تأكد من وجود المهمة
    const task = await AnnotationTaskModel.findByPk(task_id, {
      include: {
        model: UserModel,
        as: 'Owner',
        attributes: ['user_id', 'userName', 'email']
      }
    });

    if (!task) return res.status(404).json({ message: "Task not found" });

    // 2. جيب الـ collaborators من جدول العلاقة
    const collaborators = await TaskCollaboratorModel.findAll({
      where: { task_id },
      include: {
        model: UserModel,
        as: 'Collaborator',
        attributes: ['user_id', 'userName', 'email']
      }
    });

    // 3. رجعهم بالاستجابة
    const collaboratorsList = collaborators.map(c => ({
      user_id: c.Collaborator.user_id,
      name: c.Collaborator.userName,
      email: c.Collaborator.email,
      role: 'collaborator'// هاد ثابت لانه معروف انه هو مشارك 
    }));

    const ownerInfo = {
      user_id: task.Owner.user_id,
      name: task.Owner.userName,
      email: task.Owner.email,
      role: 'owner' // وهاد ثابت لانه هو الي عمل المهمة 
    };

    return res.status(200).json({
      task_id: task.task_id,
      people_with_access: [ownerInfo, ...collaboratorsList]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



// هون بدنا نجيب كل تفاصيل المهمة 

export const getTaskDetails = async (req, res) => {
  const { task_id } = req.params;
  const annotator_id = req.user.user_id; // من التوكن بعد ما تعمل middleware

  try {
    const task = await AnnotationTaskModel.findByPk(task_id, {
      attributes: ['task_id', 'task_name', 'task_description', 'annotation_type', 'labels', 'created_by', 'createdAt'],
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // عدد الجمل الكليّة
    const totalSentences = await SentenceModel.count({ where: { task_id } });

    // كم جملة أنجزها المستخدم الحالي
    const completedByUser = await AnnotationModel.count({
      where: {
        task_id,
        annotator_id
      }
    });

    //"حالة المهمة: إذا كل الجمل عملنالها انوتيشن من قبل الكل = "منتهية"، غير هيك = "جاري"
    const totalAnnotations = await AnnotationModel.count({ where: { task_id } });
    const status = totalAnnotations >= totalSentences ? "Completed" : "In Progress";

    // نجيب المشاركين
    const collaborators = await TaskCollaboratorModel.findAll({
      where: { task_id },
      include: [{
        model: UserModel,
        as: "Collaborator",
        attributes: ['user_id', 'userName', 'email']
      }]
    });

    const collaboratorList = collaborators.map(col => ({
      user_id: col.Collaborator.user_id,
      name: col.Collaborator.userName,
      email: col.Collaborator.email
    }));

    return res.status(200).json({
      task_id: task.task_id,
      task_name: task.task_name,
      task_description: task.task_description,
      annotation_type: task.annotation_type,
      labels: task.labels.split(','),
      total_sentences: totalSentences,
      completed_by_user: completedByUser,
      status,
      collaborators: collaboratorList
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



// حذف المهمة من قبل اليوزر الي قام بانشائها
export const deleteTask = async (req, res) => {
  const { task_id } = req.params;
  const user_id = req.user.user_id; // جاي من التوكن

  try {
    // نجيب المهمة
    const task = await AnnotationTaskModel.findOne({
      where: {
        task_id,
        is_deleted: 0
      }
    });

    if (!task) {
      return res.status(404).send({
        ErrorMsg: "Task not found.",
        ErrorFields: null
      });
    }

    // نتأكد إن المستخدم هو صاحب المهمة
    if (task.created_by !== user_id) {
      return res.status(403).send({
        ErrorMsg: "You are not authorized to delete this task.",
        ErrorFields: null
      });
    }

    // نحذف المهمة 
    task.is_deleted = 1;
    await task.save();

    return res.status(200).send({
      message: "Task deleted successfully."
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send({
      ErrorMsg: "Oops, an error occurred during the process. Try again.",
      ErrorFields: null
    });
  }
};






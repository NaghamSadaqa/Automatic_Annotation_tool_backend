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
    console.log("Message:", message);
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
     
      if (task.created_by !== sender_id) {
        return res.status(401).send({
          ErrorMsg: "You are not authorized to invite users to this task.",
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



export const getReceivedInvitations = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const invitations = await InvitationModel.findAll({
      where: { receiver_id: user_id , status: 'pending' // فقط الدعوات المعلقة
      },
        include: [
        {
          model: AnnotationTaskModel,
          as: 'Task',
          attributes: ['task_id', 'task_name', 'task_description']
        },
        {
          model: UserModel,
          as: 'Sender',
          attributes: ['user_id', 'userName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formatted = invitations.map(invite => ({
      invitation_id: invite.id,
      message: invite.message,
      status: invite.status,
      created_at: invite.createdAt,
      task: {
        task_id: invite.Task.task_id,
        name: invite.Task.task_name,
        description: invite.Task.task_description
      },
      sender: {
        user_id: invite.Sender.user_id,
        name: invite.Sender.userName,
        email: invite.Sender.email
      }
    }));

    res.status(200).json({ invitations: formatted });

  } catch (error) {
    console.error("Error fetching received invitations:", error);
    res.status(500).json({ message: "Server error" });
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
   // مرحلة التأكد انه هل اليوزر مشارك بالمهمة او مالك الها اذا لا مش مسموح يشوف المهمة وتفاصيلها
    const isOwner = task.created_by === annotator_id;

    const isCollaborator = await TaskCollaboratorModel.findOne({
      where: { task_id, user_id: annotator_id }
    });

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: 'Access denied: You are not authorized to view this task.' });
    } // سألت الفرونت عنها رح نشوف نخليها او كيف

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
    const annotatedCount = await AnnotationModel.count({
      where: {
        task_id,
        annotator_id,
        label: {
          [Op.ne]: 'none'  // not equal
        }
      }
    });

    // عدد الجمل التي تم عمل skip لها
    const skippedCount = await AnnotationModel.count({
      where: {
        task_id,
        annotator_id,
        label: 'none'
      }
    });
    return res.status(200).json({
      task_id: task.task_id,
      task_name: task.task_name,
      task_description: task.task_description,
      annotation_type: task.annotation_type,
      labels: task.labels.split(','),
      total_sentences: totalSentences,
      completed_by_user: completedByUser,
      status,
      collaborators: collaboratorList,
      annotatedCount,
      skippedCount
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};





// حذف المهمة من قبل اليوزر الي قام بانشائها
export const deleteTask = async (req, res) => {
  const { task_id } = req.params;
  const user_id = req.user.user_id;

  try {
    // التأكد من وجود المهمة و إنها فعلاً مملوكة لهذا المستخدم
    const task = await AnnotationTaskModel.findOne({
      where: {
        task_id,
        created_by: user_id
      }
    });

    if (!task) {
      return res.status(404).send({
        ErrorMsg: "Task not found or you are not authorized to delete it.",
        ErrorFields: null
      });
    }

    // حذف المهمة بشكل نهائي
    await task.destroy(); 
    res.json({ message: "Task deleted successfully" });

    return res.status(200).send({
      message: "Task deleted permanently."
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send({
      ErrorMsg: "Oops, an error occurred during the process. Try again.",
      ErrorFields: null
    });
  }
};





// هون بدي اعمل api 
// يرجعلي اول جملة مش مصنفة من قبل اليوزر لنفس المهمة
export const UnannotatedSentence = async (req, res) => {
  try {
    const { task_id } = req.params;
    const annotator_id = req.user.user_id;

    // Get all sentence IDs in this task
    const allSentences = await SentenceModel.findAll({
      where: { task_id },
      attributes: ['sentence_id', 'sentence_text'],
      
    });

    const allSentenceIds = allSentences.map(s => s.sentence_id);

    // Get sentence IDs already annotated by this user
    const userAnnotations = await AnnotationModel.findAll({
      where: { annotator_id, task_id },
      attributes: ['sentence_id', 'label'],
     
    });

    const annotatedIds = userAnnotations.map(a => a.sentence_id);
    const skippedIds = userAnnotations
      .filter(a => a.label === 'none')
      .map(a => a.sentence_id);

    // Find first unannotated sentence
    const unannotated = allSentences.find(s => !annotatedIds.includes(s.sentence_id));

    if (unannotated) {
      return res.status(200).json({ sentence: unannotated });
    }

    // If all annotated, return a skipped one (if any)
    if (skippedIds.length > 0) {
      const skippedSentence = allSentences.find(s => skippedIds.includes(s.sentence_id));
      return res.status(200).json({
        message: "You have annotated all sentences. Here is one of the skipped ones.",
        sentence: skippedSentence
      });
    }

    // If nothing left at all
    return res.status(200).json({ message: "You have annotated all sentences. No more skipped sentences to show." });

  } catch (error) {
    console.error("Error fetching unannotated sentence:", error);
    res.status(500).json({ message: "Server error" });
  }
};



export const updateTask = async (req, res) => {
  try {
    const { task_id } = req.params;
    const { task_name, task_description, annotation_type, labels } = req.body;

    // تحققت انه التاسك موجود
    const task = await AnnotationTaskModel.findByPk(task_id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // التحديث
    task.task_name = task_name;
    task.task_description = task_description;
    task.annotation_type = annotation_type;
    task.labels = labels;

    await task.save();

    res.status(200).json({
      message: "Task updated successfully",
      task: {
        task_id: task.task_id,
        task_name: task.task_name,
        task_description: task.task_description,
        annotation_type: task.annotation_type,
        labels: task.labels,
        updatedAt: task.updatedAt,
      },
    });

  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Server error" });
  }
};





export const removeCollaborator = async (req, res) => {
  try {
    const { task_id, collaborator_id } = req.params;
    const user_id = req.user.user_id;

    // اتاكد انه المستخدم هو صاحب التاسك
    const task = await AnnotationTaskModel.findOne({
      where: {
        task_id,
        created_by: user_id
      }
    });

    if (!task) {
      return res.status(403).json({ message: 'Unauthorized to modify this task.' });
    }

    // تأكدت انه الكولابوريتر موجود
    const deleted = await TaskCollaboratorModel.destroy({
      where: {
        task_id,
        user_id: collaborator_id
      }
    });

    if (deleted === 0) {
      return res.status(404).json({ message: 'Collaborator not found or already removed.' });
    }

    res.status(200).json({ message: 'Collaborator removed successfully.' });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ message: 'Server error' });
  }
};







import express from "express";
import TaskCollaborator from "../../DB/model/taskcollaborator.js";
import AnnotationTaskModel from "../../DB/model/annotationtask.js";
import {authenticateToken} from "../middleware/auth.js";

// ملاحظة الي : ممكن اضيف شغلة انه المستخدمين الثانيين يوافقو على الدعوة للمشاركة بالمهمة او لا رح يتم معالجتها في حال غيرنا 
 export const newCollaborator= async (req, res) => {
  try {
    const { task_id } = req.params;
    const { user_ids } = req.body;
    const owner_id = req.user.user_id;

    
    const task = await AnnotationTaskModel.findOne({
      where: { task_id, created_by: owner_id }
    });

    if (!task) {
      return res.status(403).json({ message: "You are not authorized to invite users to this task." });
    }

    const added = [];
    const skipped = [];

    for (const user_id of user_ids) {
      const exists = await TaskCollaborator.findOne({ where: { task_id, user_id } });

      if (exists) {
        skipped.push(user_id);
      } else {
        const newCollaborator = await TaskCollaborator.create({ task_id, user_id });
        added.push({ user_id: newCollaborator.user_id });
      }
    }

    return res.status(201).json({
      message: "Invitation process completed.",
      addedCount: added.length,
      skippedCount: skipped.length,
      addedUsers: added,
      skippedUsers: skipped
    });

  } catch (error) {
    console.error("Error while inviting users:", error);
    return res.status(500).json({ error: "Server error while inviting users." });
  }
}



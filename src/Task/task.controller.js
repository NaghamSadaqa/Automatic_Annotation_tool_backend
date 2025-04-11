import express from "express";
import TaskCollaboratorModel from "../../DB/model/taskcollaborator.js";
import AnnotationTaskModel from "../../DB/model/annotationtask.js";
import {authenticateToken} from "../middleware/auth.js";
import UserModel from "../../DB/model/user.js";
import InvitationModel from '../../DB/model/invitation.js';
import { Op } from "sequelize";

// هاد عشان عملية البحث عن الايميل باول حرف بدخله
 export const search = async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim() === "") {
    return res.status(400).send({
      ErrorMsg: "Please provide a valid search query.",
      ErrorFields: {
        query: "Query field is required."
      }
    });
  }

  try {
    const users = await UserModel.findAll({
      where: {
        email: {
          [Op.like]: `${query}%`  
        },
        is_deleted: false,
      },
      attributes: ['email','userName','user_id'],  
      limit: 10
    });

    const response = users.map(user =>({
      user_id: user.user_id,
      email: user.email,
      name: user.userName
    }));  
      res.json(response);  
    } catch (error) {
      console.error(error);
      return res.status(500).send({
        ErrorMsg: "Oops! Something went wrong while searching. Please try again later.",
        ErrorFields: null
      });
    }
  };



  // ارسال دعوة للمستخدمين يعملو انوتيشن على نفس التاسك
  export const sendinvitation= async (req, res) => {
    const { task_id } = req.params;
    const { email, message } = req.body;
    const sender_id = req.user.user_id;
  
    try {
      const task = await AnnotationTaskModel.findByPk(task_id);
      if (!task) return res.status(404).json({ message: "Task not found" });
  
      const receiver = await UserModel.findOne({ where: { email, is_deleted: false } });
      if (!receiver) return res.status(404).json({ message: "User not found" });
  
      const alreadyInvited = await InvitationModel.findOne({
        where: {
          task_id,
          receiver_id: receiver.user_id,
          status: 'pending'
        }
      });
  
      if (alreadyInvited) return res.status(400).json({ message: "User already invited" });
  
      await InvitationModel.create({
        task_id,
        sender_id,
        receiver_id: receiver.user_id,
        message,
      });
  
      return res.status(200).json({ message: "Invitation sent successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
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

    // Create TaskCollaborator entry
    await TaskCollaboratorModel.create({
      task_id: invitation.task_id,
      user_id: receiver_id
    });

    // Update invitation status
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






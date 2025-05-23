import express from "express";
import NoteModel  from "../../DB/model/note.js";
import SentenceModel from "../../DB/model/sentence.js";
import UserModel from "../../DB/model/user.js";
import { Op } from "sequelize";


 export const addNote = async (req, res) => {
  const { text, userId, sentenceId, sentenceText, label } = req.body;
  const senderId = req.user.user_id;

  try {
    const note = await NoteModel.create({
      text,
      sender_id: senderId,
      receiver_id: userId,
      sentence_id: sentenceId,
      sentence_text: sentenceText,
      label,
    });

    res.status(201).json({ message: "Note created successfully", note });
  } catch (err) {
    console.error("Error creating note:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const getallNotes= async (req, res) => {
  const { task_id } = req.params;
    console.log("params:", req.params);
  const currentUserId = req.user.user_id;

  try {
    // Step 1: Get all sentence IDs related to this task
    const sentences = await SentenceModel.findAll({
      where: { task_id: task_id },
      attributes: ['sentence_id']
    });

    const sentenceIds = sentences.map(s => s.sentence_id);

    if (sentenceIds.length === 0) {
      return res.status(404).json({ message: 'No sentences found for this task' });
    }

    // Step 2: Get notes written to this user on these sentences
    const notes = await NoteModel.findAll({
      where: {
        sentence_id: sentenceIds,
        receiver_id: currentUserId,
        sender_id: { [Op.ne]: currentUserId } // Exclude self-notes
      },
      include: [
        { model: SentenceModel, attributes: ['sentence_id', 'task_id'] },
        { model: UserModel, as: 'sender', attributes: ['userName', 'email'] }
      ]
    });

    const formattedNotes = notes.map(note => ({
      taskId: note.Sentence.task_id,
      sentenceId: note.sentence_id,
      noteContent: note.text,
      notedBy: note.sender.userName
    }));

    res.status(200).json({ notes: formattedNotes });

  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

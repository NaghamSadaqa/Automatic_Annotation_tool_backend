import express from 'express';
import fs from 'fs';
import csvParser from 'csv-parser';
import xlsx from 'xlsx';
import FileManager from '../../DB/model/filemanager.js';
import SentenceModel from '../../DB/model/sentence.js';
import { AppError } from '../utils/AppError.js';



// api بنعرض من خلاله كل ما يتعلق بتيبل الجمل 
 export  const getAllSentences = async (req, res) => {
    
    const sentences = await SentenceModel.findAll(); //attributes: ['sentence_text']  ترجع فقط عمود sentence_text
    return res.status(200).json(sentences);// ممكن احدد انه يرجع بس الجمل بدون اي معلومات تانية هون برجع كلشي عن الجمل سواء كنص  وغيره

};

// api منرجع الجمل لل id المدخل
export const getSentenceByid = async (req, res) => {
   
    const sentence = await SentenceModel.findByPk(req.params.id);
    if (!sentence) {
        return next(new AppError("Sentence not found", 404));
    }
    return res.status(200).json(sentence);

};

// هدول اخر 2 
// رح نستخدمهم لعرض الجمل التابعة لتاسك معين 
export const getSentencesByTask = async (req, res) => {
    try {
      const task_id = req.params.task_id;
  
      const sentences = await SentenceModel.findAll({
        where: { task_id: task_id },
        order: [['sentence_id', 'ASC']],
      });
  
      if (!sentences || sentences.length === 0) {
        return res.status(404).json({ message: 'No sentences found for this task.' });
      }
  
      res.json(sentences);
    } catch (error) {
      console.error('Error fetching sentences by task:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };



  export const getSentenceTextsByTask = async (req, res) => {
    try {
      const task_id = req.params.task_id;
  
      const sentences = await SentenceModel.findAll({
        where: { task_id: task_id },
        attributes: ['sentence_text'], // فقط النص
        order: [['sentence_id', 'ASC']],
      });
  
      if (!sentences || sentences.length === 0) {
        return res.status(404).json({ message: 'No sentences found for this task.' });
      }
  
      res.json(sentences);
    } catch (error) {
      console.error('Error fetching sentence texts by task:', error);
      res.status(500).json({ message: 'Server error' })
    }
}; // الفرق بين هاد api 
  // والي قبله انه هاد برجع بس الجمل للتاسك المعينة 
  // اما الي فوق برجع كلشي عن الجمل من رقمها وباي صف مجودة وغيرها اختارو الي بدكم ترجعوه منهم
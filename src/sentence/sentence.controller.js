import express from 'express';
import fs from 'fs';
import csvParser from 'csv-parser';
import xlsx from 'xlsx';
import FileManager from '../../DB/model/filemanager.js';
import SentenceModel from '../../DB/model/sentence.js';
import { AppError } from '../utils/AppError.js';



// Helper function to find a column name regardless of case
const findColumnName = (columns, possibleNames) => {
    return columns.find(col => possibleNames.includes(col.toLowerCase())) || null;
};

export const processAndSave =async (req, res) => {
    
    const { filePath } = req.query;

    if (!filePath) {
        return next(new AppError("File path is required!", 400));
    }

    if (!fs.existsSync(filePath)) {
        return next(new AppError("File not found!", 404));
    }

    const fileRecord = await FileManager.findOne({ where: { file_path: filePath } });
    if (!fileRecord) {
        return next(new AppError("File not found in database!", 404));
    }
    const task_id = fileRecord.task_id;

    let sentences = [];
    let fileExtension = filePath.split(".").pop();

    if (fileExtension === "csv") {
        await new Promise((resolve, reject) => {
            let headersProcessed = false;
            let sentenceCol = null;
            let idCol = null;
            
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on("data", (row) => {
                    if (!headersProcessed) {
                        const columns = Object.keys(row);
                        sentenceCol = findColumnName(columns, ["sentence", "text", "content"]);
                        idCol = findColumnName(columns, ["id", "row", "row number","index"]);
                        headersProcessed = true;
                    }

                    if (sentenceCol) {
                        const sentence = row[sentenceCol];
                        const originalFileRowId = idCol ? row[idCol] : null;
                        
                        if (sentence) {
                            sentences.push({ sentence_text: sentence, task_id, original_file_row_id: originalFileRowId });
                        }
                    }
                })
                .on("end", resolve)
                .on("error", reject);
        });
    } else if (fileExtension === "xlsx") {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        if (sheetData.length > 0) {
            const columns = Object.keys(sheetData[0]);
            const sentenceCol = findColumnName(columns, ["sentence", "text", "content"]);
            const idCol = findColumnName(columns, ["id", "row", "row number","index"]);
            
            sentences = sheetData
                .map(row => ({
                    sentence_text: sentenceCol ? row[sentenceCol] : null,
                    original_file_row_id: idCol ? row[idCol] : null,
                    task_id
                }))
                .filter(entry => entry.sentence_text); // Remove empty sentences
        }
    } else {
        return next(new AppError("Invalid file format. Use CSV or Excel.", 400));
    }

    if (sentences.length === 0) {
        return next(new AppError("No valid sentences found in the file!", 400));
    }

    // Save sentences to database
    const savedSentences = await SentenceModel.bulkCreate(sentences);

    res.status(201).json({
        message: `Successfully saved ${savedSentences.length} sentences!`,
        sentences: savedSentences.map(s => s.sentence_text)
    });

};

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
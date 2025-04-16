import express from 'express';
import AnnotationTaskModel from '../../DB/model/annotationtask.js';
import FileManager from '../../DB/model/filemanager.js';
import { AppError } from '../utils/AppError.js';
import fs from 'fs';
import xlsx from 'xlsx';
import csvParser from 'csv-parser';
import SentenceModel from '../../DB/model/sentence.js';

export const uploadFile = async (req, res, next) => {
    
    const { task_name, task_description, annotation_type, labels } = req.body;
    const uploaded_by = req.user.user_id; // استخراج user_id من التوكن

    if (!req.file) {
        return next(new AppError("A valid file must be uploaded", 400));
    }
    

    //   إنشاء مهمة جديدة في AnnotationTaskModel
    const newTask = await AnnotationTaskModel.create({
        task_name,
        task_description,
        annotation_type,
        labels,
        created_by: uploaded_by // ربط المهمة بالمستخدم
    });

    //  تخزين بيانات الملف في FileManager
    const newFile = await FileManager.create({
        file_name: req.file.filename,
        file_path: req.file.path,
        file_type: req.file.mimetype,
        uploaded_by,
        task_id: newTask.task_id // ربط الملف بالمهمة التي تم إنشاؤها
    });

    const filePath = req.file.path;
    let sentences = [];
    let fileExtension = req.file.originalname.split('.').pop().toLowerCase();

    const findColumnName = (columns, possibleNames) => {
        return columns.find(col => 
            possibleNames.some(name => col.toLowerCase().includes(name.toLowerCase()))
        );
    };
    try {
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
                            idCol = findColumnName(columns, ["id", "row", "row number", "index"]);
                            headersProcessed = true;
                        }

                        if (sentenceCol) {
                            const sentence = row[sentenceCol];
                            const originalFileRowId = idCol ? row[idCol] : null;
                            
                            if (sentence) {
                                sentences.push({
                                    sentence_text: sentence,
                                    task_id: newTask.task_id,
                                    original_file_row_id: originalFileRowId
                                });
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
                const idCol = findColumnName(columns, ["id", "row", "row number", "index"]);

                sentences = sheetData
                    .map(row => ({
                        sentence_text: sentenceCol ? row[sentenceCol] : null,
                        original_file_row_id: idCol ? row[idCol] : null,
                        task_id: newTask.task_id
                    }))
                    .filter(entry => entry.sentence_text);
            }
        } else {
            return next(new AppError("Invalid file format. Use CSV or Excel.", 400));
        }

        if (sentences.length === 0) {
            return next(new AppError("No valid sentences found in the file!", 400));
        }

        const savedSentences = await SentenceModel.bulkCreate(sentences);

        res.status(201).json({
            message: `Task created, file uploaded, and ${savedSentences.length} sentences saved successfully!`,
          
        });

    } catch (error) {
        return next(new AppError("Error processing file: " + error.message, 500));
    }
};


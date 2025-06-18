import express from 'express';
import AnnotationTaskModel from '../../DB/model/annotationtask.js';
import FileManager from '../../DB/model/filemanager.js';
import AnnotationModel from '../../DB/model/annotation.js';
import { AppError } from '../utils/AppError.js';
import fs from 'fs';
import xlsx from 'xlsx';
import csvParser from 'csv-parser';
import SentenceModel from '../../DB/model/sentence.js';
import { classifySentences } from "../utils/aiHelper.js";

export const uploadFile= async (req, res, next) => {
    const { task_name, task_description, annotation_type, labels } = req.body;
    const uploaded_by = req.user.user_id;

    if (!req.file) {
        return next(new AppError("A valid file must be uploaded", 400));
    }

    const filePath = req.file.path;
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();

    let sentences = [];

    const findColumnName = (columns, row, possibleNames) => {
        return columns.find(col => {
            if (!row[col]) return false; // تأكدت انه فيه بيانات
            return possibleNames.some(name => col.toLowerCase().includes(name.toLowerCase()));
        });
    };

    try {
        if (fileExtension === "csv") {
            await new Promise((resolve, reject) => {
                let headersProcessed = false;
                let sentenceCol = null;
                let idCol = null;
                let rowIndex = 1;

                fs.createReadStream(filePath)
                    .pipe(csvParser())
                    .on("data", (row) => {
                        if (!headersProcessed) {
                            const columns = Object.keys(row);
                            sentenceCol = findColumnName(columns, row, ["sentence", "text", "content","Feed"]);

                            // لو مش لاقي عمود نجيب أول عمود موجود فيه داتا
                            if (!sentenceCol && columns.length > 0) {
                                sentenceCol = columns[0];
                            }

                            idCol = findColumnName(columns, row, ["id", "row", "row number", "index"]);
                            headersProcessed = true;
                        }

                        if (sentenceCol) {
                            const sentence = row[sentenceCol];
                            const originalFileRowId = idCol ? row[idCol] : rowIndex;

                            if (sentence && typeof sentence === "string" && sentence.trim() !== "") {
                                sentences.push({
                                    sentence_text: sentence.trim(),
                                    task_id: null, // مؤقت بنحدثه بعدين
                                    original_file_row_id: originalFileRowId
                                });
                            }
                        }
                        rowIndex++;
                    })
                    .on("end", resolve)
                    .on("error", reject);
            });
        } else if (fileExtension === "xlsx") {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

            if (sheetData.length > 0) {
                const columns = Object.keys(sheetData[0]);
                let sentenceCol = findColumnName(columns, sheetData[0], ["sentence", "text", "content","Feed"]);

                if (!sentenceCol && columns.length > 0) {
                    sentenceCol = columns[0];
                }

                let idCol = findColumnName(columns, sheetData[0], ["id", "row", "row number", "index"]);

                let rowIndex = 1;
                sentences = sheetData.map(row => {
                    const sentence = sentenceCol ? row[sentenceCol] : null;
                    const originalFileRowId = idCol ? row[idCol] : rowIndex++;

                    if (sentence && typeof sentence === "string" && sentence.trim() !== "") {
                        return {
                            sentence_text: sentence.trim(),
                            task_id: null,
                            original_file_row_id: originalFileRowId
                        };
                    }
                    return null;
                }).filter(entry => entry !== null);
            }
        } else {
            return next(new AppError("Invalid file format. Use CSV or Excel.", 400));
        }

        if (sentences.length === 0) {
            return next(new AppError("No valid sentences found in the file!", 400));
        }

        // إنشاء المهمة
        const newTask = await AnnotationTaskModel.create({
            task_name,
            task_description,
            annotation_type,
            labels,
            created_by: uploaded_by
        });

        // تخزين بيانات الملف
        const newFile = await FileManager.create({
            file_name: req.file.filename,
            file_path: req.file.path,
            file_type: req.file.mimetype,
            uploaded_by,
            task_id: newTask.task_id
        });

        // تحديث الجمل بالـ task_id وربطهم بالمهمة
        const sentencesWithTaskId = sentences.map(sentence => ({
            ...sentence,
            task_id: newTask.task_id
        }));

        const savedSentences = await SentenceModel.bulkCreate(sentencesWithTaskId);

        
    // الخطوة الجديدة بعد التخزين
  if (["sentiment", "sarcasm", "stance"].includes(annotation_type)) {
  const sampleSize = Math.ceil(savedSentences.length * 0.1);
  const shuffled = [...savedSentences].sort(() => 0.5 - Math.random());
  const sampledSentences = shuffled.slice(0, sampleSize);

  const aiPredictions = await classifySentences(sampledSentences, annotation_type);

  const updatePromises = sampledSentences.map((sentence, index) => {
    const prediction = aiPredictions[index];
    if (prediction) {
      return sentence.update({
        ai_label: prediction.label,
        ai_score: prediction.score,
        is_sample: true
      });
    }
    return Promise.resolve();
  });

  await Promise.all(updatePromises);


       // إضافة نفس العينة للمالك كمهمة أنوتيشن
      const annotationEntries = sampledSentences.map(s => ({
        task_id: newTask.task_id,
        sentence_id: s.sentence_id,
        annotator_id: uploaded_by,
        label: null,
        certainty: null
      }));

      await AnnotationModel.bulkCreate(annotationEntries);
    
}

        res.status(201).json({
            message: `Task created, file uploaded, and ${savedSentences.length} sentences saved successfully! 10% of the sentences were sampled, classified using AI, and assigned to the task owner for annotation`,
        });

    } catch (error) {
        console.error(error);
        return next(new AppError("Error processing file: " + error.message, 500));
    }
};









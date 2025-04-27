import express from 'express';
import AnnotationTaskModel from '../../DB/model/annotationtask.js';
import FileManager from '../../DB/model/filemanager.js';
import { AppError } from '../utils/AppError.js';
import fs from 'fs';
import xlsx from 'xlsx';
import csvParser from 'csv-parser';
import SentenceModel from '../../DB/model/sentence.js';


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
                            sentenceCol = findColumnName(columns, row, ["sentence", "text", "content"]);

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
                let sentenceCol = findColumnName(columns, sheetData[0], ["sentence", "text", "content"]);

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

        res.status(201).json({
            message: `Task created, file uploaded, and ${savedSentences.length} sentences saved successfully!`,
        });

    } catch (error) {
        console.error(error);
        return next(new AppError("Error processing file: " + error.message, 500));
    }
};



export const uploadFile1 = async (req, res, next) => {
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
        if (!row[col]) return false; // تأكد فيه بيانات بالكولوم
        return possibleNames.some(name => col.toLowerCase().includes(name.toLowerCase()));
      });
    };
  
    try {
      if (fileExtension === "csv") {
        await new Promise((resolve, reject) => {
          let headersProcessed = false;
          let sentenceCol = null;
          let idCol = null;
          let labelCol = null;
          let hasHeader = true;
          let rowIndex = 1;
  
          fs.createReadStream(filePath)
            .pipe(csvParser({ headers: false })) // نقرأ بدون فرض headers
            .on("data", (row) => {
              if (!headersProcessed) {
                const columns = Object.keys(row);
  
                const numericColumns = columns.every(col => !isNaN(col));
                hasHeader = !numericColumns;
  
                if (hasHeader) {
                  sentenceCol = findColumnName(columns, row, ["sentence", "text", "content"]);
                  idCol = findColumnName(columns, row, ["id", "row", "row number", "index"]);
                  labelCol = findColumnName(columns, row, ["label", "sentiment", "classification"]);
  
                  if (!sentenceCol || !labelCol) {
                    return reject(new Error("Invalid file: Missing required columns (sentence or label)"));
                  }
                } else {
                  idCol = "0";
                  sentenceCol = "1";
                  labelCol = "2";
                }
  
                headersProcessed = true;
              }
  
              const sentence = row[sentenceCol];
              const originalFileRowId = row[idCol] || rowIndex;
              const label = row[labelCol];
  
              if (sentence && typeof sentence === "string" && sentence.trim() !== "") {
                sentences.push({
                  sentence_text: sentence.trim(),
                  task_id: null,
                  original_file_row_id: originalFileRowId,
                });
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
          const firstRow = sheetData[0];
  
          let sentenceCol = findColumnName(columns, firstRow, ["sentence", "text", "content"]);
          let idCol = findColumnName(columns, firstRow, ["id", "row", "row number", "index"]);
          let labelCol = findColumnName(columns, firstRow, ["label", "sentiment", "classification"]);
  
          if (!sentenceCol) {
            // إذا مش موجودة الأعمدة نتعامل مع 0,1,2
            sentenceCol = columns[1] || "1";
            idCol = columns[0] || "0";
          }
  
          let rowIndex = 1;
          sentences = sheetData.map(row => {
            const sentence = row[sentenceCol];
            const originalFileRowId = row[idCol] || rowIndex++;
  
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
      await FileManager.create({
        file_name: req.file.filename,
        file_path: req.file.path,
        file_type: req.file.mimetype,
        uploaded_by,
        task_id: newTask.task_id
      });
  
      // حفظ الجمل مع task_id
      const sentencesWithTaskId = sentences.map(sentence => ({
        ...sentence,
        task_id: newTask.task_id
      }));
  
      await SentenceModel.bulkCreate(sentencesWithTaskId);
  
      res.status(201).json({
        message: `Task created, file uploaded, and ${sentencesWithTaskId.length} sentences saved successfully!`,
      });
  
    } catch (error) {
      console.error(error);
      return next(new AppError("Error processing file: " + error.message, 500));
    }
  };






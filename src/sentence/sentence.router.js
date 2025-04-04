import express from 'express';
import fs from 'fs';
import csvParser from 'csv-parser';
import xlsx from 'xlsx';
import authenticateToken from '../middleware/auth.js';
import FileManager from '../../DB/model/filemanager.js';
import SentenceModel from '../../DB/model/sentence.js';

const router = express.Router();

// Helper function to find a column name regardless of case
const findColumnName = (columns, possibleNames) => {
    return columns.find(col => possibleNames.includes(col.toLowerCase())) || null;
};

router.post("/process-and-save", authenticateToken, async (req, res) => {
    try {
        const { filePath } = req.query;

        if (!filePath) {
            return res.status(400).json({ error: "File path is required!" });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "File not found!" });
        }

        const fileRecord = await FileManager.findOne({ where: { file_path: filePath } });
        if (!fileRecord) {
            return res.status(404).json({ error: "File not found in database!" });
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
            return res.status(400).json({ error: "Invalid file format. Use CSV or Excel." });
        }

        if (sentences.length === 0) {
            return res.status(400).json({ error: "No valid sentences found in the file!" });
        }

        // Save sentences to database
        const savedSentences = await SentenceModel.bulkCreate(sentences);

        res.status(201).json({
            message: `Successfully saved ${savedSentences.length} sentences!`,
            sentences: savedSentences.map(s => s.sentence_text)
        });
    } catch (error) {
        console.error("Error processing file:", error);
        res.status(500).json({ error: "Internal server error!" });
    }
});


router.get("/getallsentences", authenticateToken, async (req, res) => {
    try {
        const sentences = await SentenceModel.findAll();
        return res.status(200).json(sentences);// ممكن احدد انه يرجع بس الجمل بدون اي معلومات تانية هون برجع كلشي عن الجمل سواء كنص  وغيره
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


router.get("/:id",authenticateToken , async (req, res) => {
    try {
        const sentence = await SentenceModel.findByPk(req.params.id);
        if (!sentence) {
            return res.status(404).json({ message: "Sentence not found" });
        }
        return res.status(200).json(sentence);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;


import express from 'express';
import fs from 'fs';
import csvParser from 'csv-parser';
import xlsx from 'xlsx';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

//API لقراءة الجمل من ملف موجود
router.get("/read-sentences",authenticateToken , async (req, res) => {
    try {
        const { filePath } = req.query; 

        if (!filePath) {
            return res.status(400).json({ error: "The file path must be sent" });
        }

        let sentences = [];
        const fileExtension = filePath.split(".").pop(); // استخراج امتداد الملف

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "File not found" });
        }

        
        if (fileExtension === "csv") {
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on("data", (row) => {
                    const sentence = row["sentence"] || Object.values(row)[0]; // استخراج الجملة
                    if (sentence) {
                        sentences.push(sentence);
                    }
                })
                .on("end", () => {
                    res.status(200).json({ message: " success", sentences });
                });

        } else if (fileExtension === "xlsx") {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

          sentences = sheetData.map((row) => row["sentence"] || Object.values(row)[0]);
         
        
            res.status(200).json({ message: "success", sentences });

        } else {
            return res.status(400).json({ error: "The file format is wrong. Use csv or excel. " });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});






export default router;

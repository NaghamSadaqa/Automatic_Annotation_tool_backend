import AnnotationTaskModel from '../../DB/model/annotationtask.js';
import FileManager from '../../DB/model/filemanager.js';
import authenticateToken from '../middleware/auth.js';
import {Router} from 'express';
import upload from '../utils/multer.js';
const router = Router();
router.post("/upload", authenticateToken, upload.single("file"), async (req, res) => {
    try {
        const { task_name, task_description, annotation_type, labels } = req.body;
        const uploaded_by = req.user.user_id; // استخراج user_id من التوكن

        if (!req.file) {
            return res.status(400).json({ error: "A valid file must be uploaded" });
        }
        // نغم هاي ملاحظة الك ممكن تفصلي انشاء المهمة عن تخزين معلومات الملف 

        //   إنشاء مهمة جديدة في `AnnotationTaskModel`
        const newTask = await AnnotationTaskModel.create({
            task_name,
            task_description,
            annotation_type,
            labels,
            created_by: uploaded_by // ربط المهمة بالمستخدم
        });

        //  تخزين بيانات الملف في `FileManager`
        const newFile = await FileManager.create({
            file_name: req.file.filename,
            file_path: req.file.path,
            file_type: req.file.mimetype,
            uploaded_by,
            task_id: newTask.task_id // ربط الملف بالمهمة التي تم إنشاؤها
        });

        res.status(201).json({ 
            message: "Task created and file uploaded successfully", 
            task: newTask, 
            file: newFile 
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
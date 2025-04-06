
import AnnotationTaskModel from '../../DB/model/annotationtask.js';
import FileManager from '../../DB/model/filemanager.js';
import { AppError } from '../utils/AppError.js';

export const uploadFile = async (req, res) => {
    
    const { task_name, task_description, annotation_type, labels } = req.body;
    const uploaded_by = req.user.user_id; // استخراج user_id من التوكن

    if (!req.file) {
        return next(new AppError("A valid file must be uploaded", 400));
    }
    // نغم هاي ملاحظة الك ممكن تفصلي انشاء المهمة عن تخزين معلومات الملف 

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

    res.status(201).json({ 
        message: "Task created and file uploaded successfully", 
        task: newTask, 
        file: newFile 
    });


};
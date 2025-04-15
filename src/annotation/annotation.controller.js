import SentenceModel from "../../DB/model/sentence.js";
import AnnotationModel from "../../DB/model/annotation.js";
import AnnotationTaskModel from "../../DB/model/annotationtask.js";



export const annotateSentence = async( req,res)=>{
    try{
        const task_id = req.params.task_id;
        const annotator_id = req.user.user_id;// من التوكن
        const {sentence_id , label} = req.body;
   // تحققت انه الجملة موجودة وبتخص نفس المهمة
    const sentence = await SentenceModel.findOne({ where: { sentence_id, task_id } });
    if (!sentence) {
      return res.status(404).json({ message: "Sentence not found for this task." });
    }
       // تحققت انه ما تم تصنيف الجملة من قبل نفس المستخدم
       const existingAnnotation = await AnnotationModel.findOne({
        where: {
          annotator_id,
          sentence_id
        }
      });
  
      if (existingAnnotation) {
        return res.status(400).json({ message: "You already annotated this sentence." });
      }
  
      // أضف التصنيف
      await AnnotationModel.create({
        task_id,
        annotator_id,
        sentence_id,
        label
      });
  
      res.status(201).json({ message: "Annotation saved successfully." });
  
    } catch (error) {
      console.error("Error saving annotation:", error);
      res.status(500).json({ message: "Server error" });
    }
  };

    

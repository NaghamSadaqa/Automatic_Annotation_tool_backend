import SentenceModel from "../../DB/model/sentence.js";
import AnnotationModel from "../../DB/model/annotation.js";
import AnnotationTaskModel from "../../DB/model/annotationtask.js";
import UserModel from "../../DB/model/user.js";
import { Op } from "sequelize";
import TaskCollaboratorModel from "../../DB/model/taskcollaborator.js";


export const annotateSentence = async( req,res)=>{
    try{
        const task_id = req.params.task_id;
        const annotator_id = req.user.user_id;// من التوكن
        const {sentence_id , label} = req.body;
    // تحقق إن المهمة موجودة
    const task = await AnnotationTaskModel.findByPk(task_id);
    if (!task || task.is_deleted) {
      return res.status(404).json({ message: "Task not found or deleted" });
    }

    // تحقق إن المستخدم هو صاحب المهمة أو مشارك فيها
    if (task.created_by !== annotator_id) {
      const isCollaborator = await TaskCollaboratorModel.findOne({
        where: {
          task_id: task_id,
          user_id: annotator_id
        }
      });

      if (!isCollaborator) {
        return res.status(401).json({
          message: "You are not authorized to annotate this task."
        });
      }
    }


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
        // حدث التصنيف الموجود بدل إنشاء جديد
        await existingAnnotation.update({ label });
      } else {
        // أنشئ تصنيف جديد
        await AnnotationModel.create({
          task_id,
          annotator_id,
          sentence_id,
          label
        });
      }

      const count = await AnnotationModel.count({
        where: {
          task_id,
          annotator_id,
          label: {
            [Op.ne]: 'none'   // لا تساوي "none" // not equal
          }
        }
      });

      const skippedCount = await AnnotationModel.count({
        where: {
          task_id,
          annotator_id,
          label: 'none'
        }
      });
      await checkAndMarkTaskAsCompleted(task_id, annotator_id);
  
      res.status(201).json({ message: "Annotation saved successfully." , annotatedCount: count , skippedCount:skippedCount });
  
    } catch (error) {
      console.error("Error saving annotation:", error);
      res.status(500).json({ message: "Server error" });
    }
  };

  const checkAndMarkTaskAsCompleted = async (task_id, user_id) => {
    const sentenceCount = await SentenceModel.count({ where: { task_id } });
  
    const completedAnnotations = await AnnotationModel.count({
      where: {
        task_id,
        annotator_id: user_id,
        label: {
          [Op.ne]: 'none'
        }
      }
    });
  
    if (completedAnnotations === sentenceCount) {
      // المستخدم خلص كل الجمل
      if (user_id === (await AnnotationTaskModel.findByPk(task_id)).created_by) {
        // هو صاحب المهمة
        await AnnotationTaskModel.update(
          { status: 'completed' },
          { where: { task_id: task_id, created_by: user_id } }
        );
      } else {
        // هو مشارك بالمهمة
        await TaskCollaboratorModel.update(
          { status: 'completed' },
          {
            where: {
              task_id,
              user_id
            }
          }
        );
      }
    }
  };














 //    هاي بتجيب موقع الجملة من اساس عدد الجمل الكلي 
 // ورح تجيب الجملة الجاي التالية الي ما اتصنفت من قبل اليوزر 
 export const getSentenceWithPosition = async (req, res) => {
  try {
    const task_id = req.params.task_id;
    const annotator_id = req.user.user_id;

    // هات الجمل المصنفة من قبل هذا المستخدم
    const annotated = await AnnotationModel.findAll({
      where: { task_id, annotator_id },
      attributes: ['sentence_id']
    });

    const annotatedIds = annotated.map(a => a.sentence_id);

    // هات الجملة التالية الغير مصنفة
    const nextSentence = await SentenceModel.findOne({
      where: {
        task_id,
        sentence_id: { [Op.notIn]: annotatedIds }
      },
      order: [['sentence_id', 'ASC']]
    });

    

    // عدد الجمل الكلي داخل التاسك
    const totalSentences = await SentenceModel.count({ where: { task_id } });

    // احسب ترتيب الجملة الحالية
    const position = await SentenceModel.count({ // بجيب عددهم كرقم
      where: {
        task_id,
        sentence_id: { [Op.lt]: nextSentence.sentence_id }//operator (less than)  العملية بتعني انه نجيب كل الجمل ال Id
                                                         // الها اقل من 
                                                         // id الجملة الحالية
      }
    });

    // position + 1 لأنه الجملة نفسها محسوبة
    res.json({
      sentence: nextSentence,
      currentIndex: position + 1,
      totalSentences
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};




export const updateAnnotation = async (req, res) => {
  try {
    const { task_id } = req.params;
    const annotator_id = req.user.user_id;
    const { sentence_id, label } = req.body;

    const existingAnnotation = await AnnotationModel.findOne({
      where: { annotator_id, task_id, sentence_id }
    });

    if (!existingAnnotation) {
      return res.status(200).json({ message: 'Annotation not found for update' });
    }

    // Update the label
    existingAnnotation.label = label;
    await existingAnnotation.save();

    res.json({ message: 'Annotation updated successfully' });

  } catch (error) {
    console.error('Update annotation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};




// هون بعرض الجمل الي صنفها المستخدم مغ التصنيف 
export const  getAnnotatedSentences = async (req, res) => {
  try {
    const { task_id } = req.params;
    const annotator_id = req.user.user_id;

    const annotations = await AnnotationModel.findAll({
      where: {
        task_id,
        annotator_id,
        label: {
          [Op.not]: 'none' // استثناء الجمل المتخطاة
        }
      },
      include: [
        {
          model: SentenceModel,
          attributes: ['sentence_id', 'sentence_text']
        },
        {
          model: UserModel,
          as: 'annotator',
          attributes: ['user_id', 'userName', 'email']
        }
      ],
      attributes: ['label','createdAt']
    });

    const formatted = annotations.map(annotation => ({
      sentence_id: annotation.Sentence.sentence_id,
      text: annotation.Sentence.sentence_text,
      label: annotation.label,
      created_at: annotation.createdAt,
      annotated_by: {
        user_id: annotation.annotator.user_id,
        name: annotation.annotator.userName,
        email: annotation.annotator.email
      }
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching annotated sentences:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


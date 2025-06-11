import AnnotationModel from '../../DB/model/annotation.js';
import SentenceModel from '../../DB/model/sentence.js';
import InvitationModel from '../../DB/model/invitation.js';
import AnnotationTaskModel from '../../DB/model/annotationtask.js';
import { Op } from 'sequelize';
import axios from 'axios';

export const distributeSampleToAnnotators = async (req, res) => {
  try {
    const { task_id } = req.params;

    //  جلب جميع الجمل الخاصة بالمهمة
    const allSentences = await SentenceModel.findAll({
      where: { task_id },
    });

    if (!allSentences.length) {
      return res.status(404).json({ message: 'No sentences found for this task.' });
    }

    // أخذ عينة عشوائية 10%
    const sampleSize = Math.ceil(allSentences.length * 0.1);
    const shuffled = [...allSentences].sort(() => 0.5 - Math.random());
    const sampledSentences = shuffled.slice(0, sampleSize);

    // جلب الأنوتيترز اللي وافقوا على المهمة
    const acceptedInvitations = await InvitationModel.findAll({
      where: { task_id, status: 'accepted' },
    });

    const annotatorIds = acceptedInvitations.map(inv => inv.receiver_id);

    // جلب مالك المهمة
    const task = await AnnotationTaskModel.findOne({ where: { task_id } });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const ownerId = task.created_by;

    // إضافة المالك إذا مش موجود
    if (!annotatorIds.includes(ownerId)) {
      annotatorIds.push(ownerId);
    }

    if (!annotatorIds.length) {
      return res.status(400).json({ message: 'No annotators found for this task.' });
    }

    //   بيانات التوزيع
    const annotations = [];

    for (const sentence of sampledSentences) {
      for (const annotatorId of annotatorIds) {
        annotations.push({
          sentence_id: sentence.sentence_id,
          task_id,
          annotator_id: annotatorId,
          label: null,
          certainty: null
        });
      }
    }

    //  تخزين في جدول الأنوتيشن
    await AnnotationModel.bulkCreate(annotations);

   
    res.status(200).json({
      message: `Distributed ${sampleSize} sentences to ${annotatorIds.length} annotators.`,
      sampleSize,
      annotators: annotatorIds
    });

  } catch (error) {
    console.error("Error in distributing sample:", error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};



export const getNextAnnotationSentence = async (req, res) => {
  try {
    const annotator_id = req.user.user_id;
    const { task_id } = req.params;

    // نبحث عن أول جملة مخصصة لهذا اليوزر ولم يصنفها بعد
    const annotation = await AnnotationModel.findOne({
      where: {
        task_id,
        annotator_id,
        label: null
      },
      include: [
        {
          model: SentenceModel,
          as: 'Sentence',
          attributes: ['sentence_text']
        }
      ]
    });

    if (!annotation) {
      return res.status(200).json({ message: "No more unannotated sentences." });
    }

    res.status(200).json({
      sentence_id: annotation.sentence_id,
      sentence_text: annotation.Sentence.sentence_text
    });

  } catch (error) {
    console.error("Error fetching sentence:", error);
    res.status(500).json({ message: "Server error" });
  }
};



export const submitAnnotation = async (req, res) => {
  try {
    const annotator_id = req.user.user_id;
    const { task_id } = req.params;
    const { sentence_id,  label, certainty } = req.body;

    if (!label || !certainty) {
      return res.status(400).json({ message: "Label and certainty are required" });
    }

    // نحدث فقط السطر المخصص لهذا الأنوتيتر
    const updated = await AnnotationModel.update(
      { label, certainty },
      {
        where: {
          sentence_id,
          task_id,
          annotator_id
        }
      }
    );

    res.status(200).json({ message: "Annotation submitted successfully" });

  } catch (error) {
    console.error("Error submitting annotation:", error);
    res.status(500).json({ message: "Server error" });
  }
};




export const getAgreementData = async (req, res) => {
  try {
    const { task_id } = req.params;

    // الخطوة 1: جلب كل التصنيفات غير الفارغة لنفس المهمة
    const annotations = await AnnotationModel.findAll({
      where: {
        task_id,
        label: { [Op.ne]: null }
      },
      attributes: ['sentence_id', 'annotator_id', 'label'],
      raw: true
    });

    //  تجميع الجمل المصنفة من أكثر من Annotator
    const grouped = {};

    annotations.forEach((row) => {
      const key = row.sentence_id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });

    //  تصفية الجمل اللي فيها Annotatorين فقط
    const filtered = Object.values(grouped)
      .filter(group => group.length === 2)
      .flat();

    if (filtered.length === 0) {
      return res.status(404).json({ message: "No common annotated sentences between 2 annotators yet." });
    }

    res.status(200).json({ data: filtered });

  } catch (error) {
    console.error("Error getting agreement data:", error);
    res.status(500).json({ message: "Server error" });
  }
};



export const calculateKappaAgreement = async (req, res) => {
  try {
    const { task_id } = req.params;

    // 1. استرجاع كل التصنيفات غير الفارغة لهذه المهمة
    const annotations = await AnnotationModel.findAll({
      where: {
        task_id,
        label: { [Op.ne]: null }
      },
      attributes: ['sentence_id', 'annotator_id', 'label'],
      raw: true
    });

    // 2. تجميع التصنيفات حسب الجملة
    const grouped = {};
    annotations.forEach(row => {
      const key = row.sentence_id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });

    // 3. أخذ فقط الجمل المصنفة من 2 Annotators
    const labelPairs = [];
    for (const group of Object.values(grouped)) {
      if (group.length === 2) {
        labelPairs.push({
          annotator1: group[0].label,
          annotator2: group[1].label
        });
      }
    }

    if (labelPairs.length === 0) {
      return res.status(400).json({ message: 'No paired annotations to calculate agreement.' });
    }

    // 4. استخراج قائمتين من التصنيفات
    const labels1 = labelPairs.map(pair => pair.annotator1);
    const labels2 = labelPairs.map(pair => pair.annotator2);

    // 5. إرسالهم إلى Flask لحساب الـ Kappa
    const response = await axios.post('http://localhost:5000/api/annotator-agreement', {
      labels1,
      labels2
    });

    return res.status(200).json({
      kappa: response.data.kappa,
      message: response.data.message
    });

  } catch (error) {
    console.error("Agreement error:", error);
    return res.status(500).json({ message: "Error computing agreement" });
  }
};
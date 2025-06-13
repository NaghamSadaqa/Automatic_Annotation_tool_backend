import AnnotationModel from '../../DB/model/annotation.js';
import SentenceModel from '../../DB/model/sentence.js';
import InvitationModel from '../../DB/model/invitation.js';
import AnnotationTaskModel from '../../DB/model/annotationtask.js';
import { Op } from 'sequelize';
import axios from 'axios';

export const distributeSampleToAnnotators = async (req, res) => {
  try {
    const { task_id } = req.params;

    // جلب عينة الجمل اللي صنفها الذكاء
    const sampledSentences = await SentenceModel.findAll({
      where: { task_id, is_sample: true }
    });

    const sampleSize = sampledSentences.length;

    if (!sampledSentences.length) {
      return res.status(404).json({ message: 'No sampled sentences found for this task.' });
    }

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

    // تجهيز بيانات التوزيع
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

    // تخزين في جدول الأنوتيشن
    await AnnotationModel.bulkCreate(annotations);

    res.status(200).json({
      message: `Distributed ${sampleSize} sampled sentences to ${annotatorIds.length} annotators.`,
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



// هاي خلص ما استخدمتها فعليا
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

    const annotations = await AnnotationModel.findAll({
      where: {
        task_id,
        label: { [Op.ne]: null }
      },
      attributes: ['sentence_id', 'annotator_id', 'label'],
      raw: true
    });

    const grouped = {};
    annotations.forEach(row => {
      const key = row.sentence_id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });

    const labelPairs = [];
    const disagreements = [];

    for (const [sentenceId, group] of Object.entries(grouped)) {
      if (group.length === 2) {
        const [a1, a2] = group;
        labelPairs.push({
          annotator1: a1.label,
          annotator2: a2.label
        });

        if (a1.label !== a2.label) {
          disagreements.push({
            sentence_id: sentenceId,
            annotator1_label: a1.label,
            annotator2_label: a2.label
          });
        }
      }
    }

    if (labelPairs.length === 0) {
      return res.status(400).json({ message: 'No paired annotations to calculate agreement.' });
    }

    const labels1 = labelPairs.map(p => p.annotator1);
    const labels2 = labelPairs.map(p => p.annotator2);

    const response = await axios.post('http://localhost:5000/api/annotator-agreement', {
      labels1,
      labels2
    });

    const result = {
      kappa: response.data.kappa,
      message: response.data.message
    };

    if (response.data.kappa < 0.8) {
      result.disagreements = disagreements;
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Agreement error:", error);
    return res.status(500).json({ message: "Error computing agreement" });
  }
};







export const calculateAgreementWithAI = async (req, res) => {
  try {
    const { task_id } = req.params;

    // جلب الجمل التي تم تصنيفها من الذكاء (is_sample = true)
    const sampleSentences = await SentenceModel.findAll({
      where: { task_id, is_sample: true },
      include: [{ model: AnnotationModel }]
    });

    if (!sampleSentences.length) {
      return res.status(404).json({ message: "No AI-classified sample sentences found." });
    }

    const aiLabels = [];
    const humanLabels = [];

    for (const sentence of sampleSentences) {
      const aiLabel = sentence.ai_label;

      // نختار أفضل تصنيف بشري حسب أعلى درجة تأكد
      const bestHumanAnnotation = sentence.Annotations
        .filter(a => a.label)
        .sort((a, b) => b.certainty - a.certainty)[0];

      if (aiLabel && bestHumanAnnotation) {
        aiLabels.push(aiLabel);
        humanLabels.push(bestHumanAnnotation.label);
      }
    }

    if (!aiLabels.length || !humanLabels.length || aiLabels.length !== humanLabels.length) {
      return res.status(400).json({ message: "Mismatch or missing labels for agreement calculation." });
    }

    // إرسال التصنيفات لفلاسك لحساب التوافق
    const flaskResponse = await axios.post("http://localhost:5000/agreement", {
      ai_labels: aiLabels,
      human_labels: humanLabels
    });

    const { agreement_percentage } = flaskResponse.data;

    // لو التوافق جيد، نصنف باقي الجمل تلقائياً
    if (agreement_percentage >= 85) {
      console.log("High agreement - proceeding to classify the rest of the sentences with AI.");

      const remainingSentences = await SentenceModel.findAll({
        where: { task_id, is_sample: false }
      });

      const annotationType = req.query.annotation_type || 'sentiment'; // أو sarcasm أو style

      const predictions = await classifySentences(remainingSentences, annotationType);

      const updatePromises = remainingSentences.map((sentence, index) => {
        const prediction = predictions[index];
        if (prediction) {
          return sentence.update({
            ai_label: prediction.label,
            ai_score: prediction.score
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
    }

    res.status(200).json({
      agreement_percentage,
      message: agreement_percentage >= 85
        ? "High agreement. Remaining sentences classified by AI."
        : "Low agreement. Please improve model performance before auto-classifying."
    });

  } catch (error) {
    console.error("Error calculating agreement with AI:", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
};
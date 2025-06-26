import AnnotationModel from '../../DB/model/annotation.js';
import SentenceModel from '../../DB/model/sentence.js';
import InvitationModel from '../../DB/model/invitation.js';
import AnnotationTaskModel from '../../DB/model/annotationtask.js';
import TaskCollaboratorModel from '../../DB/model/taskcollaborator.js';
import UserModel from '../../DB/model/user.js';
import { classifySentences } from "./aiHelper.js";
import { Op } from 'sequelize';
import axios from 'axios';
import { Parser } from "json2csv";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";


const calculateAgreement = async (task_id) => {

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
      labelPairs.push({ annotator1: a1.label, annotator2: a2.label });

      if (a1.label !== a2.label) {
        disagreements.push({
          sentence_id: sentenceId,
          annotator1_label: a1.label,
          annotator2_label: a2.label
        });
      }
    }
  }

  let flaskResponse = null
  if (labelPairs.length > 0) {
    const labels1 = labelPairs.map(p => p.annotator1);
    const labels2 = labelPairs.map(p => p.annotator2);

    const flaskRes = await axios.post('http://localhost:5000/api/annotator-agreement', {
      labels1,
      labels2
    });

    flaskResponse = {
      kappa: flaskRes.data.kappa,
      message: flaskRes.data.message,
    };

    if (flaskRes.data.kappa < 0.8) {
      flaskResponse.disagreements = disagreements;
    }
  }
  return flaskResponse
}

export const StartResolvingDisagreements = async (req, res) => {

  // just to set labels to null
  const { task_id } = req.params
  const { disagreements } = req.body;

  disagreements.forEach(async (disagreement) => {
    await AnnotationModel.update(
      { label: null, certainty: null },
      {
        where: {
          task_id,
          sentence_id: disagreement.sentence_id,
        }
      }
    );
  })

  return res.status(200).send()

}

export const getNextAnnotationSentence = async (req, res) => {

  try {

    const annotator_id = req.user.user_id;
    const { task_id } = req.params;

    // نبحث عن أول جملة غير مصنفة لهذا المستخدم
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
    })


    // إذا لسه في جمل لهذا المستخدم
    if (!annotation) {

      // This user finished all his assigned sentences, check if all annotators finished
      const notAnnotated = await AnnotationModel.count({
        where: {
          task_id,
          label: null
        }
      })

      if (notAnnotated > 0) {
        return res.status(200).json({
          message: "You have finished all your assigned sentences. Aggreement will be calculated once all annotators finish.",
          taskFinished: false,
          flaskResponse: null
        })
      }
      else {
        // All annotators finished, calculate agreement
        const flaskResponse = await calculateAgreement(task_id)

        let message = "Annotation task completed. Agreement calculated."
        if (flaskResponse.disagreements) {
          message = "Annotation task completed. Agreement calculated with disagreements, please resolve"
        }
        return res.status(200).json({
          message,
          taskFinished: true,
          flaskResponse: flaskResponse
        });
      }
    }

    // This user has unannotated sentences, return the next one
    return res.status(200).json({
      sentence_id: annotation.sentence_id,
      sentence_text: annotation.Sentence.sentence_text,
      flaskResponse: null
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
    const { sentence_id, label, certainty } = req.body;

    if (!label || !certainty) {
      return res.status(400).json({ message: "Label and certainty are required" });
    }

    const existingAnnotation = await AnnotationModel.findOne({
      where: { task_id, sentence_id, annotator_id }
    });

    if (!existingAnnotation) {
      return res.status(404).json({
        message: "Sentence not found in your assigned annotations"
      });
    }


    await AnnotationModel.update(
      { label, certainty },
      {
        where: { task_id, sentence_id, annotator_id }
      }
    );

    // هاي ريسبونس انه الانوتيشن تم
    return res.status(200).json({
      message: "Annotation submitted successfully",
      isFinished: false
    });

  } catch (error) {
    console.error("Error submitting annotation:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const calculateAgreementWithAI = async (req, res) => {
  try {
    const { task_id } = req.params;
    // جلب الجمل التي تم تصنيفها من الذكاء (is_sample = true)
    const sampleSentences = await SentenceModel.findAll({
      where: { task_id, is_sample: true },
      include: [{ model: AnnotationModel, as: 'Annotations' }]
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
      ai_labels: aiLabels.map(label => label.toLowerCase()),
      human_labels: humanLabels.map(label => label.toLowerCase())
    });
    console.log("Flask response:", flaskResponse.data);

    const { agreement_percentage } = flaskResponse.data;

    // لو التوافق جيد، نصنف باقي الجمل تلقائياً
    if (agreement_percentage >= 85) {
      console.log("High agreement - proceeding to classify the rest of the sentences with AI.");

      const remainingSentences = await SentenceModel.findAll({
        where: { task_id, is_sample: false }
      });

      const annotationType = req.query.annotation_type || 'sentiment';

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
}

export const exportFinalLabels1 = async (req, res) => {
  try {
    const { task_id } = req.params;
    const format = req.query.format || "csv";

    // استرجاع الجمل - استبدلها بالاستعلام الحقيقي عندك
    const sentences = await SentenceModel.findAll({
      where: { task_id },
      include: [
        {
          model: AnnotationModel, // تمثيل
          as: "Annotations",
          where: { label: { [Op.ne]: null } },
          required: false,
        },
      ],
    });

    // تجهيز السجلات
    const records = sentences.map(sentence => {
      let finalLabel = null;
      let source = "none";

      if (sentence.Annotations?.length > 0) {
        const bestManual = sentence.Annotations.reduce((prev, curr) =>
          (prev.certainty || 0) > (curr.certainty || 0) ? prev : curr
        );
        finalLabel = bestManual.label;
        source = "human";
      } else if (sentence.ai_label) {
        finalLabel = sentence.ai_label;
        source = "ai";
      }

      return {
        sentence_id: sentence.sentence_id,
        sentence_text: sentence.sentence_text,
        final_label: finalLabel || "Unlabeled",
        source,
      };
    });

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Final Labels");

      worksheet.columns = [
        { header: "Sentence ID", key: "sentence_id", width: 15 },
        { header: "Sentence Text", key: "sentence_text", width: 50 },
        { header: "Final Label", key: "final_label", width: 20 },
        { header: "Source", key: "source", width: 10 },
      ];

      worksheet.addRows(records);

      // write buffer and send
      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader('Content-Disposition', 'attachment; filename=final_labels.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);

    } else {
      // CSV
      const fields = ["sentence_id", "sentence_text", "final_label", "source"];
      const parser = new Parser({ fields });
      const csv = parser.parse(records);
      const csvWithBOM = '\uFEFF' + csv;

      res.setHeader('Content-Disposition', 'attachment; filename=final_labels.csv');
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csvWithBOM);
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Export failed", error: error.message });
  }
}


export const getSampleAnnotations = async (req, res) => {
  try {
    const { task_id } = req.params;

    const sampledSentences = await SentenceModel.findAll({
      where: {
        task_id,
        is_sample: true
      },
      include: [
        {
          model: AnnotationModel,
          as: "Annotations",
          include: [
            {
              model: UserModel,
              as: 'annotator',
              attributes: ['user_id', 'userName']
            }
          ],
          attributes: ['label', 'certainty', 'createdAt', 'annotator_id']
        }
      ],
      attributes: ['sentence_id', 'sentence_text', 'ai_label', 'ai_score']
    });

    const response = sampledSentences.map(sentence => ({
      sentence_id: sentence.sentence_id,
      sentence_text: sentence.sentence_text,
      ai_label: sentence.ai_label,
      ai_score: sentence.ai_score,
      annotations: sentence.Annotations.map(a => ({
        user_id: a.annotator.user_id,
        user_name: a.annotator.userName,
        label: a.label,
        certainty: a.certainty,
        created_at: a.createdAt
      }))
    }));

    res.json(response);
  } catch (error) {
    console.error("Error in getSampleAnnotations:", error);
    res.status(500).json({ message: "Server error" });
  }
}

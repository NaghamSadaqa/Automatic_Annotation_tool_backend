import SentenceModel  from '../../DB/model/sentence.js';  

export const getAiPredictionsByTask = async (req, res, next) => {
  try {
    const { task_id } = req.params;

    const sentences = await SentenceModel.findAll({
      where: { task_id: task_id },
      attributes: ['sentence_id', 'sentence_text', 'ai_label'],
    });

    return res.status(200).json({ sentences });
  } catch (error) {
    next(error);
  }
};

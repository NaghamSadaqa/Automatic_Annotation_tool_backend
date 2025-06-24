import axios from 'axios';

export const classifySentences = async (sentences, annotationType) => {
  let flaskUrl;

  switch (annotationType.toLowerCase()) {
    case 'sentiment':
      flaskUrl = 'http://localhost:5000/predict/sentiment';
      break;
    case 'sarcasm':
      flaskUrl = 'http://localhost:5000/predict/sarcasm';
      break;
    case 'stance':
      flaskUrl = 'http://localhost:5000/predict/stance';
      break;
    default:
      throw new Error("Unsupported annotation type for AI classification");
  }

  try {
    const response = await axios.post(flaskUrl, {
      sentences: sentences.map(s => s.sentence_text)
    });

    // Flask بيرجع النتائج بهذا الشكل من داخل كل راوت:
    // return jsonify({"predictions": results})
    return response.data.predictions;
  } catch (error) {
    console.error("AI classification error:", error.message);
    return [];
  }
};
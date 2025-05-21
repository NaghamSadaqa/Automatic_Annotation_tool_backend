from flask import Blueprint, request, jsonify
from transformers import pipeline
from app.utils.model_loader import load_sentiment_model
import re

sentiment_bp = Blueprint("sentiment", __name__)
model, tokenizer, labels = load_sentiment_model()
pipe = pipeline("text-classification", model=model, tokenizer=tokenizer)

# دالة تنظيف النصوص
def clean_text(text):
    text = re.sub(r"http\S+|www.\S+", "", text)  # حذف الروابط
    text = re.sub(r"[^ء-ي\s]", "", text)         # حذف الرموز غير العربية
    text = re.sub(r"\s+", " ", text)             # حذف الفراغات الزائدة
    text = text.strip()
    return text

@sentiment_bp.route("/", methods=["POST"])
def predict_sentiment():
    try:
        data = request.get_json()
        sentences = data.get("sentences", [])

        cleaned_sentences = [clean_text(s) for s in sentences]
        results = pipe(cleaned_sentences)

        # تحويل التصنيفات
        label_map = {
            "LABEL_0": "negative",
            "LABEL_1": "neutral",
            "LABEL_2": "positive"
        }

        predictions = []
        for i in range(len(sentences)):
            raw_label = results[i]["label"]
            readable_label = label_map.get(raw_label, raw_label)  # fallback in case of unknown label
            predictions.append({
                "sentence": sentences[i],
                "cleaned_sentence": cleaned_sentences[i],
                "label": readable_label,
                "score": round(results[i]["score"], 4)
            })

        return jsonify({"predictions": predictions})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
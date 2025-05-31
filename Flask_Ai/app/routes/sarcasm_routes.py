from flask import Blueprint, request, jsonify
from transformers import pipeline
from app.utils.model_loader import load_sarcasm_model
import re

sarcasm_bp = Blueprint("sarcasm", __name__)
model, tokenizer, labels = load_sarcasm_model()
pipe = pipeline("text-classification", model=model, tokenizer=tokenizer)

# دالة تنظيف النصوص - بإمكانك تستدخمي نفس دالة clean_text تبع sentiment
def clean_text(text):
    text = re.sub(r"http\S+|www.\S+", "", text)
    text = re.sub(r"[^ء-ي\s]", "", text)
    text = re.sub(r"\s+", " ", text)
    text = text.strip()
    return text

@sarcasm_bp.route("/", methods=["POST"])
def predict_sarcasm():
    try:
        data = request.get_json()
        sentences = data.get("sentences", [])

        cleaned_sentences = [clean_text(s) for s in sentences]
        results = pipe(cleaned_sentences)

        # خريطة التصنيفات
        label_map = {
            "LABEL_0": "not_sarcastic",
            "LABEL_1": "sarcastic"
        }

        predictions = []
        for i in range(len(sentences)):
            raw_label = results[i]["label"]
            readable_label = label_map.get(raw_label, raw_label)
            predictions.append({
                "sentence": sentences[i],
                "cleaned_sentence": cleaned_sentences[i],
                "label": readable_label,
                "score": round(results[i]["score"], 4)
            })

        return jsonify({"predictions": predictions})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
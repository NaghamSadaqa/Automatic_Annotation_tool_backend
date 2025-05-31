
from flask import Blueprint, request, jsonify
from transformers import pipeline
from app.utils.model_loader import load_sarcasm_model

sarcasm_bp = Blueprint("sarcasm", __name__)
model, tokenizer, labels = load_sarcasm_model()
pipe = pipeline("text-classification", model=model, tokenizer=tokenizer)

@sarcasm_bp.route("/", methods=["POST"])
def predict_sarcasm():
    try:
        data = request.get_json()
        sentences = data.get("sentences", [])

        # ✅ حذف التنظيف مؤقتًا لاكتشاف الخطأ
        results = pipe(sentences)

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
                "label": readable_label,
                "score": round(results[i]["score"], 4)
            })

        return jsonify({"predictions": predictions})

    except Exception as e:
        print("Internal error:", e)  
        return jsonify({"error": str(e)}), 500
from flask import Flask, request, jsonify,Blueprint
import joblib
import torch
from transformers import AutoTokenizer, AutoModel
import os

stance_bp = Blueprint("stance", __name__)
# تحميل النموذجات
#model = joblib.load("stance_model.pkl")

model_path = os.path.join(os.path.dirname(__file__), "stance_model.pkl")
model = joblib.load(model_path)
label= os.path.join(os.path.dirname(__file__), "label_encoder.pkl")
label_encoder = joblib.load(label)
#label_encoder = joblib.load("label_encoder.pkl")
model_name = "aubmindlab/bert-base-arabertv2"
tokenizer = AutoTokenizer.from_pretrained(model_name)
arabert = AutoModel.from_pretrained(model_name)

# دالة استخراج embedding
def get_embedding(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
    with torch.no_grad():
        outputs = arabert(**inputs)
    return outputs.last_hidden_state[:, 0, :].squeeze().numpy().reshape(1, -1)

# الراوت الأساسي
@stance_bp.route('/', methods=['POST'])
def predict_stance():
    data = request.json
    sentences = data.get('sentences')

    if not sentences or not isinstance(sentences, list):
        return jsonify({"error": "No valid sentences provided"}), 400

    predictions = []
    for sentence in sentences:
        embedding = get_embedding(sentence)
        prediction = model.predict(embedding)
        label = label_encoder.inverse_transform(prediction)[0]
        predictions.append({
            "input": sentence,
            "label": label,
            "score": 1.0  # تقدير عشوائي للثقة إذا الموديل ما بيعطي احتمال
        })

    return jsonify({
        "predictions": predictions
    })
from flask import Blueprint, request, jsonify
from sklearn.metrics import cohen_kappa_score

aiagreement_bp = Blueprint("aiagreement", __name__)

@aiagreement_bp.route('/agreement', methods=['POST'])
def calculate_agreement():
    try:
      data = request.get_json()
      ai_labels = data.get('ai_labels')
      human_labels = data.get('human_labels')

      if not ai_labels or not human_labels or len(ai_labels) != len(human_labels):
        return jsonify({"error": "Invalid input. Labels missing or unequal lengths."}), 400

      kappa_score = cohen_kappa_score(ai_labels, human_labels)

      return jsonify({
        "agreement_percentage": round(kappa_score * 100, 2),
        "kappa_score": kappa_score
    })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
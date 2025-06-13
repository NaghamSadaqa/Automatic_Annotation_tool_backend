from flask import Blueprint, request, jsonify
from sklearn.metrics import cohen_kappa_score

agreement_bp = Blueprint("agreement", __name__)

@agreement_bp.route("/api/annotator-agreement", methods=["POST"])
def annotator_agreement():
    try:
        data = request.get_json()
        labels1 = data.get("labels1")
        labels2 = data.get("labels2")

        if not labels1 or not labels2 or len(labels1) != len(labels2):
            return jsonify({"error": "Invalid input. Both label lists must be present and equal in length."}), 400

        kappa = cohen_kappa_score(labels1, labels2)

        if kappa >= 0.8:
            message = "Strong agreement – no further action needed."
        else:
            message = "Weak agreement – annotators should review disagreements."

        return jsonify({
            "kappa": round(kappa, 4),
            "message": message
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
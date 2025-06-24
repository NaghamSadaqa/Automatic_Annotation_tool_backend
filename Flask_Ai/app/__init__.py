from flask import Flask
from app.routes.sentiment import sentiment_bp
from app.routes.sarcasm_routes import sarcasm_bp
from app.routes.agreement_routes import agreement_bp
from app.routes.aiagreement_routes import aiagreement_bp
from app.routes.stance import stance_bp
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    app.register_blueprint(sentiment_bp, url_prefix="/predict/sentiment")
    app.register_blueprint(sarcasm_bp, url_prefix="/predict/sarcasm")
    app.register_blueprint(stance_bp, url_prefix="/predict/stance")
    app.register_blueprint(agreement_bp)
    app.register_blueprint(aiagreement_bp)
    return app
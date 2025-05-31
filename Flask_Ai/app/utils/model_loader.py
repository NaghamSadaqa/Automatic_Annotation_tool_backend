from transformers import AutoModelForSequenceClassification, AutoTokenizer

def load_sentiment_model():
    model_name = "CAMeL-Lab/bert-base-arabic-camelbert-da-sentiment"
    labels = ["negative", "neutral", "positive"]
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    return model, tokenizer, labels 



def load_sarcasm_model():
    model_name = "MohamedGalal/arabert-sarcasm-detector"
    labels = ["not_sarcastic", "sarcastic"]
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    return model, tokenizer, labels
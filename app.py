from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import torch
import joblib
import pandas as pd
from PIL import Image
import torch.nn as nn
from torchvision import transforms
from torchvision.models import efficientnet_b0
import locale
import numpy as np

# Set locale for Indian currency formatting
locale.setlocale(locale.LC_ALL, 'en_IN')

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Device setup
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load EfficientNet model
effnet = efficientnet_b0(pretrained=False)
effnet.classifier[1] = nn.Linear(effnet.classifier[1].in_features, 3)
effnet.load_state_dict(torch.load("image_classification_dataset/best_model.pth", map_location=device))
effnet.to(device)
effnet.eval()

# Load XGBoost model and preprocessing tools
xgb_model = joblib.load("price_model_xgb.pkl")
encoder = joblib.load("encoder_xgb.pkl")
scaler = joblib.load("scaler_km.pkl")

# Damage labels and scores
class_names = ['dent', 'no_damage', 'scratch']
damage_score = {'no_damage': 0, 'scratch': 1, 'dent': 2}

# Image transform for prediction
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# Function to classify damage
def classify_damage(image_file):
    img = Image.open(image_file).convert("RGB")
    img_tensor = transform(img).unsqueeze(0).to(device)
    with torch.no_grad():
        outputs = effnet(img_tensor)
        _, pred = torch.max(outputs, 1)
    return class_names[pred.item()]

# API endpoint for prediction
@app.route("/predict", methods=["POST"])
def predict():
    try:
        # Tabular inputs
        brand = request.form["brand"]
        model = request.form["model"]
        year = int(request.form["year"])
        km = float(request.form["kmDriven"])
        fuel = request.form["fuel"]
        transmission = request.form["transmission"]
        owners = int(request.form["owners"])
        color = request.form["color"]

        # Uploaded images
        front = request.files["frontImage"]
        back = request.files["backImage"]
        left = request.files["leftImage"]
        right = request.files["rightImage"]

        # Predict damage class for each image
        front_d = classify_damage(front)
        back_d = classify_damage(back)
        left_d = classify_damage(left)
        right_d = classify_damage(right)

        # Assemble data row
        data = {
            "Brand": [brand],
            "Model": [model],
            "Year": [year],
            "kilometers Driven": scaler.transform([[km]])[0][0],
            "Fuel Type": [fuel],
            "Transmission": [transmission],
            "Number of Owners": [owners],
            "Colour": [color],
            "FrontDamage": [damage_score[front_d]],
            "BackDamage": [damage_score[back_d]],
            "LeftDamage": [damage_score[left_d]],
            "RightDamage": [damage_score[right_d]]
        }

        df_input = pd.DataFrame(data)
        X = encoder.transform(df_input)

        # Predict resale price
        price = xgb_model.predict(X)[0]
        formatted_price = locale.format_string("₹%.2f", price, grouping=True)

        # Prepare damage summary
        summary = {
            "front": front_d,
            "back": back_d,
            "left": left_d,
            "right": right_d
        }

        return jsonify({
            "predicted_price": formatted_price,
            "damage_summary": summary
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Optional Gradio Backup Interface (won’t run unless uncommented)
# import gradio as gr
# def gradio_interface(brand, model, year, kmDriven, fuel, transmission, owners, color, front, back, left, right):
#     with open(front.name, 'rb') as f1, open(back.name, 'rb') as f2, open(left.name, 'rb') as f3, open(right.name, 'rb') as f4:
#         return predict()

# if __name__ == "__main__":
#     gr.Interface(
#         fn=gradio_interface,
#         inputs=[...],
#         outputs=[...]
#     ).launch()

if __name__ == "__main__":
    app.run(debug=True)

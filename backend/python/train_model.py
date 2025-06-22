# =============================================
# Step 1: Generate Dataset & Train ML Model
# File: backend/python/train_model.py
# =============================================

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

np.random.seed(42)

def generate_example(label):
    if label == "Traffic":
        return {
            "pm2_5": np.random.normal(35, 5),
            "no2": np.random.normal(60, 10),
            "so2": np.random.normal(10, 2),
            "road": np.random.uniform(10, 200),
            "industrial": np.random.uniform(300, 1000),
            "residential": np.random.uniform(100, 500),
            "label": label
        }
    elif label == "Industrial":
        return {
            "pm2_5": np.random.normal(40, 5),
            "no2": np.random.normal(30, 10),
            "so2": np.random.normal(40, 8),
            "road": np.random.uniform(300, 1000),
            "industrial": np.random.uniform(10, 300),
            "residential": np.random.uniform(100, 500),
            "label": label
        }
    elif label == "Residential":
        return {
            "pm2_5": np.random.normal(30, 5),
            "no2": np.random.normal(20, 5),
            "so2": np.random.normal(5, 2),
            "road": np.random.uniform(200, 600),
            "industrial": np.random.uniform(500, 1000),
            "residential": np.random.uniform(10, 300),
            "label": label
        }

# Generate dataset
data = [generate_example(label) for label in ["Traffic"]*100 + ["Industrial"]*100 + ["Residential"]*100]
df = pd.DataFrame(data)
df.to_csv("pollution_labeled_data.csv", index=False)

# Train model
X = df.drop("label", axis=1)
y = df["label"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

print(classification_report(y_test, model.predict(X_test)))

joblib.dump(model, "pollution_source_model.pkl")
import sys
import json
import requests
import os
from geopy.distance import geodesic
import joblib
import pandas as pd

def get_osm_features(lat, lon, radius=1000):
    query = f"""
    [out:json];
    (
      way["highway"](around:{radius},{lat},{lon});
      way["landuse"="industrial"](around:{radius},{lat},{lon});
      way["landuse"="residential"](around:{radius},{lat},{lon});
    );
    out center;
    """
    response = requests.post("http://overpass-api.de/api/interpreter", data={"data": query})
    response.raise_for_status()
    return response.json()["elements"]

def nearest_distance(lat, lon, elements, keyword):
    distances = []
    for el in elements:
        if "tags" in el and keyword in el["tags"].values():
            center = el.get("center")
            if center:
                dist = geodesic((lat, lon), (center["lat"], center["lon"])).meters
                distances.append(dist)
    return min(distances) if distances else 10000  # large default if not found

# Load ML model using absolute path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "pollution_source_model.pkl")
model = joblib.load(model_path)

# Read JSON input from Node.js
data = json.loads(sys.stdin.read())
lat, lon = data["lat"], data["lon"]
pollutants = data["pollutants"]

# Fetch OSM data and calculate distances
osm_data = get_osm_features(lat, lon)
distances = {
    "road": nearest_distance(lat, lon, osm_data, "residential"),
    "industrial": nearest_distance(lat, lon, osm_data, "industrial"),
    "residential": nearest_distance(lat, lon, osm_data, "residential")
}

# Prepare features in DataFrame with column names to avoid sklearn warnings
feature_names = ["pm2_5", "no2", "so2", "road", "industrial", "residential"]
X_input = pd.DataFrame([[
    pollutants["pm2_5"],
    pollutants.get("no2", 0),
    pollutants.get("so2", 0),
    distances["road"],
    distances["industrial"],
    distances["residential"]
]], columns=feature_names)

# Predict pollution source
result = model.predict(X_input)[0]

# Output JSON to Node.js
print(json.dumps({"source": result}))

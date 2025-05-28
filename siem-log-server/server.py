from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
from datetime import datetime
from pymongo import MongoClient
from pathlib import Path

app = Flask(__name__)
CORS(app)
app.secret_key = "supersecret"

# Ensure log directory exists
os.makedirs("siem-log-server/logs", exist_ok=True)
log_file_path = Path("logs/server.log")

# Setup MongoDB
client = MongoClient('mongodb://localhost:27017')
db = client['logs_database']
collection = db['server_logs']

# Keyword categories for auto-categorization
CATEGORIES = {
    "Entertainment": ["netflix", "youtube", "spotify", "primevideo", "hulu", "jiohotstar", "Appletv"],
    "Social Media": ["facebook", "twitter", "instagram", "tiktok", "snapchat", "Reddit", "WeChat", "Threads", "Discord"],
    "News": ["cnn", "bbc", "nytimes", "reuters", "news"],
    "Work": ["slack", "github", "gitlab", "zoom", "microsoft teams", "Dropbox", "Google Calender"],
    "Education": ["khanacademy", "coursera", "edx", "udemy", "academia"],
    "Shopping": ["amazon", "ebay", "flipkart", "etsy", "walmart", "Myntra", "Nykaa", "Alibaba", "Urbanic", "Ajio"],
    "Gaming": ["twitch", "steam", "epicgames", "roblox", "riotgames", "Twitch", "Xbox", "Polygon"],
    "Finance": ["paypal", "bank", "finance", "trading", "investment", "CNBC", "Forbes", "Bajaj Finance"],
    "Adult": ["porn", "xxx", "sex", "adult", "nsfw"],
    "Other": []
}

# Malware patterns and severity mappings
MALWARE_KEYWORDS = {
    "trojan": ("Urgent Critical", "High", "Trojan"),
    "ransomware": ("Urgent Critical", "High", "Ransomware"),
    "spyware": ("High Critical", "Moderate", "Spyware"),
    "virus": ("Attention Needed", "Moderate", "Virus"),
    "malware": ("Low Critical", "Low", "Generic Malware")
}

def categorize_log(message: str) -> str:
    message = message.lower()
    for category, keywords in CATEGORIES.items():
        if any(keyword in message for keyword in keywords):
            return category
    return "Other"

def detect_criticality_details(message: str):
    message = message.lower()
    for keyword, (criticality, severity, malware_type) in MALWARE_KEYWORDS.items():
        if keyword in message:
            return criticality, severity, malware_type
    return "Info", "None", "None"

def determine_productivity(category: str) -> str:
    if category in ["Work", "Education"]:
        return "Productive"
    elif category in ["Entertainment", "Social Media", "Gaming", "Shopping", "Adult"]:
        return "Distracting"
    else:
        return "Neutral"

def write_pretty_log(entry):
    try:
        with open(log_file_path, "a", encoding="utf-8") as f:
            for key, value in entry.items():
                f.write(f"{key}: {value}\n")
            f.write("\n")
    except Exception as e:
        print("Failed to write to server.log:", e)

def log_to_mongodb(entry):
    try:
        entry["time"] = datetime.strptime(entry["time"], "%Y-%m-%d %H:%M:%S,%f")
    except Exception:
        entry["time"] = datetime.utcnow()
    collection.insert_one(entry)

@app.route("/log", methods=["POST"])
def receive_log():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    log_message = data.get("log", "")
    visited_url = data.get("url", "")

    category = categorize_log(log_message)
    productivity = determine_productivity(category)
    criticality, severity, malware_type = detect_criticality_details(log_message)

    log_entry = {
        "level": criticality,
        "severity": severity,
        "malware_type": malware_type,
        "productivity": productivity,
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S,%f")[:-3],
        "log": log_message,
        "ip": request.remote_addr,
        "user_agent": request.headers.get("User-Agent", ""),
        "category": category,
        "category_type": productivity,
        "url": visited_url
    }

    write_pretty_log(log_entry)
    log_to_mongodb(log_entry)
    return jsonify({"status": "Log received"}), 200

@app.route("/logs/recent", methods=["GET"])
def recent_logs():
    logs = list(collection.find().sort("time", -1).limit(10))
    for log in logs:
        log["_id"] = str(log["_id"])
    return jsonify(logs)

@app.route("/logs/view", methods=["GET"])
def view_logs():
    return render_template("logs.html")

# Run locally only (Gunicorn will use `app` directly)
if __name__ == "__main__":
    print("Log file path:", log_file_path.resolve())
    if not os.access(log_file_path, os.W_OK):
        print("Warning: server.log is not writable.")
    else:
        print("server.log is writable.")
    app.run(host="0.0.0.0", port=5000)

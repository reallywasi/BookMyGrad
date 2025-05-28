from flask import Flask, request, jsonify, render_template, redirect, url_for, make_response
from flask_cors import CORS
from flask_dance.contrib.google import make_google_blueprint, google
import os
from datetime import datetime
from pymongo import MongoClient
from pathlib import Path

app = Flask(__name__)
CORS(app)
app.secret_key = "supersecret"  # Change to a secure value in production

# Ensure logs directory exists
os.makedirs("siem-log-server/logs", exist_ok=True)
log_file_path = Path("logs/server.log")

# MongoDB setup
client = MongoClient('mongodb://localhost:27017')
db = client['logs_database']
collection = db['server_logs']

# Predefined categories and associated keywords
CATEGORIES = {
    "Entertainment": ["netflix", "youtube", "spotify", "primevideo", "hulu"],
    "Social Media": ["facebook", "twitter", "instagram", "tiktok", "snapchat"],
    "News": ["cnn", "bbc", "nytimes", "reuters", "news"],
    "Work": ["slack", "github", "gitlab", "zoom", "microsoft teams"],
    "Education": ["khanacademy", "coursera", "edx", "udemy", "academia"],
    "Shopping": ["amazon", "ebay", "flipkart", "etsy", "walmart"],
    "Gaming": ["twitch", "steam", "epicgames", "roblox", "riotgames"],
    "Finance": ["paypal", "bank", "finance", "trading", "investment"],
    "Adult": ["porn", "xxx", "sex", "adult", "nsfw"],
    "Other": []
}

def categorize_log(message: str) -> str:
    message = message.lower()
    for category, keywords in CATEGORIES.items():
        if any(keyword in message for keyword in keywords):
            return category
    return "Other"

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

# ---------------- Google OAuth ----------------
google_bp = make_google_blueprint(
    client_id="YOUR_GOOGLE_CLIENT_ID",
    client_secret="YOUR_GOOGLE_CLIENT_SECRET",
    redirect_to="after_login",
    scope=["profile", "email"]
)
app.register_blueprint(google_bp, url_prefix="/login")

@app.route("/after_login")
def after_login():
    if not google.authorized:
        return redirect(url_for("google.login"))

    resp = google.get("/oauth2/v2/userinfo")
    if not resp.ok:
        return "Failed to fetch user info.", 400

    return redirect("/logs/view")

# ---------------- Routes ----------------
@app.route("/log", methods=["POST"])
def receive_log():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    log_message = data.get("log", "")
    log_level = data.get("level", "INFO")
    log_entry = {
        "level": log_level,
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S,%f")[:-3],
        "log": log_message,
        "ip": request.remote_addr,
        "user_agent": request.headers.get("User-Agent", ""),
        "category": categorize_log(log_message)
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

# ---------------- Main ----------------
if __name__ == "__main__":
    print("Log file path:", log_file_path.resolve())
    if not os.access(log_file_path, os.W_OK):
        print("Warning: server.log is not writable.")
    else:
        print("server.log is writable.")
    app.run(debug=True)

import os
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)

# Ensure logs directory exists
os.makedirs("logs", exist_ok=True)

log_file_path = "logs/server.log"

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
    with open(log_file_path, "a", encoding="utf-8") as f:
        for key, value in entry.items():
            f.write(f"{key}: {value}\n")
        f.write("\n")  # Blank line between entries

@app.route("/log", methods=["POST"])
def receive_log():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    log_message = data.get("log", "")

    log_level = data.get("level", "INFO").upper()

log_entry = {
        "level": log_level,

        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S,%f")[:-3],
        "log": log_message,
        "ip": request.remote_addr,
        "user_agent": request.headers.get("User-Agent", ""),
        "category": categorize_log(log_message)
    }

    write_pretty_log(log_entry)
    return jsonify({"status": "Log received"}), 200

if __name__ == "__main__":
    app.run(debug=True)

import os
import json
import logging
import re
from flask import Flask, request, render_template
from flask_cors import CORS
from logging import FileHandler
from urllib.parse import urlparse

app = Flask(__name__)
CORS(app)

# === Keyword Categories ===
CATEGORY_KEYWORDS = {
    "Work": ["mail", "docs", "github", "notion", "office"],
    "Fun": ["9gag", "buzzfeed", "memes"],
    "Entertainment": ["youtube", "spotify", "netflix", "hotstar", "primevideo"],
    "Shopping": ["amazon", "flipkart", "myntra", "snapdeal", "ebay"],
    "Social": ["facebook", "instagram", "twitter", "linkedin", "snapchat"],
    "News": ["cnn", "bbc", "nytimes", "ndtv", "reuters"],
    "Tech": ["techcrunch", "thenextweb", "wired", "arstechnica"],
    "Finance": ["moneycontrol", "economictimes", "tradingview", "groww", "zerodha"],
    "Education": ["coursera", "edx", "khanacademy", "udemy", "brilliant"],
    "Gaming": ["twitch", "steam", "epicgames", "ign", "gamespot"]
}

# === Categorization Helpers ===
def extract_url_from_log(log_text):
    match = re.search(r'(https?://[^\s]+)', log_text)
    return match.group(0) if match else ""

def categorize_log(log):
    url = log.get("url", "").lower()
    if not url:
        url = extract_url_from_log(log.get("log", "").lower())
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").replace("www.", "")
    content = f"{hostname} {url}"
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in content for keyword in keywords):
            return category
    return "Other"

# === Custom JSON Formatter ===
class JSONFormatter(logging.Formatter):
    def format(self, record):
        base_log = {
            "level": record.levelname,
            "time": self.formatTime(record, self.datefmt)
        }
        try:
            msg_data = json.loads(record.getMessage())
            if isinstance(msg_data, dict):
                base_log.update(msg_data)
            else:
                base_log["log"] = msg_data
        except Exception:
            base_log["log"] = record.getMessage()
        return json.dumps(base_log, indent=2)

# === Logging Setup ===
os.makedirs("logs", exist_ok=True)
log_file = "logs/server.log"
open(log_file, "w").close()  # Clear old logs

logger = logging.getLogger("siem_logger")
logger.setLevel(logging.INFO)
logger.handlers.clear()  # Clear old handlers

file_handler = FileHandler(log_file)
file_handler.setFormatter(JSONFormatter())
logger.addHandler(file_handler)

# === Flask Routes ===
@app.route('/')
def dashboard():
    return render_template('index.html')

@app.route('/log', methods=['POST'])
def receive_log():
    data = request.get_json()
    data['ip'] = request.remote_addr
    data['user_agent'] = request.headers.get('User-Agent')
    data['category'] = categorize_log(data)
    logger.info(json.dumps(data))
    return {"status": "received"}, 200

@app.route('/logs', methods=['GET'])
def get_logs():
    with open(log_file, "r") as f:
        lines = f.read().strip().split('\n')
        last_logs = [json.loads(line) for line in lines if line.strip()]
    return {"logs": last_logs}

# === Main Entry Point ===
if __name__ == '__main__':
    app.run(debug=True, port=5000)

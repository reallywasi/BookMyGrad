from flask import Flask, request, jsonify
from datetime import datetime, timedelta
import os

app = Flask(__name__)

LOG_FILE_PATH = os.path.join("siem-log-server", "logs", "server.log")

print("Looking for logs at:", LOG_FILE_PATH)
print("File exists:", os.path.exists(LOG_FILE_PATH))


def parse_log_blocks(file_path):
    logs = []
    with open(file_path, 'r') as file:
        block = {}
        for line in file:
            line = line.strip()
            if not line:
                if block:
                    logs.append(block)
                    block = {}
                continue
            if ": " in line:
                key, value = line.split(": ", 1)
                block[key.strip()] = value.strip()
        if block:
            logs.append(block)
    return logs

@app.route("/chrome-logs", methods=["GET", "POST"])
def get_chrome_logs():
    # Default to GET parameters
    hours = request.args.get("hours", default=None, type=int)

    # If it's a POST, override with JSON body
    if request.method == "POST":
        data = request.get_json(silent=True)
        if data and "hours" in data:
            hours = data["hours"]

    if not os.path.exists(LOG_FILE_PATH):
        return jsonify({"error": "Log file not found"}), 404

    logs = []
    now = datetime.utcnow()
    all_logs = parse_log_blocks(LOG_FILE_PATH)

    for log in all_logs:
        log_time_str = log.get("time")
        if not log_time_str:
            continue
        try:
            log_time = datetime.strptime(log_time_str, "%Y-%m-%d %H:%M:%S,%f")
        except ValueError:
            continue

        if hours:
            if now - log_time > timedelta(hours=hours):
                continue

        if "chrome" in log.get("user_agent", "").lower() or "google.com" in log.get("log", ""):
            logs.append(log)

    return jsonify(logs), 200

if __name__ == "__main__":
    app.run(debug=True, port=5001)

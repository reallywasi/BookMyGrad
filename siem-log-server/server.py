import os
import json
import logging
from flask import Flask, request
from flask_cors import CORS
from logging.handlers import RotatingFileHandler

app = Flask(__name__)
CORS(app)

# === Pretty JSON Formatter ===
class JSONFormatter(logging.Formatter):
    def format(self, record):
        base_log = {
            "level": record.levelname,
            "time": self.formatTime(record, self.datefmt)
        }

        # Try to extract log content from the message
        try:
            msg_data = json.loads(record.getMessage().replace("'", '"'))
            if isinstance(msg_data, dict):
                base_log.update(msg_data)
            else:
                base_log["message"] = msg_data
        except Exception:
            base_log["message"] = record.getMessage()

        # Pretty print with 2-space indentation
        return json.dumps(base_log, indent=2)

# === Logging Setup ===
os.makedirs("logs", exist_ok=True)
log_file = "logs/server.log"

file_handler = RotatingFileHandler(log_file, maxBytes=10**6, backupCount=5)
file_handler.setFormatter(JSONFormatter())

logger = logging.getLogger("siem_logger")
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)

# === Flask Route ===
@app.route('/log', methods=['POST'])
def receive_log():
    data = request.get_json()
    logger.info(data)
    return {"status": "received"}, 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)

import win32evtlog
import json
import requests
import time
import os
from datetime import datetime

# === Configuration ===
SERVER = 'localhost'
LOG_TYPE = 'Security'  # Or 'System', 'Application'
SIEM_ENDPOINT = "http://localhost:5000/log"
LOG_DIR = "logs"
LOG_FILE = f"windows_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl"

# === Fetch all Windows Event Logs ===
def fetch_logs():
    hand = win32evtlog.OpenEventLog(SERVER, LOG_TYPE)
    flags = win32evtlog.EVENTLOG_SEQUENTIAL_READ | win32evtlog.EVENTLOG_FORWARDS_READ
    logs = []

    while True:
        events = win32evtlog.ReadEventLog(hand, flags, 0)
        if not events:
            break
        for ev_obj in events:
            try:
                log_data = {
                    'event_id': ev_obj.EventID,
                    'source_name': ev_obj.SourceName,
                    'time_generated': str(ev_obj.TimeGenerated),
                    'event_type': ev_obj.EventType,
                    'event_category': ev_obj.EventCategory,
                    'computer_name': ev_obj.ComputerName,
                    'string_inserts': ev_obj.StringInserts
                }
                logs.append(log_data)
            except:
                continue  # Skip malformed logs
    return logs

# === Send logs to SIEM server ===
def send_logs(logs):
    try:
        requests.get("http://localhost:5000", timeout=2)
        for log in logs:
            try:
                requests.post(SIEM_ENDPOINT, json=log, timeout=2)
            except:
                continue  # Silent failure if individual send fails
    except:
        pass  # Silent failure if Flask is not running

# === Save logs to local file ===
def save_logs_to_file(logs):
    if not logs:
        return
    os.makedirs(LOG_DIR, exist_ok=True)
    path = os.path.join(LOG_DIR, LOG_FILE)
    with open(path, "a", encoding='utf-8') as f:
        for log in logs:
            f.write(json.dumps(log) + "\n")

# === Main Agent Loop ===
def main():
    time.sleep(5)  # Give Flask a chance to boot
    logs = fetch_logs()
    send_logs(logs)
    save_logs_to_file(logs)

if __name__ == "__main__":
    main()

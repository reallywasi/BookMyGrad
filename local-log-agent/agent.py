import win32evtlog
import json
import requests
import time
import os

# Configuration
SERVER = 'localhost'
LOG_TYPE = 'Security'  # Or 'System', 'Application'
SIEM_ENDPOINT = "http://localhost:5000/log"
LOG_FILE = "windows_logs.json"

def fetch_logs():
    hand = win32evtlog.OpenEventLog(SERVER, LOG_TYPE)
    flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ

    logs = []
    while True:
        events = win32evtlog.ReadEventLog(hand, flags, 0)
        if not events:
            break  # No more events
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
            except Exception as e:
                print(f"Error parsing event: {e}")
    return logs

def send_logs(logs):
    for log in logs:
        try:
            response = requests.post(SIEM_ENDPOINT, json=log)
            print(f"[+] Sent log: {response.status_code}")
        except Exception as e:
            print(f"[!] Failed to send log: {e}")

def save_logs_to_file(logs):
    if not logs:
        return
    os.makedirs("logs", exist_ok=True)
    with open("logs/" + LOG_FILE, "a", encoding='utf-8') as f:
        for log in logs:
            f.write(json.dumps(log) + "\n")

def main():
    print("[*] Starting Windows Log Agent")
    while True:
        logs = fetch_logs()
        send_logs(logs)
        save_logs_to_file(logs)
        time.sleep(300)  # Wait 5 minutes before fetching again

if __name__ == "__main__":
    main()

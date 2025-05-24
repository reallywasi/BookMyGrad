import psutil
import json
import time
import os
from datetime import datetime, timezone

OUTLOOK_PROCESS_NAME = "olk.exe"
LOG_DIR = "logs"
LOG_FILE = os.path.join(LOG_DIR, "outlook_desktop_log.json")

def is_outlook_running():
    for proc in psutil.process_iter(['name']):
        if proc.info['name'] == OUTLOOK_PROCESS_NAME:
            return True
    return False

def write_log(entry):
    os.makedirs(LOG_DIR, exist_ok=True)
    log_data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "log_type": "email",
        "source": "outlook_desktop_monitor",
        "message": entry,
        "level": "INFO"
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(log_data) + "\n")

def main():
    last_state = None
    while True:
        current_state = is_outlook_running()
        if current_state != last_state:
            status = "Outlook opened" if current_state else "Outlook closed"
            print(status)
            write_log(status)
            last_state = current_state
        time.sleep(5)

if __name__ == "__main__":
    main()

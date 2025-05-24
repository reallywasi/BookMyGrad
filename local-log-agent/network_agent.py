# local-log-agent/network_agent.py

import requests
import json
import time
import os
from datetime import datetime

SIEM_ENDPOINT = 'http://localhost:5000/log'
LOG_DIR = 'logs'
os.makedirs(LOG_DIR, exist_ok=True)

def generate_network_log():
    log = {
        "level": "INFO",
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "log": "Suspicious network traffic detected on port 445",
        "ip": "192.168.1.10",
        "user_agent": "Nmap/7.91",
        "category": "Network"
    }
    return log

def save_log(log):
    filename = os.path.join(LOG_DIR, f"network_{datetime.now().strftime('%Y%m%d')}.jsonl")
    with open(filename, "a") as f:
        f.write(json.dumps(log) + "\n")

def send_log(log):
    try:
        requests.post(SIEM_ENDPOINT, json=log)
    except Exception as e:
        print(f"Failed to send log: {e}")

if __name__ == "__main__":
    while True:
        log = generate_network_log()
        save_log(log)
        send_log(log)
        time.sleep(10)  # generate a log every 10 seconds

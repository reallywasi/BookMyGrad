import requests
import random
import time
from datetime import datetime

SIEM_ENDPOINT = "http://localhost:5000/log"

POLICY_VIOLATIONS = [
    "Unauthorized software detected",
    "USB storage device connected",
    "Login from disallowed location",
    "Screen capture attempt blocked",
    "Security software disabled"
]

def generate_policy_log():
    return {
        "level": "WARNING",
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "log": random.choice(POLICY_VIOLATIONS),
        "ip": "127.0.0.1",
        "category": "Policy Violation"
    }

def send_log(log):
    try:
        res = requests.post(SIEM_ENDPOINT, json=log)
        res.raise_for_status()
        print("Sent:", log)
    except requests.RequestException as e:
        print("Failed to send log:", e)

if __name__ == "__main__":
    while True:
        log = generate_policy_log()
        send_log(log)
        time.sleep(4)

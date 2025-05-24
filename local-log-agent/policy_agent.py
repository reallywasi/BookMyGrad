import subprocess
import time
import json
import os
from datetime import datetime

LOG_DIR = "logs"
LOG_FILE = os.path.join(LOG_DIR, "policy_log.json")

def ensure_log_directory():
    os.makedirs(LOG_DIR, exist_ok=True)

def get_security_policy_snapshot():
    # Export current security policy
    subprocess.run(["secedit", "/export", "/cfg", "current_policy.inf"], capture_output=True)
    policy = {}
    try:
        with open("current_policy.inf", "r", encoding="utf-16") as file:
            for line in file:
                if "=" in line and not line.startswith('['):
                    key, value = line.strip().split("=", 1)
                    policy[key.strip()] = value.strip()
    except FileNotFoundError:
        pass
    return policy

def log_change(changes):
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": "POLICY_CHANGE",
        "details": changes
    }
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")

def main():
    ensure_log_directory()
    print("Monitoring policy changes. Press Ctrl+C to stop.")
    previous_policy = get_security_policy_snapshot()

    while True:
        time.sleep(10)  # Check every 10 seconds
        current_policy = get_security_policy_snapshot()
        changes = {}
        for key in current_policy:
            if key not in previous_policy or current_policy[key] != previous_policy[key]:
                changes[key] = {
                    "old": previous_policy.get(key),
                    "new": current_policy[key]
                }
        if changes:
            print("Policy change detected")
            log_change(changes)
            previous_policy = current_policy

if __name__ == "__main__":
    main()

import requests
import time
import random
import socket

SIEM_ENDPOINT = 'http://localhost:5000/log'

def send_log(log):
    try:
        response = requests.post(SIEM_ENDPOINT, json=log)
        response.raise_for_status()
        print(f"Sent log: {log}")
    except Exception as e:
        print(f"Failed to send log: {e}")

def generate_file_access_log():
    filenames = ["confidential.docx", "data.csv", "report.pdf", "script.py", "secret.txt"]
    actions = ["read", "write", "delete", "rename"]
    
    return {
        "level": "INFO",
        "time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "log": f"File {random.choice(filenames)} was {random.choice(actions)}",
        "ip": socket.gethostbyname(socket.gethostname()),
        "category": "File"
    }

while True:
    log = generate_file_access_log()
    send_log(log)
    time.sleep(3)

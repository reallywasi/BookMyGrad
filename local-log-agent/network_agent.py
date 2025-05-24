import time
import json
import socket
import psutil
import requests
from datetime import datetime
import os

LOG_FILE = "logs/network_log.json"
SERVER_URL = "http://127.0.0.1:5000/log"  # Your server endpoint

os.makedirs("logs", exist_ok=True)

def get_connection_info():
    connections = []
    for conn in psutil.net_connections(kind="inet"):
        if conn.raddr and conn.status == "ESTABLISHED":
            connections.append({
                "timestamp": datetime.utcnow().isoformat(),
                "laddr": f"{conn.laddr.ip}:{conn.laddr.port}",
                "raddr": f"{conn.raddr.ip}:{conn.raddr.port}",
                "pid": conn.pid,
                "process": psutil.Process(conn.pid).name() if conn.pid else None
            })
    return connections

def write_log(data):
    with open(LOG_FILE, "a") as f:
        for entry in data:
            json.dump(entry, f)
            f.write("\n")

def send_to_server(data):
    for entry in data:
        try:
            requests.post(SERVER_URL, json=entry)
        except Exception as e:
            print(f"Failed to send log: {e}")

def main():
    while True:
        logs = get_connection_info()
        if logs:
            write_log(logs)
            send_to_server(logs)
        time.sleep(5)  # Adjust as needed

if __name__ == "__main__":
    main()

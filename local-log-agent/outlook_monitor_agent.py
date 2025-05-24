import psutil
import requests
import time

SIEM_ENDPOINT = "http://localhost:5000/log"
OUTLOOK_PROCESS_NAME = "OUTLOOK.EXE"  # Adjust this if necessary based on actual process name

def is_outlook_running():
    for proc in psutil.process_iter(['name']):
        if proc.info['name'] and proc.info['name'].lower() == OUTLOOK_PROCESS_NAME.lower():
            return True
    return False

def send_log(message):
    log_data = {
        "log": message,
        "level": "INFO",
        "category": "Work",
        "ip": "127.0.0.1",
        "user_agent": "outlook-monitor"
    }
    try:
        response = requests.post(SIEM_ENDPOINT, json=log_data)
        if response.status_code == 200:
            print(f"Sent log: {message}")
        else:
            print(f"Failed to send log: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error sending log: {e}")

if __name__ == "__main__":
    was_running = False
    while True:
        currently_running = is_outlook_running()
        print("Outlook running:", currently_running)  # Debugging output
        if currently_running and not was_running:
            send_log("Outlook desktop client opened")
        elif not currently_running and was_running:
            send_log("Outlook desktop client closed")
        was_running = currently_running
        time.sleep(5)

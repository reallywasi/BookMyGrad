import os
import json
import logging
from datetime import datetime, timezone
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

LOG_DIR = "logs"
LOG_FILE = os.path.join(LOG_DIR, "file_access_log.json")
MONITOR_PATH = os.path.expanduser("~")  # You can change this to any directory

class FileAccessHandler(FileSystemEventHandler):
    def on_any_event(self, event):
        if event.is_directory:
            return

        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event.event_type,
            "file_path": event.src_path
        }
        write_log(log_entry)

def write_log(log_entry):
    os.makedirs(LOG_DIR, exist_ok=True)
    with open(LOG_FILE, "a") as f:
        json.dump(log_entry, f)
        f.write("\n")

def main():
    event_handler = FileAccessHandler()
    observer = Observer()
    observer.schedule(event_handler, MONITOR_PATH, recursive=True)
    observer.start()
    print(f"Monitoring real-time file access in: {MONITOR_PATH}")

    try:
        while True:
            pass  # Keeps the script running
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    main()

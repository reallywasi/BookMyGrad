from flask import Flask, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

@app.route("/log", methods=["POST"])
def log():
    data = request.get_json()
    log_message = data.get("log", "No message received")
    print(f"Received log: {log_message}")
    return {"status": "success"}, 200

if __name__ == "__main__":
    app.run(debug=True)

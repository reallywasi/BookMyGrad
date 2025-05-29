from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from datetime import datetime

app = Flask(__name__)
app.config["MONGO_URI"] = "mongodb+srv://siem_user:akru9722@cluster0.llztri7.mongodb.net/?retryWrites=true&w=majority"

mongo = PyMongo(app)

@app.route("/users", methods=["POST"])
def add_user():
    data = request.get_json()
    if not data or not data.get("username") or not data.get("email"):
        return jsonify({"error": "Missing username or email"}), 400

    #  Insert log into logs_database.server_logs
    mongo.cx["logs_database"]["server_logs"].insert_one({
        "username": data["username"],
        "email": data["email"],
        "source": "user_entry",
        "level": "INFO",
        "timestamp": datetime.utcnow()
    })
    return jsonify({"message": "Log added to server_logs"}), 201

if __name__ == "__main__":
    app.run(debug=True)

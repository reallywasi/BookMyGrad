from flask import Flask, request, jsonify
from flask_pymongo import PyMongo

# Initialize Flask app
app = Flask(__name__)

# MongoDB Configuration (replace DB name as needed)
app.config["MONGO_URI"] = "mongodb://localhost:27017/siem_logs"
mongo = PyMongo(app)

# Test connection
@app.route("/")
def home():
    return "Connected to MongoDB!"

# Add a user
@app.route("/users", methods=["POST"])
def add_user():
    users = mongo.db.users
    users.insert_one({
        'username': request.json["username"], 
        'email': request.json["email"]
    })
    return jsonify({"message": "User added!"}), 201

# Get users
@app.route("/users", methods=["GET"])
def get_users():
    users = mongo.db.users.find()
    return jsonify(
        [{
            "username": user["username"], 
            "email": user["email"]
        } for user in users]
    )

# Run the Flask app
if __name__ == "__main__":
    app.run(debug=True)

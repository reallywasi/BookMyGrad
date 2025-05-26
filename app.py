from flask import Flask
from flask_pymongo import PyMongo

# Creating a Flask app instance
app = Flask(__name__)

# Configure MongoDB Connection URI
# NOTE: Change URI for MongoDB Atlas
app.config["MONGO_URI"] = "mongodb://localhost:27017/test"

# Creating a PyMongo Instance
mongo = PyMongo(app)

if __name__ == "__main__":
    # Run the app in debug mode
    app.run(debug=True)

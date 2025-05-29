import logging
from pymongo import MongoClient
from datetime import datetime

class MongoHandler(logging.Handler):
    def __init__(self, uri, db_name, collection_name):
        logging.Handler.__init__(self)
        self.client = MongoClient(uri)
        self.collection = self.client[db_name][collection_name]

    def emit(self, record):
        log_entry = self.format(record)
        log_document = {
            "message": log_entry,
            "level": record.levelname,
            "logger": record.name,
            "timestamp": datetime.utcnow()
        }
        self.collection.insert_one(log_document)

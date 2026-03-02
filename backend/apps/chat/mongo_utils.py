"""
MongoDB connection utility
"""
from pymongo import MongoClient
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

_client = None
_db = None


def get_mongo_client():
    """Get MongoDB client (singleton)"""
    global _client
    if _client is None:
        mongo_host = settings.MONGO_HOST
        mongo_user = settings.MONGO_USER
        mongo_password = settings.MONGO_PASSWORD
        
        if mongo_user and mongo_password:
            mongo_uri = f"mongodb://{mongo_user}:{mongo_password}@{mongo_host}"
        else:
            mongo_uri = mongo_host
        
        logger.info(f"Connecting to MongoDB: {mongo_host}")
        _client = MongoClient(mongo_uri)
    
    return _client


def get_mongo_db():
    """Get MongoDB database"""
    global _db
    if _db is None:
        client = get_mongo_client()
        _db = client[settings.MONGO_DB_NAME]
        logger.info(f"Using MongoDB database: {settings.MONGO_DB_NAME}")
    
    return _db


def get_collection(name):
    """Get a MongoDB collection"""
    db = get_mongo_db()
    return db[name]


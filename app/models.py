import pandas as pd
import json
import os

class DataLoader:
    _instance = None
    
    def __new__(cls, data_folder):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.data_folder = data_folder
            cls._instance.load_data()
        return cls._instance
    
    def load_data(self):
        try:
            df = pd.read_csv(os.path.join(self.data_folder, 'wikidata_artworks.csv'))
            self.wikidata_artworks = df.fillna('').to_dict('records')
        except Exception as e:
            print(f"Error loading wikidata: {e}")
            self.wikidata_artworks = []
        
        try:
            df = pd.read_csv(os.path.join(self.data_folder, 'list_with_wikidata.csv'))
            self.editors_choice = df.fillna('').to_dict('records')
        except Exception as e:
            print(f"Error loading editors choice: {e}")
            self.editors_choice = []
        
        try:
            df = pd.read_csv(os.path.join(self.data_folder, 'artist_info.csv'))
            self.artist_info = df.fillna('').to_dict('records')
        except Exception as e:
            print(f"Error loading artist info: {e}")
            self.artist_info = []
        
        try:
            with open(os.path.join(self.data_folder, 'artist_desc.json'), 'r', encoding='utf-8') as f:
                self.artist_desc = json.load(f)
        except Exception as e:
            print(f"Error loading artist descriptions: {e}")
            self.artist_desc = {}

class UserManager:
    def __init__(self, data_file='user_data.json'):
        self.data_file = data_file
    
    def load_users(self):
        if os.path.exists(self.data_file):
            with open(self.data_file, 'r') as f:
                return json.load(f)
        return {}
    
    def save_users(self, users):
        with open(self.data_file, 'w') as f:
            json.dump(users, f, indent=2)
    
    def get_user(self, username):
        users = self.load_users()
        return users.get(username, {
            'collection': [],
            'quiz_stats': {'correct': 0, 'total': 0}
        })
    
    def create_or_update_user(self, username, password=None, **kwargs):
        users = self.load_users()
        if username not in users:
            users[username] = self.get_user(username)
            if password:
                users[username]['password'] = password
        
        for key, value in kwargs.items():
            users[username][key] = value
        
        self.save_users(users)
        return users[username]

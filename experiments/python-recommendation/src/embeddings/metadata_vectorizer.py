import numpy as np
import pandas as pd
from sklearn.preprocessing import MultiLabelBinarizer
import ast
import pickle
import os

class MetadataVectorizer:
    def __init__(self, model_dir="models"):
        self.model_dir = model_dir
        self.genre_mlb = MultiLabelBinarizer()
        self.artist_mlb = MultiLabelBinarizer()
        self.mood_columns = None

    def build_vectors(self, song_details):
        def parse_list(x):
            if isinstance(x, str) and x.startswith('['):
                return ast.literal_eval(x)
            return [x] if pd.notna(x) else []

        genres = song_details["genres"].apply(parse_list)
        artists = song_details["artist_names"].apply(parse_list)
        moods = song_details["mood"]

        genre_vec = self.genre_mlb.fit_transform(genres)
        artist_vec = self.artist_mlb.fit_transform(artists)
        
        mood_df = pd.get_dummies(moods)
        self.mood_columns = mood_df.columns 
        mood_vec = mood_df.values

        vectors = np.hstack([
            genre_vec,
            mood_vec,
            artist_vec
        ])

        return vectors
    def save_models(self):
        os.makedirs(self.model_dir, exist_ok=True)
        with open(os.path.join(self.model_dir, "genre_mlb.pkl"), "wb") as f:
            pickle.dump(self.genre_mlb, f)
        with open(os.path.join(self.model_dir, "artist_mlb.pkl"), "wb") as f:
            pickle.dump(self.artist_mlb, f)
        with open(os.path.join(self.model_dir, "mood_cols.pkl"), "wb") as f:
            pickle.dump(self.mood_columns, f)
    
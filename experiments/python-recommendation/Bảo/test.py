from fastapi import FastAPI
import tensorflow as tf
import pickle
import numpy as np
import pandas as pd

with open("models/user_to_index.pkl", "rb") as f:
    user_mapping = pickle.load(f)  # Cấu trúc: {Index: UserID}
    
with open("models/item_to_index.pkl", "rb") as f:
    item_mapping = pickle.load(f)  # Cấu trúc: {Index: ArtistID}

user_id_to_idx = {v: k for k, v in user_mapping.items()}

# print("User Mapping sample:", list(user_mapping.items())[:10])
# print("Item Mapping sample:", list(item_mapping.items())[:10])
# print("User ID to Index sample:", list(user_id_to_idx.items())[:10])
u_idx = user_id_to_idx.get(1)
print(f"User ID 2 maps to Index: {u_idx}")

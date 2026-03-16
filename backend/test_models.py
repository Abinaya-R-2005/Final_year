from transformers import AutoTokenizer, AutoModel
import torch
print("Loading SciBERT...")
t1 = AutoTokenizer.from_pretrained("allenai/scibert_scivocab_uncased")
m1 = AutoModel.from_pretrained("allenai/scibert_scivocab_uncased")
print("SciBERT Loaded.")
print("Loading BERT...")
t2 = AutoTokenizer.from_pretrained("bert-base-uncased")
m2 = AutoModel.from_pretrained("bert-base-uncased")
print("BERT Loaded.")
print("Success.")

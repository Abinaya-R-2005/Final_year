from transformers import AutoTokenizer, AutoModel
import torch

# Model Names
SCIBERT_NAME = "allenai/scibert_scivocab_uncased"
BERT_NAME = "bert-base-uncased"

# Load SciBERT
sci_tokenizer = AutoTokenizer.from_pretrained(SCIBERT_NAME)
sci_model = AutoModel.from_pretrained(SCIBERT_NAME)
sci_model.eval()

# Load Standard BERT
bert_tokenizer = AutoTokenizer.from_pretrained(BERT_NAME)
bert_model = AutoModel.from_pretrained(BERT_NAME)
bert_model.eval()


def get_model_and_tokenizer(use_scibert=True):
    if use_scibert:
        return sci_model, sci_tokenizer
    return bert_model, bert_tokenizer

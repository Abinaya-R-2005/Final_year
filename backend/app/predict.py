import torch
import torch.nn.functional as F
import re
from .model import sci_model, sci_tokenizer, bert_model, bert_tokenizer
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))


DOMAIN_ANCHORS = {
    "Computer Science": [
        "algorithms computer vision deep learning neural networks software cloud",
        "computational logic programming languages distributed systems database ai",
        "artificial intelligence machine learning robotics security automation"
    ],
    "Medical Science": [
        "clinical trial patient treatment cardiovascular surgery clinical pharma",
        "hospitals diagnostic imaging surgical health medicine therapeutic",
        "infectious diseases immunology pathology oncology radiology surgery"
    ],
    "Psychology": [
        "behavioral cognitive mental disorders emotional social human behavior",
        "anxiety depression therapy developmental psychology personality",
        "neuroscience cognitive flexibility brain function perception memory"
    ],
    "Biochemistry": [
        "molecular biology protein enzyme genomic DNA RNA cellular metabolism",
        "metabolic pathways amino acids microbiology biochemistry lipids",
        "proteomics synthesis mitochondria organelles biology chemical"
    ],
    "Physics": [
        "quantum mechanics relativity particle physics cosmology astrophysics",
        "gravitational waves theoretical physics atomic nuclear optics",
        "electromagnetism thermodynamics quantum field theory stellar"
    ],
    "Environmental Science": [
        "ecology climate change biodiversity sustainability pollution",
        "conservation renewable energy ecosystems geology meteorology",
        "carbon footprint marine biology environmental impact"
    ],
    "Economics": [
        "macroeconomics microeconomics market trends fiscal policy banking",
        "econometric models finance global trade inflation gdp",
        "behavioral economics stock market monetary theory"
    ],
    "Law & Social Science": [
        "jurisprudence constitutional sociology governance human rights",
        "public policy legislative criminal justice international law",
        "anthropology political science legal theory"
    ]
}

# --- Publication metadata detection helpers ---

def detect_publication_meta(text: str) -> dict:
    """Heuristically determine whether the provided text appears to be from a published paper."""
    text_lower = text.lower()

    doi_match = re.search(r"\b(10\.\d{4,9}/\S+?)\b", text, flags=re.IGNORECASE)
    doi = doi_match.group(1) if doi_match else None

    has_copyright = bool(re.search(r"©|copyright|all rights reserved", text, flags=re.IGNORECASE))
    has_references = bool(re.search(r"\b(references|bibliography|acknowledg(e)?ments?)\b", text, flags=re.IGNORECASE))
    has_section_headers = bool(re.search(r"\b(introduction|methods|results|discussion|conclusion)\b", text, flags=re.IGNORECASE))

    is_published = bool(doi or has_copyright or has_references or has_section_headers)

    notes = []
    if doi:
        notes.append("Found DOI-like string")
    if has_copyright:
        notes.append("Contains copyright/rights notice")
    if has_references:
        notes.append("Appears to include a references section")
    if has_section_headers:
        notes.append("Contains standard academic section headers")

    return {
        "is_published": is_published,
        "doi": doi,
        "has_references": has_references,
        "has_copyright": has_copyright,
        "notes": "; ".join(notes) if notes else None
    }


def extract_sections_from_text(text: str) -> dict:
    """Extract common sections (abstract/results/conclusion) from text using headers."""
    # Normalize line endings
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    headers = [
        "abstract", "introduction", "methods", "materials and methods", "results",
        "discussion", "conclusion", "conclusions", "acknowledgments", "references"
    ]

    # Find header positions
    positions = []
    for h in headers:
        for match in re.finditer(rf"^\s*{re.escape(h)}\b", normalized, flags=re.IGNORECASE | re.MULTILINE):
            positions.append((match.start(), h))

    positions.sort()

    sections = {}
    for idx, (pos, h) in enumerate(positions):
        start = pos
        end = positions[idx + 1][0] if idx + 1 < len(positions) else len(normalized)
        section_text = normalized[start:end].strip()
        sections[h.lower()] = section_text

    # Provide best sections even if we didn't find headers
    return {
        "abstract": sections.get("abstract", ""),
        "results": sections.get("results", ""),
        "conclusion": sections.get("conclusion", sections.get("conclusions", "")),
        "methods": sections.get("methods", sections.get("materials and methods", ""))
    }


async def summarize_text(text: str, mode: str = "plain") -> str:
    """Summarize text using Gemini if available, otherwise fallback to extractive summarization."""
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        # Use Gemini for better summaries
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
            prompt = f"""
            Please provide a concise summary of the following scientific text.
            
            Summary style: {mode}
            
            Text:
            {text[:3000]}
            """
            response = await model.generate_content_async(prompt)
            return response.text.strip()
        except Exception:
            pass

    # Fallback extractive summary
    sentences = re.split(r'(?<=[\.\?\!])\s+', text.strip())
    if not sentences:
        return ""

    if mode == "highschool":
        return " ".join(sentences[:2]) + "\n\n(This is a simplified summary meant for a general audience.)"
    if mode == "professor":
        return " ".join(sentences[:4])
    if mode == "executive":
        return " ".join(sentences[:3]) + "\n\n(Key takeaways are highlighted above.)"

    return " ".join(sentences[:3])


def get_embedding(text, model, tokenizer):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
    with torch.no_grad():
        outputs = model(**inputs)
        # Handle different output formats (some models return last_hidden_state directly)
        hidden_states = outputs.last_hidden_state if hasattr(outputs, 'last_hidden_state') else outputs[0]
        embeddings = hidden_states.mean(dim=1)
    return embeddings

def get_token_importance(text, model, tokenizer, anchor_emb):
    tokens = tokenizer.tokenize(text)
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
    
    with torch.no_grad():
        outputs = model(**inputs)
        hidden_states = outputs.last_hidden_state if hasattr(outputs, 'last_hidden_state') else outputs[0]
        # Ignore [CLS] and [SEP]
        token_embeddings = hidden_states[0][1:-1]
    
    importances = []
    # Map tokens back to original words roughly
    words = re.findall(r'\w+', text.lower())
    
    for i, token_emb in enumerate(token_embeddings):
        if i >= len(tokens): break
        sim = F.cosine_similarity(token_emb.unsqueeze(0), anchor_emb).item()
        token_str = tokens[i].replace('##', '')
        if len(token_str) > 2:
            importances.append({"word": token_str, "importance": sim})
            
    # Sort and take top 10
    importances.sort(key=lambda x: x["importance"], reverse=True)
    return importances[:12]

# Pre-calculate anchor embeddings for both models
ANCHORS_SCI = {}
ANCHORS_BERT = {}

for domain, sentences in DOMAIN_ANCHORS.items():
    sci_emb = torch.cat([get_embedding(s, sci_model, sci_tokenizer) for s in sentences]).mean(dim=0, keepdim=True)
    bert_emb = torch.cat([get_embedding(s, bert_model, bert_tokenizer) for s in sentences]).mean(dim=0, keepdim=True)
    ANCHORS_SCI[domain] = sci_emb
    ANCHORS_BERT[domain] = bert_emb

def generate_graph_data(predicted_domain, similarities):
    # Static colors for domains
    domain_colors = {
        "Computer Science": "#2563eb",
        "Medical Science": "#dc2626",
        "Psychology": "#9333ea",
        "Biochemistry": "#16a34a",
        "Physics": "#f59e0b",
        "Environmental Science": "#10b981",
        "Economics": "#6366f1",
        "Law & Social Science": "#ec4899"
    }

    nodes = []
    links = []

    # Paper Node (Center)
    nodes.append({"id": "paper", "label": "Current Paper", "color": "#1e293b", "val": 20})

    # Domain Nodes
    for domain, sim in similarities.items():
        nodes.append({
            "id": domain,
            "label": domain,
            "color": domain_colors.get(domain, "#94a3b8"),
            "val": 15
        })

    # Ensure the predicted domain is always connected
    links.append({"source": "paper", "target": predicted_domain})

    # Add additional links for other domains based on decent similarity
    for domain, sim in similarities.items():
        if domain == predicted_domain:
            continue
        if sim > 0.62:  # show close domains
            links.append({"source": "paper", "target": domain})

    return {"nodes": nodes, "links": links}

def generate_suggestions(text, domain):
    base_suggestions = {
        "Computer Science": [
            {"title": "Scalability Analysis", "description": "Investigate how this architecture performs when scaled to petabyte-level distributed datasets."},
            {"title": "Adversarial Robustness", "description": "Test the model's resistance against specialized noise injection and gradient-based attacks."}
        ],
        "Medical Science": [
            {"title": "Long-itudinal Clinical Trial", "description": "A 5-year follow-up study to determine long-term therapeutic safety and patient recovery rates."},
            {"title": "Demographic Stratification", "description": "Analyze if the treatment efficacy varies across different age groups and genetic backgrounds."}
        ],
        "Psychology": [
            {"title": "Cross-Cultural Validation", "description": "Test if these behavioral patterns hold true in non-Western populations with different social norms."},
            {"title": "Neuro-imaging Correlation", "description": "Use functional MRI to correlate self-reported anxiety scores with actual brain activity in the amygdala."}
        ],
        "Biochemistry": [
            {"title": "In-Vivo Validation", "description": "Move from cellular models to live organism testing to observe real-time metabolic feedback loops."},
            {"title": "Enzyme Optimization", "description": "Apply directed evolution techniques to further enhance the catalytic efficiency of the identified proteins."}
        ],
        "Physics": [
            {"title": "High-Energy Validation", "description": "Test consistent particle decay patterns in next-gen hadron colliders."},
            {"title": "Relativistic Modeling", "description": "Apply the theory to extreme gravity environments near neutron stars."}
        ],
        "Environmental Science": [
            {"title": "Ecosystem Resilience", "description": "Examine how biodiversity recovery rates change under intensified climate stress."},
            {"title": "Bioremediation Study", "description": "Test using specialized bacteria to neutralize toxins identified in this abstract."}
        ],
        "Economics": [
            {"title": "Macro-Stability Stress Test", "description": "Apply the model to recession scenarios to see if fiscal policy holds up."},
            {"title": "Market Sentiment Analysis", "description": "Correlate these trade patterns with real-time social media financial feeds."}
        ],
        "Law & Social Science": [
            {"title": "Policy Implementation Review", "description": "A field study to see if the proposed laws actually reduce crime rates in urban zones."},
            {"title": "Socio-Economic Stratification", "description": "Analyze if the legal benefits apply equally across different income brackets."}
        ]
    }
    return base_suggestions.get(domain, [])

def calculate_complexity(text, keywords):
    # Calculate Complexity based on word diversity and scientific keyword density
    avg_word_len = sum(len(w) for w in text.split()) / len(text.split()) if text.split() else 0
    keyword_strength = sum(k['importance'] for k in keywords) / len(keywords) if keywords else 0
    
    score = (avg_word_len * 10) + (keyword_strength * 30)
    score = max(20, min(100, score))
    
    if score < 50:
        level = "Entry Level"
        details = "The terminology is accessible to non-experts and undergraduate students. Focuses on foundational concepts."
    elif score < 75:
        level = "Intermediate"
        details = "Requires domain knowledge. Uses specialized methodology and advanced technical vocabulary."
    else:
        level = "Expert / PhD"
        details = "Highly technical paper with deep mathematical or molecular density. Suitable for peer researchers."
        
    return {"level": level, "score": round(score, 1), "details": details}

def get_journal_recommendations(domain, text: str = ""):
    text_l = text.lower()

    journals = {
        "Computer Science": [
            {"name": "IEEE TPAMI", "impact_factor": "24.3", "relevance": "High correlation with advanced ML architecture and computer vision research."},
            {"name": "Nature Machine Intelligence", "impact_factor": "15.5", "relevance": "Strong focus on novel algorithmic contributions and learning systems."},
            {"name": "CVPR", "impact_factor": "0.0", "relevance": "Top-tier venue for computer vision and image understanding."},
            {"name": "NeurIPS", "impact_factor": "0.0", "relevance": "Premier conference for foundational machine learning and deep learning research."}
        ],
        "Medical Science": [
            {"name": "The Lancet", "impact_factor": "202.7", "relevance": "Clinical relevance fits trial scope."},
            {"name": "NEJM", "impact_factor": "176.1", "relevance": "High significance in patient outcomes."},
            {"name": "Nature Medicine", "impact_factor": "87.2", "relevance": "Broad translational impact and medical innovation."}
        ],
        "Psychology": [
            {"name": "Psychological Review", "impact_factor": "14.2", "relevance": "Matches behavioral theory depth."},
            {"name": "Annual Review of Psychology", "impact_factor": "22.5", "relevance": "Integrative review potential."},
            {"name": "Journal of Experimental Psychology", "impact_factor": "5.2", "relevance": "Empirical studies and experimental methods."}
        ],
        "Biochemistry": [
            {"name": "Cell", "impact_factor": "66.8", "relevance": "Molecular mechanism depth matched."},
            {"name": "Nature Methods", "impact_factor": "47.9", "relevance": "Novel protein binding methodology."},
            {"name": "Journal of Biological Chemistry", "impact_factor": "4.2", "relevance": "Biochemical pathways and molecular biology."}
        ],
        "Physics": [
            {"name": "Physical Review Letters", "impact_factor": "9.1", "relevance": "Matches theoretical breakthrough scope."},
            {"name": "Nature Physics", "impact_factor": "19.6", "relevance": "Quantum/Stellar alignment."},
            {"name": "Journal of Applied Physics", "impact_factor": "2.3", "relevance": "Experimental and applied physics findings."}
        ],
        "Environmental Science": [
            {"name": "Nature Climate Change", "impact_factor": "30.7", "relevance": "Ecological impact relevance."},
            {"name": "Science of The Total Environment", "impact_factor": "10.8", "relevance": "Broad sustainability appeal."},
            {"name": "Environmental Research Letters", "impact_factor": "9.4", "relevance": "Policy and solutions for environmental challenges."}
        ],
        "Economics": [
            {"name": "Journal of Political Economy", "impact_factor": "9.5", "relevance": "Econometric model alignment."},
            {"name": "Quarterly Journal of Economics", "impact_factor": "17.4", "relevance": "High macro/micro significance."},
            {"name": "Journal of Economic Perspectives", "impact_factor": "4.9", "relevance": "Broad economic theory and policy discussion."}
        ],
        "Law & Social Science": [
            {"name": "Harvard Law Review", "impact_factor": "5.6", "relevance": "Jurisprudential depth matched."},
            {"name": "Social Networks", "impact_factor": "4.1", "relevance": "Sociological pattern correlation."},
            {"name": "Law & Society Review", "impact_factor": "2.6", "relevance": "Law in social context."}
        ]
    }

    # Try to surface the most relevant journals based on keywords in the abstract
    domain_journals = journals.get(domain, [])

    if not text_l or not domain_journals:
        return domain_journals

    # Simple keyword prioritization for common themes
    priority = []
    if domain == "Computer Science":
        if any(k in text_l for k in ["image", "vision", "segmentation"]):
            priority = ["CVPR", "IEEE TPAMI"]
        elif any(k in text_l for k in ["transformer", "language", "nlp"]):
            priority = ["NeurIPS", "Nature Machine Intelligence"]
        else:
            priority = ["Nature Machine Intelligence", "IEEE TPAMI"]

    if domain == "Medical Science":
        if "clinical" in text_l or "trial" in text_l:
            priority = ["The Lancet", "NEJM"]
        elif "genomic" in text_l or "molecular" in text_l:
            priority = ["Nature Medicine", "The Lancet"]

    if domain == "Environmental Science":
        if "climate" in text_l or "carbon" in text_l:
            priority = ["Nature Climate Change", "Environmental Research Letters"]

    # Reorder results based on priority
    if priority:
        ordered = []
        for p in priority:
            for j in domain_journals:
                if j["name"] == p:
                    ordered.append(j)
        for j in domain_journals:
            if j not in ordered:
                ordered.append(j)
        return ordered

    return domain_journals

async def get_dynamic_insights(text, initial_domain):
    """Use Gemini to refine classification and provide dynamic research insights."""
    api_key = os.getenv("GEMINI_API_KEY")
    print(f"DEBUG: GEMINI_API_KEY found: {'Yes' if api_key else 'No'}")
    if not api_key:
        return None

    try:
        print(f"DEBUG: Calling Gemini for refinement...")
        model = genai.GenerativeModel('gemini-2.5-flash') # Use flash for speed
        prompt = f"""
        Analyze the following scientific text and provide research metadata in JSON format.
        
        TEXT:
        {text[:2000]}
        
        Initial SciBERT classification: {initial_domain}
        
        Available Domains: Computer Science, Medical Science, Psychology, Biochemistry, Physics, Environmental Science, Economics, Law & Social Science.
        
        Return exactly this JSON structure:
        {{
            "verified_domain": "Correct Domain from list",
            "complexity": {{
                "score": 0-100,
                "level": "Entry Level / Intermediate / Expert",
                "details": "Explanation of why this text is complex"
            }},
            "suggestions": [
                {{"title": "Specific Suggestion Title", "description": "Specific detail-oriented next step"}},
                {{"title": "Specific Suggestion Title", "description": "Specific detail-oriented next step"}}
            ],
            "journals": [
                {{"name": "Journal Name", "impact_factor": "X.X", "relevance": "Why it fits THIS specific paper"}},
                {{"name": "Journal Name", "impact_factor": "X.X", "relevance": "Why it fits THIS specific paper"}}
            ]
        }}
        """
        response = await model.generate_content_async(prompt)
        print("DEBUG: Gemini response received")
        # Clean the response to ensure valid JSON
        json_str = response.text.strip()
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0].strip()
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0].strip()
        
        return json.loads(json_str)
    except Exception as e:
        print(f"Error getting dynamic insights: {e}")
        return None

async def run_prediction(text, model, tokenizer, anchors):

    input_emb = get_embedding(text, model, tokenizer)
    
    scores = []
    similarities = {}
    for domain, anchor_emb in anchors.items():
        sim = F.cosine_similarity(input_emb, anchor_emb).item()
        similarities[domain] = sim
        # Normalize for radar (0-100)
        norm_score = (sim - 0.5) * 200 
        scores.append({"subject": domain, "A": max(10, min(100, norm_score))})
    
    predicted_domain = max(similarities, key=similarities.get)
    max_sim = similarities[predicted_domain]
    min_sim = min(similarities.values())
    
    confidence = 0.7 + ((max_sim - min_sim) / (1 - min_sim) * 0.29) if (1-min_sim) != 0 else 0.9
    
    keywords = get_token_importance(text, model, tokenizer, anchors[predicted_domain])

    publication_meta = detect_publication_meta(text)
    
    # GET DYNAMIC INSIGHTS (Refinement)
    dynamic = await get_dynamic_insights(text, predicted_domain)
    
    if dynamic:
        # Override with "Correct" classification and dynamic content
        final_domain = dynamic.get("verified_domain", predicted_domain)
        # Handle case where AI gives a domain slightly outside the list
        if final_domain not in DOMAIN_ANCHORS:
            final_domain = predicted_domain
            
        return {
            "domain": final_domain,
            "confidence": round(confidence, 3),
            "radarData": scores,
            "keywords": keywords,
            "graphData": generate_graph_data(final_domain, similarities), # Re-generate with final domain
            "suggestions": dynamic.get("suggestions", []),
            "complexity": dynamic.get("complexity", {}),
            "journals": dynamic.get("journals", []),
            "publicationMeta": publication_meta
        }
    
    # FALLBACK: Static generation if AI fails
    graph_data = generate_graph_data(predicted_domain, similarities)
    suggestions = generate_suggestions(text, predicted_domain)
    complexity = calculate_complexity(text, keywords)
    journals = get_journal_recommendations(predicted_domain, text)
    
    return {
        "domain": predicted_domain,
        "confidence": round(confidence, 3),
        "radarData": scores,
        "keywords": keywords,
        "graphData": graph_data,
        "suggestions": suggestions,
        "complexity": complexity,
        "journals": journals,
        "publicationMeta": publication_meta
    }

async def classify_text_advanced(text: str, compare: bool = False):
    res_sci = await run_prediction(text, sci_model, sci_tokenizer, ANCHORS_SCI)
    
    if not compare:
        return res_sci
    
    res_bert = await run_prediction(text, bert_model, bert_tokenizer, ANCHORS_BERT)
    return {
        "sciBert": res_sci,
        "standardBert": res_bert
    }

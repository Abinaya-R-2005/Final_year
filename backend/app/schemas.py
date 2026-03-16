from pydantic import BaseModel
from typing import List, Dict, Optional

class TextRequest(BaseModel):
    text: str
    compare: bool = False

class PublicationMeta(BaseModel):
    is_published: bool
    doi: Optional[str] = None
    has_references: bool
    has_copyright: bool
    notes: Optional[str] = None

class DomainScore(BaseModel):
    subject: str
    A: float  # Score

class HighlightedWord(BaseModel):
    word: str
    importance: float

class GraphNode(BaseModel):
    id: str
    label: str
    color: str
    val: int

class GraphEdge(BaseModel):
    source: str
    target: str

class KnowledgeGraph(BaseModel):
    nodes: List[GraphNode]
    links: List[GraphEdge]

class ResearchSuggestion(BaseModel):
    title: str
    description: str

class ComplexityInfo(BaseModel):
    level: str
    score: float # 0-100
    details: str

class JournalInfo(BaseModel):
    name: str
    impact_factor: str
    relevance: str

class PredictionResponse(BaseModel):
    domain: str
    confidence: float
    radarData: List[DomainScore]
    keywords: List[HighlightedWord]
    graphData: KnowledgeGraph
    suggestions: List[ResearchSuggestion]
    complexity: ComplexityInfo
    journals: List[JournalInfo]
    publicationMeta: Optional[PublicationMeta] = None

class ComparisonResponse(BaseModel):
    sciBert: PredictionResponse
    standardBert: PredictionResponse

class ChatRequest(BaseModel):
    text: str # The paper text context
    question: str # User's question
    full_text: Optional[str] = None # For RAG

class LiteratureReviewRequest(BaseModel):
    texts: List[str]

class SummarizeRequest(BaseModel):
    text: str
    mode: Optional[str] = "plain"  # plain, highschool, professor, executive

class SummarizeResponse(BaseModel):
    mode: str
    summary: str

class SectionsResponse(BaseModel):
    abstract: str
    results: str
    conclusion: str
    methods: str

import React, { useState, useEffect } from 'react';
import TextInput from '../components/TextInput';
import ResultCard from '../components/ResultCard';
import InterdisciplinaryChart from '../components/InterdisciplinaryChart';
import ConfidenceChart from '../components/ConfidenceChart';
import KnowledgeMap from '../components/KnowledgeMap';
import ResearchAssistant from '../components/ResearchAssistant';
import { classifyText, getHistory, getBenchmarking, getStatus, summarizeText, extractSections, generateLiteratureReview } from '../api/classifyApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('analyze'); // analyze, benchmarking, history
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [compareMode, setCompareMode] = useState(false);
    const [history, setHistory] = useState([]);
    const [benchmarkingData, setBenchmarkingData] = useState(null);
    const [visibleInsight, setVisibleInsight] = useState(null); // 'complexity', 'journals', 'graph'
    const [currentText, setCurrentText] = useState('');
    const [systemStatus, setSystemStatus] = useState({ scibert: 'online', database: 'online' });
    const [summary, setSummary] = useState('');
    const [summaryMode, setSummaryMode] = useState('plain');
    const [sections, setSections] = useState(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    
    // Literature Review State
    const [selectedHistoryItems, setSelectedHistoryItems] = useState([]);
    const [literatureReviewResult, setLiteratureReviewResult] = useState('');
    const [isGeneratingReview, setIsGeneratingReview] = useState(false);
    const [currentFullText, setCurrentFullText] = useState('');

    useEffect(() => {
        if (activeTab === 'history') loadHistory();
        if (activeTab === 'benchmarking') loadBenchmarking();
        checkStatus();
        const interval = setInterval(checkStatus, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [activeTab]);

    const checkStatus = async () => {
        const status = await getStatus();
        setSystemStatus(status);
    };

    const loadHistory = async () => {
        try {
            const data = await getHistory();
            setHistory(data);
        } catch (err) { console.error(err); }
    };

    const loadBenchmarking = async () => {
        try {
            const data = await getBenchmarking();
            setBenchmarkingData(data);
        } catch (err) { console.error(err); }
    };

    const handleClassify = async (text, full_text = null) => {
        setLoading(true);
        setError(null);
        setResult(null);
        setSummary('');
        setSections(null);
        try {
            setCurrentText(text); // Store for chat context
            if (full_text) setCurrentFullText(full_text);
            const data = await classifyText(text, compareMode);
            setResult(data);
        } catch (err) {
            setError("Failed to analyze. Ensure backend and MongoDB are running.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReview = async () => {
        if (selectedHistoryItems.length < 2) return;
        setIsGeneratingReview(true);
        setLiteratureReviewResult('');
        try {
            // Fetch the texts for the selected items
            const textsToReview = history
                .filter(item => selectedHistoryItems.includes(item._id || item.timestamp))
                .map(item => item.full_text || item.text_preview);
            
            const response = await generateLiteratureReview(textsToReview);
            setLiteratureReviewResult(response.review);
        } catch (err) {
            setError("Failed to generate literature review.");
        } finally {
            setIsGeneratingReview(false);
        }
    };

    const toggleHistorySelection = (id) => {
        setSelectedHistoryItems(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSummarize = async (mode) => {
        if (!currentText) return;
        setIsSummarizing(true);
        setSummaryMode(mode);
        setSummary('');
        try {
            const s = await summarizeText(currentText, mode);
            setSummary(s);
        } catch (err) {
            setError("Summary generation failed. Please check backend and Gemini key.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleExtractSections = async () => {
        if (!currentText) return;
        setIsExtracting(true);
        setSections(null);
        try {
            const sec = await extractSections(currentText);
            setSections(sec);
        } catch (err) {
            setError("Section extraction failed.");
        } finally {
            setIsExtracting(false);
        }
    };

    const navItems = [
        { id: 'analyze', label: 'Analyze', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { id: 'benchmarking', label: 'Benchmarking', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
        { id: 'history', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-8 md:min-h-screen sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-200">B</div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">BERT-V4</h1>
                </div>

                <nav className="flex flex-col gap-2">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={item.icon} />
                            </svg>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto p-4 bg-slate-100 rounded-2xl">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Status</p>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${systemStatus.scibert === 'ready' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="text-xs font-bold text-slate-600">SciBERT {systemStatus.scibert === 'ready' ? 'Online' : 'Offline'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${systemStatus.database === 'online' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
                            <span className="text-xs font-bold text-slate-600">Database {systemStatus.database === 'online' ? 'Online' : 'Offline'}</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-4 md:p-12 overflow-y-auto">
                <div className="max-w-6xl mx-auto">

                    {activeTab === 'analyze' && (
                        <div className="space-y-10">
                            <header className="mb-12">
                                <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 tracking-tighter">Research Discovery</h1>
                                <p className="text-slate-500 font-medium">Extract insights from scientific literature using fine-tuned transformers.</p>
                            </header>

                            <div className="flex justify-center mb-10">
                                <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex items-center shadow-sm">
                                    <button onClick={() => setCompareMode(false)} className={`text-xs font-black px-6 py-2.5 rounded-xl transition-all ${!compareMode ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>SINGLE MODEL</button>
                                    <button onClick={() => setCompareMode(true)} className={`text-xs font-black px-6 py-2.5 rounded-xl transition-all ${compareMode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>COMPARISON MODE</button>
                                </div>
                            </div>

                            <div className="glass p-8 rounded-[2rem] border-slate-200">
                                <TextInput onSubmit={handleClassify} onTextUpdate={setCurrentText} isLoading={loading} />
                            </div>

                            {/* Deep Insights Zone */}
                            {result && !compareMode && (
                                <div className="space-y-8 animate-fade-in-up">
                                    {/* Navigation Buttons */}
                                    <div className="flex flex-wrap justify-center gap-4 py-8 border-y border-slate-100">
                                        <button
                                            onClick={() => setVisibleInsight(null)}
                                            className={`px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${!visibleInsight ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-200'}`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                            SUMMARY VIEW
                                        </button>
                                        <button
                                            onClick={() => setVisibleInsight(visibleInsight === 'complexity' ? null : 'complexity')}
                                            className={`px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${visibleInsight === 'complexity' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:border-amber-200'}`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            TECHNICAL COMPLEXITY
                                        </button>
                                        <button
                                            onClick={() => setVisibleInsight(visibleInsight === 'journals' ? null : 'journals')}
                                            className={`px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${visibleInsight === 'journals' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-200'}`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                            PUBLICATION TARGETS
                                        </button>
                                        <button
                                            onClick={() => setVisibleInsight(visibleInsight === 'graph' ? null : 'graph')}
                                            className={`px-6 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${visibleInsight === 'graph' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:border-emerald-200'}`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                                            GLOBAL CONTEXT MAP
                                        </button>
                                    </div>

                                    {/* Content Area (Basic Result OR Deep Insight) */}
                                    <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 animate-fade-in-up">
                                        {!visibleInsight ? (
                                            /* Default View: Basic Analysis */
                                            <div className="space-y-12">
                                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                                    <div className="lg:col-span-7">
                                                        <ResultCard result={result} />

                                                        <div className="mt-8 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                                            <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
                                                            <div className="flex flex-wrap gap-3 mb-4">
                                                                {['plain', 'highschool', 'professor', 'executive'].map(mode => (
                                                                    <button
                                                                        key={mode}
                                                                        onClick={() => handleSummarize(mode)}
                                                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${summaryMode === mode ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                                    >
                                                                        Summarize ({mode})
                                                                    </button>
                                                                ))}

                                                                <button
                                                                    onClick={handleExtractSections}
                                                                    className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
                                                                >
                                                                    Extract Sections
                                                                </button>
                                                            </div>

                                                            {isSummarizing && <p className="text-sm text-slate-500">Generating summary…</p>}
                                                            {summary && (
                                                                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                                                    <h4 className="text-sm font-bold text-slate-700 mb-2">Summary ({summaryMode})</h4>
                                                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{summary}</p>
                                                                </div>
                                                            )}

                                                            {isExtracting && <p className="text-sm text-slate-500">Extracting sections…</p>}
                                                            {sections && (
                                                                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                                                    <h4 className="text-sm font-bold text-slate-700 mb-2">Extracted Sections</h4>
                                                                    {sections.abstract && (
                                                                        <div className="mb-3">
                                                                            <h5 className="text-xs font-bold uppercase text-slate-400">Abstract</h5>
                                                                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{sections.abstract}</p>
                                                                        </div>
                                                                    )}
                                                                    {sections.results && (
                                                                        <div className="mb-3">
                                                                            <h5 className="text-xs font-bold uppercase text-slate-400">Results</h5>
                                                                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{sections.results}</p>
                                                                        </div>
                                                                    )}
                                                                    {sections.conclusion && (
                                                                        <div className="mb-3">
                                                                            <h5 className="text-xs font-bold uppercase text-slate-400">Conclusion</h5>
                                                                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{sections.conclusion}</p>
                                                                        </div>
                                                                    )}
                                                                    {sections.methods && (
                                                                        <div>
                                                                            <h5 className="text-xs font-bold uppercase text-slate-400">Methods</h5>
                                                                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{sections.methods}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="lg:col-span-5 flex flex-col gap-8">
                                                        <ConfidenceChart confidence={result.confidence} />
                                                        <InterdisciplinaryChart data={result.radarData} />
                                                    </div>
                                                </div>
                                                <div className="text-center py-4">
                                                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Select a module above for deep intelligence</p>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Selected Insight View */
                                            <div className="animate-fade-in-up">
                                                {visibleInsight === 'complexity' && (
                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                                        <div className="md:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 flex flex-col items-center justify-center text-center shadow-lg shadow-amber-500/5">
                                                            <div className="w-24 h-24 rounded-full border-8 border-amber-100 flex items-center justify-center mb-4">
                                                                <span className="text-3xl font-black text-amber-600">{result.complexity.score}%</span>
                                                            </div>
                                                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{result.complexity.level}</h3>
                                                        </div>
                                                        <div className="md:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-200">
                                                            <h4 className="text-lg font-bold text-slate-800 mb-2">Complexity Rationalization</h4>
                                                            <p className="text-slate-500 leading-relaxed font-medium">{result.complexity.details}</p>
                                                            <div className="mt-6 flex gap-2">
                                                                <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-lg uppercase">Vocabulary Density Active</span>
                                                                <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-lg uppercase">Structural Analysis Done</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {visibleInsight === 'journals' && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        {result.journals.map((journal, i) => (
                                                            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:border-indigo-200 transition-all shadow-sm hover:shadow-xl group">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <h3 className="text-xl font-black text-slate-800 max-w-[70%]">{journal.name}</h3>
                                                                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl text-xs font-black">IF: {journal.impact_factor}</span>
                                                                </div>
                                                                <p className="text-slate-500 text-sm font-medium mb-6"> {journal.relevance}</p>
                                                                <button className="w-full py-3 bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white transition-all text-slate-400 font-black text-[10px] rounded-xl tracking-[0.2em] uppercase">VIEW SUBMISSION GUIDELINES</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {visibleInsight === 'graph' && (
                                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                                        <div className="lg:col-span-8">
                                                            <KnowledgeMap data={result.graphData} />
                                                        </div>
                                                        <div className="lg:col-span-4">
                                                            <ResearchAssistant suggestions={result.suggestions} paperText={currentText} fullText={currentFullText} />
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {result && compareMode && (
                                <div className="space-y-12 animate-fade-in-up mt-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-8">
                                            <ResultCard result={result.sciBert} title="SciBERT" />
                                            <ResearchAssistant suggestions={result.sciBert.suggestions} paperText={currentText} fullText={currentFullText} />
                                        </div>
                                        <div className="space-y-8">
                                            <ResultCard result={result.standardBert} title="Standard BERT" />
                                            <ResearchAssistant suggestions={result.standardBert.suggestions} paperText={currentText} fullText={currentFullText} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[500px]">
                                        <KnowledgeMap data={result.sciBert.graphData} />
                                        <KnowledgeMap data={result.standardBert.graphData} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'benchmarking' && (
                        <div className="space-y-12 animate-fade-in-up">
                            <header>
                                <h1 className="text-4xl font-black text-slate-800 mb-2">Model Benchmarking</h1>
                                <p className="text-slate-500">Comparative performance analysis from our training study.</p>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {benchmarkingData && Object.entries(benchmarkingData.hyperparameters).map(([key, val]) => (
                                    <div key={key} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{key.replace('_', ' ')}</p>
                                        <p className="text-2xl font-black text-blue-600">{val}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="glass p-8 rounded-[2rem] h-[500px]">
                                <h3 className="text-xl font-bold text-slate-800 mb-8">Accuracy Comparison (Standard vs Specialized)</h3>
                                <ResponsiveContainer width="100%" height="90%">
                                    <LineChart data={benchmarkingData?.accuracy_data}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="epoch" label={{ value: 'Epochs', position: 'insideBottomRight', offset: -10 }} />
                                        <YAxis domain={[60, 100]} label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }} />
                                        <ChartTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                        <Legend />
                                        <Line type="monotone" dataKey="SciBERT" stroke="#2563eb" strokeWidth={4} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                                        <Line type="monotone" dataKey="BioBERT" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" />
                                        <Line type="monotone" dataKey="BERT" stroke="#94a3b8" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-8 animate-fade-in-up">
                            <header>
                                <h1 className="text-4xl font-black text-slate-800 mb-2">Analysis History</h1>
                                <p className="text-slate-500 text-lg">Review and manage your previous scientific classifications.</p>
                            </header>

                            <div className="space-y-4">
                                {selectedHistoryItems.length >= 2 && (
                                    <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-2xl mb-6 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <h3 className="text-lg font-black text-indigo-900">Synthesize Literature Review</h3>
                                                <p className="text-indigo-700 text-sm">{selectedHistoryItems.length} papers selected for synthesis.</p>
                                            </div>
                                            <button 
                                                onClick={handleGenerateReview}
                                                disabled={isGeneratingReview}
                                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"
                                            >
                                                {isGeneratingReview ? 'Synthesizing...' : 'Generate Review'}
                                            </button>
                                        </div>
                                        {literatureReviewResult && (
                                            <div className="mt-4 p-6 bg-white rounded-xl border border-indigo-100 shadow-inner">
                                                <div className="prose prose-indigo max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                                                    {literatureReviewResult}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {history.map((item, i) => {
                                    const itemId = item._id || item.timestamp;
                                    const isSelected = selectedHistoryItems.includes(itemId);
                                    return (
                                    <div key={i} className={`bg-white p-6 rounded-2xl border ${isSelected ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200'} shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-blue-200 transition-colors`}>
                                        <div className="flex items-start gap-4">
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected}
                                                onChange={() => toggleHistorySelection(itemId)}
                                                className="mt-1 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-md">{item.result.sciBert ? item.result.sciBert.domain : item.result.domain}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 underline">{new Date(item.timestamp).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-slate-700 font-medium line-clamp-1">{item.text_preview}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => { setCompareMode(item.is_comparison); setResult(item.result); setActiveTab('analyze'); }} className="text-blue-600 font-black text-xs hover:underline uppercase tracking-tighter">VIEW DETAILS</button>
                                    </div>
                                    );
                                })}
                                {history.length === 0 && <div className="text-center py-20 text-slate-400 font-bold">No history found. Try analyzing a paper!</div>}
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default Dashboard;

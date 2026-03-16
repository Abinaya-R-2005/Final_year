import React, { useState, useRef, useEffect } from 'react';
import { chatWithPaper } from '../api/classifyApi';

const ResearchAssistant = ({ suggestions, paperText, fullText }) => {
    const [activeView, setActiveView] = useState('chat'); // 'suggestions' or 'chat'
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Hello! I am your Research Copilot. Ask me anything about this paper, or request a summary for a specific audience!' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (quickQuestion = null) => {
        const question = quickQuestion || input;
        if (!question.trim()) return;

        const newMessages = [...messages, { role: 'user', content: question }];
        setMessages(newMessages);
        setInput('');
        setIsTyping(true);

        try {
            const response = await chatWithPaper(paperText, question, fullText || null);
            setMessages([...newMessages, { role: 'ai', content: response }]);
        } catch (err) {
            setMessages([...newMessages, { role: 'ai', content: "Sorry, I had trouble connecting to the brain. Make sure the backend and Gemini API key are ready." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const quickActions = [
        "Summarize for a high schooler",
        "List study limitations",
        "Suggest related methodologies"
    ];

    if (!suggestions && !paperText) return null;

    // If there is no paper text yet, show a prompt instead of an interactive chat
    if (!paperText) {
        return (
            <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden h-[360px] flex flex-col shadow-2xl shadow-indigo-500/5 border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Research Copilot</h3>
                <p className="text-slate-500 leading-relaxed">Upload a PDF or paste an abstract and run analysis to enable Q&A. The assistant uses the analyzed abstract as context.</p>
            </div>
        );
    }

    return (
        <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden h-[600px] flex flex-col shadow-2xl shadow-indigo-500/5 border border-slate-200">
            {/* Header with Tabs */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveView('chat')}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeView === 'chat' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                    >
                        AI COPILOT
                    </button>
                    <button
                        onClick={() => setActiveView('suggestions')}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeView === 'suggestions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                    >
                        SCOPE
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isTyping ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Engine</span>
                </div>
            </div>

            {activeView === 'suggestions' ? (
                <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                    {suggestions?.map((item, i) => (
                        <div key={i} className="group p-6 bg-white/50 hover:bg-white rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all duration-300">
                            <h4 className="text-indigo-600 font-bold mb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px]">{i + 1}</span>
                                {item.title}
                            </h4>
                            <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Chat Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none border border-slate-200 flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {quickActions.map((action, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(action)}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition-all"
                            >
                                {action}
                            </button>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about methodology, limitations..."
                            className="w-full pl-5 pr-12 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 transition-all outline-none text-sm font-medium"
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={isTyping}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:scale-105 transition-all disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 12h14" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResearchAssistant;

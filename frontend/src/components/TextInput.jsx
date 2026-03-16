import React, { useRef } from 'react';
import { extractPdfText } from '../api/classifyApi';

const TextInput = ({ onSubmit, isLoading, onTextUpdate }) => {
    const [text, setText] = React.useState('');
    const fileInputRef = useRef(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onSubmit(text);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const data = await extractPdfText(file);
                const extractedText = data.text;
                setText(extractedText);
                if (onTextUpdate) onTextUpdate(extractedText, data.full_text);
                // Automatically run analysis when a PDF is uploaded
                if (onSubmit && extractedText.trim()) {
                    onSubmit(extractedText, data.full_text);
                }
            } catch (err) {
                alert("Failed to extract PDF. Please try copying text manually.");
            }
        }
    };

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex justify-between items-end">
                    <label htmlFor="abstract" className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Research Abstract
                    </label>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload PDF
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf"
                    />
                </div>

                <textarea
                    id="abstract"
                    className="w-full h-56 p-6 rounded-2xl border-2 border-slate-100 bg-white/50 text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all resize-none text-base leading-relaxed placeholder:text-slate-300"
                    placeholder="Paste abstract or upload a paper PDF..."
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        if (onTextUpdate) onTextUpdate(e.target.value);
                    }}
                    disabled={isLoading}
                />

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isLoading || !text.trim()}
                        className={`group relative flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg
              ${isLoading || !text.trim()
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/25 -translate-y-1 active:translate-y-0'
                            }`}
                    >
                        {isLoading ? 'Analyzing...' : 'Run Analysis'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TextInput;

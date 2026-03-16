import React from 'react';

const ResultCard = ({ result, title = "Classification Result" }) => {
  if (!result) return null;

  return (
    <div className="glass h-full p-8 rounded-3xl relative overflow-hidden flex flex-col">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Identified Domain</p>
          <p className="text-2xl font-black text-blue-600 tracking-tight">
            {result.domain}
          </p>
        </div>

        <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Confidence</p>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-black text-slate-800">{(result.confidence * 100).toFixed(1)}</span>
            <span className="text-sm font-bold text-slate-400 mb-1">%</span>
          </div>
        </div>

        {result.publicationMeta && (
          <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Publication Check</p>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold" style={{ color: result.publicationMeta.is_published ? '#047857' : '#b91c1c' }}>
                {result.publicationMeta.is_published ? 'Looks like a published paper' : 'No clear publication markers found'}
              </span>
              {result.publicationMeta.doi && (
                <span className="text-xs text-slate-500">DOI: {result.publicationMeta.doi}</span>
              )}
              {result.publicationMeta.notes && (
                <span className="text-xs text-slate-500">{result.publicationMeta.notes}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {result.keywords && result.keywords.length > 0 && (
        <div className="mt-auto">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Dominant Keywords (Explainable AI)
          </p>
          <div className="flex flex-wrap gap-2">
            {result.keywords.map((kw, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-bold border border-blue-100 transition-all hover:scale-110 cursor-default"
                style={{ opacity: 0.5 + (kw.importance * 0.5) }}
                title={`Importance: ${(kw.importance * 100).toFixed(1)}%`}
              >
                {kw.word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultCard;

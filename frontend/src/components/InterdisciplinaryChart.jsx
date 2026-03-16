import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const InterdisciplinaryChart = ({ data }) => {
    if (!data) return null;

    return (
        <div className="glass p-8 rounded-3xl h-full flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Domain Distribution</h3>
            <p className="text-sm text-slate-400 mb-8 text-center uppercase tracking-widest font-bold">Interdisciplinary Analysis</p>

            <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                            name="Similarity"
                            dataKey="A"
                            stroke="#2563eb"
                            fill="#3b82f6"
                            fillOpacity={0.5}
                            animationDuration={1500}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default InterdisciplinaryChart;

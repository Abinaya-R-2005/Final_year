import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const ConfidenceChart = ({ confidence }) => {
    if (confidence === null || confidence === undefined) return null;

    const percentage = (confidence * 100).toFixed(1);
    const data = [
        { name: 'Confidence', value: parseFloat(percentage) },
        { name: 'Other', value: 100 - parseFloat(percentage) },
    ];
    const COLORS = ['#2563eb', '#f1f5f9']; // Blue and Light Slate

    return (
        <div className="glass h-full p-8 rounded-3xl flex flex-col items-center justify-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Confidence Level</h3>
            <p className="text-sm text-slate-400 mb-8">Statistical Probability</p>

            <div className="relative w-full aspect-square max-w-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius="75%"
                            outerRadius="100%"
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                            startAngle={90}
                            endAngle={450}
                            stroke="none"
                            animationBegin={0}
                            animationDuration={1500}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl font-black text-slate-800 leading-none">{percentage}%</span>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-2">Accuracy</span>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    <span className="text-xs font-bold text-slate-600 uppercase">Certain</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <span className="text-xs font-bold text-slate-600 uppercase">Variance</span>
                </div>
            </div>
        </div>
    );
};

export default ConfidenceChart;

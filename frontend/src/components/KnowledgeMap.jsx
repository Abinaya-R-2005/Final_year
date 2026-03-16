import React, { useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const KnowledgeMap = ({ data }) => {
    const fgRef = useRef();

    useEffect(() => {
        if (fgRef.current) {
            fgRef.current.d3Force('link').distance(100);
            fgRef.current.zoom(2.5, 1000);
        }
    }, [data]);

    if (!data) return null;

    return (
        <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-slate-800">Knowledge Map</h3>
                    <p className="text-sm text-slate-400 font-medium">Relational Context Visualization</p>
                </div>
                <div className="flex gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                </div>
            </div>

            <div className="flex-1 bg-slate-900/5 rounded-3xl overflow-hidden border border-slate-100">
                <ForceGraph2D
                    ref={fgRef}
                    graphData={data}
                    nodeLabel="label"
                    nodeColor={node => node.color}
                    nodeRelSize={6}
                    linkWidth={2}
                    linkColor={() => '#cbd5e1'}
                    backgroundColor="rgba(0,0,0,0)"
                    width={700}
                    height={400}
                    onNodeClick={node => {
                        fgRef.current.centerAt(node.x, node.y, 1000);
                        fgRef.current.zoom(3, 1000);
                    }}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const label = node.label;
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Inter`;

                        // Draw Circle
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
                        ctx.fillStyle = node.color;
                        ctx.fill();

                        // Draw Label
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#1e293b';
                        ctx.fillText(label, node.x, node.y + 10);
                    }}
                />
            </div>

            <p className="mt-4 text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] text-center">
                Interactive 3D Simulation Mode Active
            </p>
        </div>
    );
};

export default KnowledgeMap;

"use client";
import React, { useEffect, useState } from 'react';
import {
    Sankey, Tooltip, ResponsiveContainer, Rectangle, Layer,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import {
    AlertCircle, Activity, Users, ArrowRight, DollarSign,
    TrendingUp, HelpCircle, Info, Wallet
} from 'lucide-react';

interface TrendData {
    year: number;
    admin_tax_percentage: number;
    total_clinical: number;
    total_bureaucratic: number;
}

export default function Dashboard() {
    const [adminTax, setAdminTax] = useState<any>(null);
    const [trendData, setTrendData] = useState<TrendData[]>([]);
    const [loading, setLoading] = useState(true);
    const [salary, setSalary] = useState(80000);
    const [activeTab, setActiveTab] = useState<'overview' | 'trends'>('overview');
    const [selectedYear, setSelectedYear] = useState<number | null>(null);

    // Simple progressive tax estimator for Ontario (2023 approx)
    const calculateTax = (income: number) => {
        let tax = 0;
        if (income > 220000) { tax += (income - 220000) * 0.1316; income = 220000; }
        if (income > 150000) { tax += (income - 150000) * 0.1216; income = 150000; }
        if (income > 98000) { tax += (income - 98000) * 0.1116; income = 98000; }
        if (income > 49231) { tax += (income - 49231) * 0.0915; income = 49231; }
        tax += income * 0.0505;
        return tax;
    };

    useEffect(() => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        async function fetchOverview() {
            try {
                const url = selectedYear ? `${API_URL}/admin-tax?year=${selectedYear}` : `${API_URL}/admin-tax`;
                const taxRes = await fetch(url).then(res => res.json());
                setAdminTax(taxRes);
                if (!selectedYear && taxRes.year) {
                    setSelectedYear(taxRes.year);
                }
            } catch (err) {
                console.error("Failed to fetch overview", err);
            }
        }
        fetchOverview();
    }, [selectedYear]);

    useEffect(() => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        async function fetchTrends() {
            try {
                const trendsRes = await fetch(`${API_URL}/trends/admin-tax`).then(res => res.json());
                setTrendData(trendsRes);
            } catch (err) {
                console.error("Failed to fetch trends", err);
            } finally {
                setLoading(false);
            }
        }
        fetchTrends();
    }, []);

    // Sankey Data Structure
    const sankeyData = {
        nodes: [
            { name: `Analyzed Payroll (${selectedYear || '...'})` },  // 0
            { name: 'Patient Care' },                  // 1
            { name: 'Bureaucracy' },                   // 2 
            { name: 'Frontline Staff' },               // 3
            { name: 'Medical Supplies' },              // 4
            { name: 'Management' },                    // 5
            { name: 'Consultants' },                   // 6
            { name: 'Policy Admin' }                   // 7
        ],
        links: [
            { source: 0, target: 1, value: adminTax ? adminTax.total_clinical : 1050000000 },
            { source: 0, target: 2, value: adminTax ? adminTax.total_bureaucratic : 5440000000 },
            { source: 1, target: 3, value: (adminTax ? adminTax.total_clinical : 1050000000) * 0.9 },
            { source: 1, target: 4, value: (adminTax ? adminTax.total_clinical : 1050000000) * 0.1 },
            { source: 2, target: 5, value: (adminTax ? adminTax.total_bureaucratic : 5440000000) * 0.4 },
            { source: 2, target: 6, value: (adminTax ? adminTax.total_bureaucratic : 5440000000) * 0.3 },
            { source: 2, target: 7, value: (adminTax ? adminTax.total_bureaucratic : 5440000000) * 0.3 },
        ]
    };

    // Custom Sankey Node Renderer
    const renderCustomSankeyNode = (props: any) => {
        const { x, y, width, height, index, payload, containerWidth } = props;
        const formatValue = (val: number) => {
            if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B`;
            if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
            return `$${val.toLocaleString()}`;
        };
        let fill = "#fff";
        if (index === 0) fill = "#3b82f6";
        if (index === 2 || index >= 5) fill = "#ef4444";
        if (index === 1 || index === 3 || index === 4) fill = "#10b981";

        const totalAnalyzed = (adminTax ? (adminTax.total_clinical + adminTax.total_bureaucratic) : 6490000000);
        const ratio = (payload.value / totalAnalyzed) * 100;
        const percent = ratio >= 100 ? "100" : ratio.toFixed(1);

        return (
            <Layer key={`custom-node-${index}`}>
                <Rectangle x={x} y={y} width={width} height={height} fill={fill} fillOpacity="0.8" radius={[4, 4, 4, 4]} />
                <text x={x > containerWidth / 2 ? x - 6 : x + width + 6} y={y + height / 2} textAnchor={x > containerWidth / 2 ? 'end' : 'start'} fontSize={14} fill="#fff" fontWeight="bold" dy={-8}>
                    {payload.name}
                </text>
                <text x={x > containerWidth / 2 ? x - 6 : x + width + 6} y={y + height / 2} textAnchor={x > containerWidth / 2 ? 'end' : 'start'} fontSize={12} fill="#a3a3a3" dy={12}>
                    {formatValue(payload.value)} <tspan fill="#666">({percent}%)</tspan>
                </text>
            </Layer>
        );
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white selection:bg-red-500/30 pb-20">
            {/* Navbar */}
            <nav className="border-b border-white/5 bg-neutral-950/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20">
                            <Activity className="text-white w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">HAP <span className="text-neutral-500 font-normal">| Healthcare Accountability</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4">
                            <select
                                value={selectedYear || ''}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-neutral-800 border border-white/10 text-neutral-300 text-xs font-mono px-3 py-1.5 rounded-full outline-none focus:border-red-500 cursor-pointer"
                            >
                                {trendData.sort((a, b) => b.year - a.year).map((d) => (
                                    <option key={d.year} value={d.year}>{d.year} REPORT</option>
                                ))}
                                {!trendData.length && <option value="2023">2023 REPORT</option>}
                            </select>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 pt-12">
                <header className="mb-12 text-center">
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent">
                        Where does the taxes go?
                    </h1>
                    <p className="text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                        Data-driven analysis of government healthcare spending vs. patient care delivery.
                    </p>
                </header>

                {/* NAVIGATION TABS */}
                <div className="flex justify-center mb-12">
                    <div className="bg-white/5 backdrop-blur-md rounded-full p-1 border border-white/10 flex space-x-2">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${activeTab === 'overview'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'text-neutral-400 hover:text-white'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('trends')}
                            className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${activeTab === 'trends'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                                : 'text-neutral-400 hover:text-white'
                                }`}
                        >
                            Historical Trends
                        </button>
                    </div>
                </div>

                {/* ================= OVERVIEW TAB ================= */}
                {activeTab === 'overview' && (
                    <>
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {/* OPAQUE SCOPE */}
                            <div className="group relative overflow-hidden rounded-3xl bg-neutral-900/50 border border-white/5 p-8 transition-all hover:border-neutral-500/30">
                                <div className="absolute top-0 right-0 p-8 opacity-5"><HelpCircle size={100} /></div>
                                <div className="text-neutral-400 text-sm font-medium uppercase tracking-wider mb-2">Unaccounted Funds</div>
                                <div className="text-5xl font-mono font-bold text-white mb-2">
                                    ~${adminTax ? ((adminTax.total_budget - (adminTax.total_clinical + adminTax.total_bureaucratic)) / 1000000000).toFixed(1) : '...'}B
                                </div>
                                <p className="text-neutral-500 text-sm">Of the ${adminTax ? (adminTax.total_budget / 1000000000).toFixed(1) : '...'}B total budget, this portion lacks detailed public roster data.</p>
                            </div>

                            {/* ADMIN TAX */}
                            <div className="group relative overflow-hidden rounded-3xl bg-neutral-900/50 border border-white/5 p-8 transition-all hover:border-orange-500/30">
                                <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp size={100} /></div>
                                <div className="text-orange-400 text-sm font-medium uppercase tracking-wider mb-2">Inefficiency Metric</div>
                                <div className="text-7xl font-mono font-bold text-white mb-2">{adminTax ? adminTax.admin_tax_percentage.toFixed(1) : '--'}%</div>
                                <p className="text-neutral-500 text-sm">Of high-earner payroll ($6.5B), 83.8% is consumed by bureaucracy.</p>
                            </div>

                            {/* SUNSHINE PAYROLL */}
                            <div className="group relative overflow-hidden rounded-3xl bg-neutral-900/50 border border-white/5 p-8 transition-all hover:border-amber-500/30">
                                <div className="absolute top-0 right-0 p-8 opacity-5"><DollarSign size={100} /></div>
                                <div className="text-amber-400 text-sm font-medium uppercase tracking-wider mb-2">Analyzed Payroll</div>
                                <div className="text-5xl font-mono font-bold text-white mb-2">${(adminTax ? (adminTax.total_bureaucratic + adminTax.total_clinical) / 1000000000 : 6.5).toFixed(2)}B</div>
                                <p className="text-neutral-500 text-sm">Total value of salaries &gt;$100k analyzed in this report.</p>
                            </div>
                        </div>

                        {/* CALCULATOR */}
                        <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-8 mb-12">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-green-500/20 rounded-xl"><Wallet className="w-6 h-6 text-green-400" /></div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Your Tax Impact</h3>
                                    <p className="text-gray-400 text-sm">Where does your money go?</p>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row gap-12">
                                <div className="flex-1">
                                    <label className="text-neutral-400 text-sm mb-2 block">Annual Salary: <span className="text-white font-mono font-bold">${salary.toLocaleString()}</span></label>
                                    <input type="range" min="30000" max="500000" step="5000" value={salary} onChange={(e) => setSalary(Number(e.target.value))} className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-green-500 mb-6" />
                                    <div className="bg-neutral-950/50 rounded-xl p-4 border border-white/5 text-sm space-y-2">
                                        <div className="flex justify-between"><span className="text-neutral-500">Est. Provincial Tax</span><span className="text-white">~${calculateTax(salary).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                                        <div className="flex justify-between"><span className="text-neutral-500">Healthcare Portion ({(adminTax ? adminTax.healthcare_portion_percentage * 100 : 41.5).toFixed(1)}%)</span><span className="text-green-400 font-bold">${(calculateTax(salary) * (adminTax ? adminTax.healthcare_portion_percentage : 0.415)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                                        <p className="text-neutral-600 text-xs mt-2 pt-2 border-t border-white/5">
                                            Based on {selectedYear || 2023} Ontario Budget: ${((adminTax?.total_budget || 0) / 1000000000).toFixed(1)}B Health Spend / ${((adminTax?.total_budget / (adminTax?.healthcare_portion_percentage || 1)) / 1000000000).toFixed(1)}B Total Revenue.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500"><TrendingUp size={20} /></div>
                                        <div>
                                            <div className="text-xs text-neutral-500 uppercase">Bureaucracy Cost</div>
                                            <div className="text-3xl font-bold text-white font-mono">${(calculateTax(salary) * (adminTax ? adminTax.healthcare_portion_percentage : 0.415) * (adminTax ? adminTax.admin_tax_percentage / 100 : 0.83)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500"><Users size={20} /></div>
                                        <div>
                                            <div className="text-xs text-neutral-500 uppercase">Patient Care</div>
                                            <div className="text-3xl font-bold text-white font-mono">${(calculateTax(salary) * (adminTax ? adminTax.healthcare_portion_percentage : 0.415) * (1 - (adminTax ? adminTax.admin_tax_percentage / 100 : 0.83))).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* EXTRAPOLATION BANNER */}
                        <div className="mb-8 p-8 rounded-3xl bg-gradient-to-r from-red-950/40 to-orange-950/40 border border-red-500/20 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-red-500/5"></div>
                            <h3 className="text-red-400 font-bold uppercase tracking-widest text-sm mb-4 relative z-10">The "Hidden" Cost of Bureaucracy (Extrapolated)</h3>
                            <div className="flex flex-col md:flex-row items-baseline justify-center gap-4 relative z-10">
                                <span className="text-6xl md:text-7xl font-black text-white tracking-tighter drop-shadow-2xl">
                                    ${adminTax ? ((adminTax.admin_tax_percentage / 100) * (adminTax.total_budget / 1000000000)).toFixed(1) : "..."} Billion
                                </span>
                            </div>
                            <p className="mt-4 text-red-200/60 text-sm max-w-2xl mx-auto relative z-10">
                                If the observed <strong>{adminTax?.admin_tax_percentage.toFixed(1)}% Administrative Tax</strong> from verified high-earner data applies to the full ${adminTax ? (adminTax.total_budget / 1000000000).toFixed(1) : "..."}B budget, this is the total potential cost of non-clinical overhead.
                            </p>
                        </div>

                        {/* SANKEY DIAGRAM */}
                        <section className="bg-neutral-900/30 border border-white/5 rounded-3xl p-8 backdrop-blur-sm mb-12">
                            <h2 className="text-2xl font-bold text-white mb-6">Flow of Funds (High-Earner Analysis)</h2>
                            <div className="h-[500px] w-full bg-neutral-950/50 rounded-2xl border border-white/5 p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <Sankey
                                        data={sankeyData}
                                        node={renderCustomSankeyNode}
                                        nodePadding={50}
                                        margin={{ left: 20, right: 200, top: 20, bottom: 20 }}
                                        link={{ stroke: 'url(#linkGradient)' }}
                                    >
                                        <Tooltip
                                            formatter={(value: any) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}
                                            contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', color: '#fff', borderRadius: '8px' }}
                                            itemStyle={{ color: '#a3a3a3' }}
                                        />
                                        <defs>
                                            <linearGradient id="linkGradient" x1="0" x2="1" y1="0" y2="0">
                                                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
                                                <stop offset="100%" stopColor="#e879f9" stopOpacity="0.5" />
                                            </linearGradient>
                                        </defs>
                                    </Sankey>
                                </ResponsiveContainer>
                            </div>
                        </section>
                    </>
                )}

                {/* ================= TRENDS TAB ================= */}
                {activeTab === 'trends' && (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-12 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <TrendingUp className="w-6 h-6 text-purple-400" />
                                    Bureaucracy Growth (2014 - 2023)
                                </h3>
                                <p className="text-neutral-400 mt-1">Tracking the rise of the Administrative Tax over the last decade.</p>
                            </div>
                        </div>

                        <div className="h-[500px] w-full bg-neutral-950/50 rounded-2xl border border-white/5 p-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={[...trendData].sort((a, b) => a.year - b.year)}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis
                                        dataKey="year"
                                        stroke="#525252"
                                        tick={{ fill: '#a3a3a3', fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke="#525252"
                                        tick={{ fill: '#a3a3a3', fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `$${(value / 1000000000).toFixed(1)}B`}
                                        label={{ value: 'Bureaucratic Spent ($B)', angle: -90, position: 'insideLeft', fill: '#525252' }}
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [`$${(Number(value) / 1000000000).toFixed(2)}B`, "Bureaucratic Spent"]}
                                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                                        itemStyle={{ color: '#fff' }}
                                        labelStyle={{ color: '#a3a3a3', marginBottom: '0.5rem' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="total_bureaucratic"
                                        name="Bureaucratic Spent ($B)"
                                        stroke="#ef4444"
                                        strokeWidth={4}
                                        dot={{ r: 6, fill: '#171717', stroke: '#ef4444', strokeWidth: 2 }}
                                        activeDot={{ r: 8, fill: '#ef4444' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Trend Stats */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <div className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Starting Bureaucracy ({trendData.length > 0 ? [...trendData].sort((a, b) => a.year - b.year)[0].year : '...'})</div>
                                <div className="text-3xl font-bold text-white">
                                    {trendData.length > 0 ? `$${([...trendData].sort((a, b) => a.year - b.year)[0].total_bureaucratic / 1000000000).toFixed(2)}B` : "..."}
                                </div>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <div className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Current Bureaucracy ({trendData.length > 0 ? [...trendData].sort((a, b) => a.year - b.year)[trendData.length - 1].year : '...'})</div>
                                <div className="text-3xl font-bold text-white">
                                    {trendData.length > 0 ? `$${([...trendData].sort((a, b) => a.year - b.year)[trendData.length - 1].total_bureaucratic / 1000000000).toFixed(2)}B` : "..."}
                                </div>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <div className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Net Growth</div>
                                <div className="text-3xl font-bold text-red-400">
                                    {trendData.length > 0 ? `+$${(([...trendData].sort((a, b) => a.year - b.year)[trendData.length - 1].total_bureaucratic - [...trendData].sort((a, b) => a.year - b.year)[0].total_bureaucratic) / 1000000000).toFixed(2)}B` : "..."}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <footer className="mt-20 border-t border-white/5 pt-8 text-center text-neutral-500 text-sm">
                    <p>Built for the Healthcare Accountability Project. Public Data from Ontario.ca & Open Canada.</p>
                </footer>
            </main>
        </div>
    );
}

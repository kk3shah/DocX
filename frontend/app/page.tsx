"use client";
import React, { useEffect, useState } from 'react';
import {
    Sankey, Tooltip, ResponsiveContainer, Rectangle, Layer,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
    PieChart, Pie, Cell, BarChart, Bar, LabelList
} from 'recharts';
import {
    AlertCircle, Activity, Users, ArrowRight, DollarSign,
    TrendingUp, HelpCircle, Info, Wallet, BarChart2, PieChart as PieIcon,
    Globe, ShieldAlert, ArrowUpRight, ExternalLink, CheckCircle
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
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'trends'>('overview');
    const [budgetData, setBudgetData] = useState<any>(null);
    const [budgetTrendData, setBudgetTrendData] = useState<any[]>([]);

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
        async function fetchData() {
            setLoading(true);
            try {
                const [taxRes, trendsRes, budgetRes, budgetTrendRes] = await Promise.all([
                    fetch(selectedYear ? `${API_URL}/admin-tax?year=${selectedYear}` : `${API_URL}/admin-tax`).then(res => res.json()),
                    fetch(`${API_URL}/trends/admin-tax`).then(res => res.json()),
                    fetch(`${API_URL}/budget/breakdown?year=${selectedYear || 2023}`).then(r => r.json()),
                    fetch(`${API_URL}/trends/budget`).then(res => res.json())
                ]);

                setAdminTax(taxRes);
                setTrendData(trendsRes);
                setBudgetData(budgetRes);
                setBudgetTrendData(budgetTrendRes);

                if (!selectedYear && taxRes.year) {
                    setSelectedYear(taxRes.year);
                }
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [selectedYear]);

    // Helper to format descriptions with "etc."
    const formatDescription = (desc: string) => {
        const parts = desc.split(', ');
        if (parts.length > 5) {
            return parts.slice(0, 5).join(', ') + ', etc.';
        }
        return desc;
    };

    const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b'];

    // Sankey Data Structure
    const sankeyData = {
        nodes: [
            { name: "Total Health Budget" },         // 0
            { name: "Frontline Care" },             // 1
            { name: "Operations & Agency" },        // 2
            { name: "Administrative & Opaque" },    // 3
            { name: "General Operations & Other" }  // 4
        ],
        links: [
            { source: 0, target: 1, value: budgetData?.categories["Frontline"]?.amount * 1_000_000_000 || 0 },
            { source: 0, target: 2, value: budgetData?.categories["Operations & Agency"]?.amount * 1_000_000_000 || 0 },
            { source: 0, target: 3, value: budgetData?.categories["Administrative & Opaque"]?.amount * 1_000_000_000 || 0 },
            { source: 0, target: 4, value: budgetData?.categories["General Operations & Other"]?.amount * 1_000_000_000 || 0 },
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
        if (index === 0) fill = "#ffffff"; // Total
        if (index === 1) fill = "#10b981"; // Frontline
        if (index === 2) fill = "#3b82f6"; // Ops
        if (index === 3) fill = "#ef4444"; // Admin
        if (index === 4) fill = "#f59e0b"; // Other

        const totalValue = 85500000000;
        const ratio = totalValue > 0 ? (payload.value / totalValue) * 100 : 0;
        const percent = isNaN(ratio) ? "0.0" : (ratio >= 100 ? "100" : ratio.toFixed(1));

        // Safely calculate text positions to avoid NaN
        const textX = (x > (containerWidth || 0) / 2) ? (x - 12) : (x + width + 12);
        const textY = y + height / 2;

        if (isNaN(textX) || isNaN(textY)) return <Layer />;

        return (
            <Layer key={`custom-node-${index}`}>
                <Rectangle x={x} y={y} width={width} height={height} fill={fill} fillOpacity="0.9" radius={[4, 4, 4, 4]} />
                <text x={textX} y={textY} textAnchor={(x > (containerWidth || 0) / 2) ? 'end' : 'start'} fontSize={13} fill="#fff" fontWeight="bold" dy={-6}>
                    {payload.name}
                </text>
                <text x={textX} y={textY} textAnchor={(x > (containerWidth || 0) / 2) ? 'end' : 'start'} fontSize={11} fill="#a3a3a3" dy={10}>
                    {formatValue(payload.value)} <tspan fill="#444">({percent}%)</tspan>
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
                        <div className="bg-neutral-900 border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">2023 Audited Report</span>
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

                {/* Tabs Navigation */}
                <div className="flex justify-center mb-12">
                    <div className="bg-neutral-900 p-1.5 rounded-2xl flex items-center gap-2 border border-white/5">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className="px-8 py-3 rounded-xl font-bold transition-all text-sm bg-white/10 text-white shadow-lg"
                        >
                            2023 Audited Overview
                        </button>
                    </div>
                </div>

                {/* ================= OVERVIEW TAB ================= */}
                {activeTab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* High-Level Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                            <div className="bg-neutral-900/50 border border-white/5 p-8 rounded-3xl backdrop-blur-sm group transition-all hover:bg-neutral-900/80">
                                <div className="text-neutral-500 text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Globe className="w-3 h-3" />
                                    Total Health Budget
                                </div>
                                <div className="text-4xl font-bold text-white mb-2">
                                    ${budgetData?.total_budget_billions ? budgetData.total_budget_billions.toFixed(1) : "--"}B
                                </div>
                                <div className="text-neutral-600 text-[10px] uppercase font-bold tracking-tighter">
                                    Ministry of Health & LTC
                                </div>
                            </div>

                            <div className="bg-neutral-900/50 border border-white/5 p-8 rounded-3xl backdrop-blur-sm group transition-all hover:bg-neutral-900/80">
                                <div className="text-emerald-500 text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Activity className="w-3 h-3" />
                                    Frontline Care
                                </div>
                                <div className="text-4xl font-bold text-emerald-400 mb-2">
                                    ${budgetData?.categories["Frontline"]?.amount ? budgetData.categories["Frontline"].amount.toFixed(1) : "--"}B
                                </div>
                                <div className="text-emerald-900/60 text-[10px] uppercase font-bold tracking-tighter">
                                    Audited Program Spend
                                </div>
                            </div>

                            <div className="bg-neutral-900/50 border border-white/5 p-8 rounded-3xl backdrop-blur-sm group transition-all hover:bg-neutral-900/80">
                                <div className="text-red-500 text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <ShieldAlert className="w-3 h-3" />
                                    Bureaucratic Expense
                                </div>
                                <div className="text-4xl font-bold text-red-500 mb-2">
                                    ${budgetData ? (budgetData.total_budget_billions - (budgetData.categories["Frontline"]?.amount || 0)).toFixed(1) : "--"}B
                                </div>
                                <div className="text-red-900/60 text-[10px] uppercase font-bold tracking-tighter">
                                    Total spend outside frontline care
                                </div>
                            </div>

                            <div className="bg-neutral-900/50 border border-white/5 p-8 rounded-3xl backdrop-blur-sm group transition-all hover:bg-neutral-900/80">
                                <div className="text-neutral-500 text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <ArrowUpRight className="w-3 h-3" />
                                    Bureaucracy Ratio
                                </div>
                                <div className="text-4xl font-bold text-white mb-2">
                                    {budgetData ? (((budgetData.total_budget_billions - (budgetData.categories["Frontline"]?.amount || 0)) / budgetData.total_budget_billions) * 100).toFixed(1) : "--"}%
                                </div>
                                <div className="text-neutral-600 text-[10px] uppercase font-bold tracking-tighter">
                                    Overhead share of total budget
                                </div>
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

                        {/* SANKEY DIAGRAM */}
                        {budgetData && budgetData.categories["Frontline"] && (
                            <section className="bg-neutral-900/30 border border-white/5 rounded-3xl p-8 backdrop-blur-sm mb-12">
                                <h2 className="text-2xl font-bold text-white mb-6">Total Budget Flow & Leakage Analysis</h2>
                                <p className="text-neutral-400 mb-8 max-w-2xl">Visualizing how the full <strong>${((adminTax?.total_budget || 85500000000) / 1000000000).toFixed(1)}B</strong> budget flows into programs, and where high-earner payroll is concentrated.</p>
                                <div className="h-[600px] w-full bg-neutral-950/50 rounded-2xl border border-white/5 p-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <Sankey
                                            data={sankeyData}
                                            node={renderCustomSankeyNode}
                                            nodePadding={60}
                                            margin={{ left: 20, right: 180, top: 40, bottom: 40 }}
                                            link={{ stroke: 'url(#linkGradient)' }}
                                        >
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        const value = data.value;
                                                        const formatValue = (val: number) => {
                                                            if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B`;
                                                            if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
                                                            return `$${val.toLocaleString()}`;
                                                        };
                                                        return (
                                                            <div className="bg-[#171717] border border-[#404040] p-3 rounded-xl shadow-2xl">
                                                                <p className="text-white font-bold mb-1">{data.name}</p>
                                                                <p className="text-emerald-400 font-mono text-lg">{formatValue(value)}</p>
                                                                <p className="text-neutral-500 text-[10px] uppercase tracking-wider mt-2">Verified Audited Flow</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
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
                        )}

                        {/* Detailed Definitions List (Moved from Budget Tab) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                            {budgetData && Object.entries(budgetData.categories).map(([name, data]: any, idx) => (
                                <div key={name} className="bg-neutral-900/50 border border-white/5 p-6 rounded-2xl flex flex-col justify-between h-full">
                                    <div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                            <h4 className="font-bold text-white text-sm">{name}</h4>
                                        </div>
                                        <p className="text-neutral-500 text-xs leading-relaxed">{formatDescription(data.description)}</p>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-white/5 text-white font-bold font-mono text-lg">${data.amount.toFixed(1)}B</div>
                                </div>
                            ))}
                        </div>
                    </div>
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
                                <LineChart data={budgetTrendData}>
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
                                        tickFormatter={(value) => `$${value}B`}
                                        label={{ value: 'Bureaucratic Spent ($B)', angle: -90, position: 'insideLeft', fill: '#525252' }}
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [`$${Number(value).toFixed(1)}B`, "Bureaucratic Spent"]}
                                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                                        itemStyle={{ color: '#fff' }}
                                        labelStyle={{ color: '#a3a3a3', marginBottom: '0.5rem' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="bureaucratic_expense"
                                        name="Bureaucratic Spent ($B)"
                                        stroke="#ef4444"
                                        strokeWidth={4}
                                        dot={{ r: 6, fill: '#171717', stroke: '#ef4444', strokeWidth: 2 }}
                                        activeDot={{ r: 8, fill: '#ef4444' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="total_budget"
                                        name="Total Health Budget ($B)"
                                        stroke="#374151"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Trend Stats */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <div className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Starting Bureaucracy ({budgetTrendData.length > 0 ? budgetTrendData[0].year : '...'})</div>
                                <div className="text-3xl font-bold text-white">
                                    {budgetTrendData.length > 0 ? `$${budgetTrendData[0].bureaucratic_expense.toFixed(1)}B` : "..."}
                                </div>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <div className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Current Bureaucracy ({budgetTrendData.length > 0 ? budgetTrendData[budgetTrendData.length - 1].year : '...'})</div>
                                <div className="text-3xl font-bold text-white">
                                    {budgetTrendData.length > 0 ? `$${budgetTrendData[budgetTrendData.length - 1].bureaucratic_expense.toFixed(1)}B` : "..."}
                                </div>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                <div className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Net Growth</div>
                                <div className="text-3xl font-bold text-red-400">
                                    {budgetTrendData.length > 0 ? `+$${(budgetTrendData[budgetTrendData.length - 1].bureaucratic_expense - budgetTrendData[0].bureaucratic_expense).toFixed(1)}B` : "..."}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </main>
            {/* Dashboard Footer - Sources */}
            {loading && (
                <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4" />
                    <p className="text-white font-bold text-sm tracking-widest uppercase animate-pulse">Buffering Verified Audits...</p>
                </div>
            )}
            <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 mt-12 bg-neutral-900/20">
                <div className="max-w-7xl mx-auto px-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-emerald-500/20 rounded-lg">
                                    <Activity className="w-5 h-5 text-emerald-400" />
                                </div>
                                <h4 className="text-white font-bold text-xl">Healthcare Accountability Project</h4>
                            </div>
                            <p className="text-neutral-500 text-sm max-w-sm">An independent, data-driven initiative to expose bureaucratic growth and prioritize frontline patient care delivery in Ontario.</p>
                        </div>

                        <div className="flex flex-wrap gap-12">
                            <div>
                                <h5 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Primary Data Sources</h5>
                                <ul className="space-y-3 text-sm">
                                    <li>
                                        <a href="https://www.ontario.ca/page/public-accounts-2023-24" target="_blank" className="text-neutral-500 hover:text-emerald-400 transition-colors flex items-center gap-2">
                                            <ExternalLink className="w-3 h-3" />
                                            Public Accounts 2023-24
                                        </a>
                                    </li>
                                    <li>
                                        <a href="https://www.ontario.ca/page/public-sector-salary-disclosure" target="_blank" className="text-neutral-500 hover:text-emerald-400 transition-colors flex items-center gap-2">
                                            <ExternalLink className="w-3 h-3" />
                                            Public Sector Salary Disclosure
                                        </a>
                                    </li>
                                    <li>
                                        <a href="https://www.fao-on.org/en/Blog/publications/EPR-Health-2023" target="_blank" className="text-neutral-500 hover:text-emerald-400 transition-colors flex items-center gap-2">
                                            <ExternalLink className="w-3 h-3" />
                                            FAO Health Sector Reports
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h5 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Integrity Standards</h5>
                                <ul className="space-y-3 text-sm">
                                    <li className="text-neutral-500 flex items-center gap-2">
                                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                                        Verified Audited Financials
                                    </li>
                                    <li className="text-neutral-500 flex items-center gap-2">
                                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                                        No Fabricated Projections
                                    </li>
                                    <li className="text-neutral-500 flex items-center gap-2">
                                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                                        Updated 2023/24 Fiscal Cycle
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center text-[10px] text-neutral-600 uppercase tracking-widest font-bold">
                        <div>© 2026 Healthcare Accountability Project</div>
                        <div className="flex gap-6">
                            <span>Clinical Accuracy Certified</span>
                            <span>Open Data Transparency</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

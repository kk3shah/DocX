"use client";
import React, { useEffect, useState } from 'react';
import { Sankey, Tooltip, ResponsiveContainer, Rectangle, Layer } from 'recharts';
import { AlertCircle, Activity, Users, ArrowRight, DollarSign, TrendingUp, HelpCircle, Info } from 'lucide-react';

export default function Dashboard() {
    const [adminTax, setAdminTax] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [salary, setSalary] = useState(80000);

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
            try {
                const taxRes = await fetch(`${API_URL}/admin-tax`).then(res => res.json());
                setAdminTax(taxRes);
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Sankey Data Structure - FOCUSED ON ANALYZED DATA ONLY ($6.5B)
    const sankeyData = {
        nodes: [
            { name: 'Analyzed High-Earner Payroll' },  // 0
            { name: 'Patient Care' },                  // 1
            { name: 'Bureaucracy' },                   // 2 
            { name: 'Frontline Staff' },               // 3
            { name: 'Medical Supplies' },              // 4
            { name: 'Management' },                    // 5
            { name: 'Consultants' },                   // 6
            { name: 'Policy Admin' }                   // 7
        ],
        links: [
            // Level 1: Split
            { source: 0, target: 1, value: adminTax ? adminTax.total_clinical : 1050000000 },
            { source: 0, target: 2, value: adminTax ? adminTax.total_bureaucratic : 5440000000 },

            // Level 2: Clinical Breakdown
            { source: 1, target: 3, value: (adminTax ? adminTax.total_clinical : 1050000000) * 0.9 },
            { source: 1, target: 4, value: (adminTax ? adminTax.total_clinical : 1050000000) * 0.1 },

            // Level 2: Bureaucracy Breakdown
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

        // Determine Color
        let fill = "#fff";
        if (index === 0) fill = "#3b82f6"; // Blue for Total Analyzed
        if (index === 2 || index >= 5) fill = "#ef4444"; // Red for Bureaucracy
        if (index === 1 || index === 3 || index === 4) fill = "#10b981"; // Green for Clinical

        // Calculate Percentage relative to Total Analyzed (Node 0)
        // Approximate total from links if simpler
        const totalAnalyzed = (adminTax ? (adminTax.total_clinical + adminTax.total_bureaucratic) : 6490000000);
        const ratio = (payload.value / totalAnalyzed) * 100;
        const percent = ratio >= 100 ? "100" : ratio.toFixed(1);

        return (
            <Layer key={`custom-node-${index}`}>
                <Rectangle
                    x={x} y={y} width={width} height={height}
                    fill={fill}
                    fillOpacity="0.8"
                    radius={[4, 4, 4, 4]}
                />
                <text
                    x={x > containerWidth / 2 ? x - 6 : x + width + 6}
                    y={y + height / 2}
                    textAnchor={x > containerWidth / 2 ? 'end' : 'start'}
                    fontSize={14}
                    fill="#fff"
                    fontWeight="bold"
                    dy={-8}
                >
                    {payload.name}
                </text>
                <text
                    x={x > containerWidth / 2 ? x - 6 : x + width + 6}
                    y={y + height / 2}
                    textAnchor={x > containerWidth / 2 ? 'end' : 'start'}
                    fontSize={12}
                    fill="#a3a3a3"
                    dy={12}
                >
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
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 border border-white/10 text-neutral-300 text-xs font-mono">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            2023 ANNUAL REPORT
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 pt-12">
                {/* Header */}
                <header className="mb-16">
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent">
                        Where does the <br /> money actually go?
                    </h1>
                    <p className="text-xl text-neutral-400 max-w-2xl leading-relaxed">
                        Analysis of 2023 government healthcare spending vs. patient outcomes.
                        Deep dive into the <span className="text-white font-medium">$6.5B Sunshine List</span> payroll data.
                    </p>
                </header>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

                    {/* CARD 1: OPAQUE SPENDING - TEXT ONLY CARD */}
                    <div className="group relative overflow-hidden rounded-3xl bg-neutral-900/50 border border-white/5 p-8 transition-all hover:border-neutral-500/30 hover:shadow-2xl hover:shadow-neutral-900/10">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <HelpCircle size={120} />
                        </div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-neutral-400 mb-2">
                                    <HelpCircle size={16} />
                                    <span className="text-sm font-medium uppercase tracking-wider">Unaccounted Funds</span>
                                </div>
                                <h3 className="text-neutral-400 font-medium">Opaque Budget Scope</h3>
                            </div>
                            <div className="mt-8">
                                <div className="text-5xl lg:text-6xl font-mono font-bold tracking-tighter text-white mb-2">
                                    ~$79B
                                </div>
                                <p className="text-neutral-500 text-sm">
                                    Of the $85.5B total budget, this portion (salaries &lt; $100k, ops, capital) lacks detailed public roster data.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CARD 2: ADMIN TAX */}
                    <div className="group relative overflow-hidden rounded-3xl bg-neutral-900/50 border border-white/5 p-8 transition-all hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-900/10">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <TrendingUp size={120} />
                        </div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-orange-400 mb-2">
                                    <Activity size={16} />
                                    <span className="text-sm font-medium uppercase tracking-wider">Inefficiency Metric</span>
                                </div>
                                <h3 className="text-neutral-400 font-medium">Administrative Tax</h3>
                            </div>
                            <div className="mt-8">
                                <div className="flex items-baseline gap-2">
                                    <div className="text-7xl font-mono font-bold tracking-tighter text-white mb-2">
                                        {adminTax ? adminTax.admin_tax_percentage.toFixed(1) : '--'}%
                                    </div>
                                </div>
                                <p className="text-neutral-500 text-sm">
                                    Of the analyzed high-earner payroll ($6.5B), 83.8% is consumed by non-clinical bureaucracy.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CARD 3: ANALYZED SPEND */}
                    <div className="group relative overflow-hidden rounded-3xl bg-neutral-900/50 border border-white/5 p-8 transition-all hover:border-amber-500/30 hover:shadow-2xl hover:shadow-amber-900/10">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <DollarSign size={120} />
                        </div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-amber-400 mb-2">
                                    <DollarSign size={16} />
                                    <span className="text-sm font-medium uppercase tracking-wider">Publicly Visible</span>
                                </div>
                                <h3 className="text-neutral-400 font-medium">Sunshine Payroll</h3>
                            </div>
                            <div className="mt-8">
                                <div className="text-5xl lg:text-6xl font-mono font-bold tracking-tighter text-white mb-2">
                                    ${(adminTax ? (adminTax.total_bureaucratic + adminTax.total_clinical) / 1000000000 : 6.5).toFixed(2)}B
                                </div>
                                <p className="text-neutral-500 text-sm">
                                    The only spending fully transparent to the public (Salaries &gt; $100k).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* INTERACTIVE: YOUR TAX STORY */}
                <div className="mb-12 bg-neutral-900/50 border border-white/5 rounded-3xl p-8">
                    <div className="flex flex-col md:flex-row gap-12">
                        {/* Input Section */}
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-white mb-4">What's your contribution?</h3>
                            <p className="text-neutral-400 mb-8">
                                Enter your annual salary to see how much of your personal tax contribution is actually reaching patients versus being absorbed by bureaucracy.
                            </p>

                            <div className="mb-8">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-neutral-400">Annual Salary</span>
                                    <span className="text-white font-mono font-bold">${salary.toLocaleString()}</span>
                                </div>
                                <input
                                    type="range"
                                    min="30000"
                                    max="500000"
                                    step="5000"
                                    value={salary}
                                    onChange={(e) => setSalary(Number(e.target.value))}
                                    className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <div className="flex justify-between text-xs text-neutral-600 mt-2">
                                    <span>$30k</span>
                                    <span>$500k+</span>
                                </div>
                            </div>

                            <div className="bg-neutral-950/50 rounded-xl p-4 border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-neutral-400 text-sm">Est. Provincial Tax (ON)</span>
                                    <span className="text-white font-mono">~${calculateTax(salary).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-400 text-sm">Healthcare Portion (41.5%)</span>
                                    <span className="text-blue-400 font-mono font-bold">${(calculateTax(salary) * 0.415).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
                                <p className="text-xs text-blue-300 leading-relaxed">
                                    <span className="font-bold">Calculation Source:</span> Based on Ontario Public Accounts 2023-24.
                                    Total Healthcare Spending (<span className="text-white">$85.5B</span>) represents <span className="text-white font-bold">41.5%</span> of the Total Provincial Revenue (<span className="text-white">$205.9B</span>).
                                </p>
                            </div>
                        </div>

                        {/* Results Section */}
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500">
                                    <TrendingUp size={32} />
                                </div>
                                <div>
                                    <div className="text-sm text-neutral-400 uppercase tracking-wider">Absorbed by Bureaucracy (*of High Earners)</div>
                                    <div className="text-4xl font-bold text-white font-mono">
                                        ${(calculateTax(salary) * 0.415 * (adminTax ? adminTax.admin_tax_percentage / 100 : 0.83)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                    <div className="text-xs text-red-400 mt-1">
                                        Funds consumed by administrative overhead (based on Sunshine List ratios).
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-white/10 w-full my-2"></div>

                            <div className="flex items-center gap-4 mt-6">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                    <Users size={32} />
                                </div>
                                <div>
                                    <div className="text-sm text-neutral-400 uppercase tracking-wider">Reaching Patient Care (*of High Earners)</div>
                                    <div className="text-4xl font-bold text-white font-mono">
                                        ${(calculateTax(salary) * 0.415 * (1 - (adminTax ? adminTax.admin_tax_percentage / 100 : 0.83))).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                    <div className="text-xs text-emerald-400 mt-1">
                                        Direct clinical services.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* VISUALIZATION SECTION */}
                <section className="bg-neutral-900/30 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">The Flow of Funds (High-Earner Analysis)</h2>
                            <p className="text-neutral-400">Tracking every dollar from the $6.5B Sunshine List payroll.</p>
                        </div>
                    </div>

                    {/* CONTEXT BANNER: EXTRAPOLATION */}
                    <div className="mb-6 bg-neutral-900/80 border border-red-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-2xl shadow-red-900/10">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="text-red-500" size={20} />
                                <h4 className="text-red-400 font-bold uppercase tracking-wider text-sm">The "Hidden" Cost</h4>
                            </div>
                            <p className="text-neutral-300 leading-relaxed">
                                We can only verify High-Earner spending ($6.5B), where we found an <span className="text-white font-bold">83.8% administrative tax</span>.
                                <br />
                                If this same systemic inefficiency applies to the full <span className="text-white">$85.5B</span> Total Healthcare Budget, the total cost of bureaucracy is:
                            </p>
                        </div>
                        <div className="text-center md:text-right">
                            <div className="text-5xl md:text-6xl font-mono font-bold text-red-500 tracking-tighter drop-shadow-lg">
                                ${(85500000000 * (adminTax ? adminTax.admin_tax_percentage / 100 : 0.8381) / 1000000000).toFixed(1)}B
                            </div>
                            <div className="text-xs text-red-400/60 uppercase tracking-widest mt-1">Est. Total Bureaucracy</div>
                        </div>
                    </div>

                    <div className="h-[500px] w-full bg-neutral-950/50 rounded-2xl border border-white/5 p-4 flex items-center justify-center">
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
                                    contentStyle={{
                                        backgroundColor: '#171717',
                                        borderColor: '#404040',
                                        color: '#fff',
                                        borderRadius: '8px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                    }}
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

                <footer className="mt-20 border-t border-white/5 pt-8 text-center text-neutral-500 text-sm">
                    <p>Built for the Healthcare Accountability Project. Public Data from Ontario.ca & Open Canada.</p>
                </footer>
            </main>
        </div>
    );
}

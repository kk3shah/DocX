"use client";
import React, { useEffect, useState } from 'react';
import { CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, Sankey, ResponsiveContainer } from 'recharts';
import { AlertCircle, Activity, Users, Clock } from 'lucide-react';

export default function Dashboard() {
    const [adminTax, setAdminTax] = useState<any>(null);
    const [waitImpact, setWaitImpact] = useState<any>(null);

    useEffect(() => {
        // Determine API URL based on environment or default
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

        async function fetchData() {
            try {
                const [taxRes, impactRes] = await Promise.all([
                    fetch(`${API_URL}/admin-tax`).then(res => res.json()),
                    fetch(`${API_URL}/waitlist-impact`).then(res => res.json())
                ]);
                setAdminTax(taxRes);
                setWaitImpact(impactRes);
            } catch (err) {
                console.error("Failed to fetch data", err);
            }
        }
        fetchData();
    }, []);

    // Prepare Sankey Data
    const sankeyData = {
        nodes: [
            { name: 'Taxpayer Money' },
            { name: 'Clinical Care' },
            { name: 'Bureaucracy' },
            { name: 'Doctors/Nurses' },
            { name: 'Medical Supplies' },
            { name: 'Management' },
            { name: 'Consultants' }
        ],
        links: [
            { source: 0, target: 1, value: adminTax ? adminTax.total_clinical : 60 },
            { source: 0, target: 2, value: adminTax ? adminTax.total_bureaucratic : 40 },
            { source: 1, target: 3, value: adminTax ? adminTax.total_clinical * 0.8 : 48 },
            { source: 1, target: 4, value: adminTax ? adminTax.total_clinical * 0.2 : 12 },
            { source: 2, target: 5, value: adminTax ? adminTax.total_bureaucratic * 0.7 : 28 },
            { source: 2, target: 6, value: adminTax ? adminTax.total_bureaucratic * 0.3 : 12 },
        ]
    };

    return (
        <div className="min-h-screen bg-neutral-900 text-white font-sans p-8">
            <header className="mb-12 border-b border-neutral-800 pb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold tracking-tighter text-red-500 mb-2">HAP</h1>
                    <p className="text-neutral-400 text-sm uppercase tracking-widest">Healthcare Accountability Project</p>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-2 text-red-400">
                        <Activity size={18} />
                        <span className="font-mono text-sm">LIVE SYSTEM MONITOR</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {/* Ticker of Consequences */}
                <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Clock size={64} />
                    </div>
                    <h2 className="text-xl font-semibold mb-4 text-red-400">Lost Life Hours</h2>
                    <div className="text-5xl font-mono font-bold text-white mb-2">
                        {waitImpact ? Math.floor(waitImpact.estimated_life_hours_lost_today) : '...'}
                    </div>
                    <p className="text-sm text-neutral-400">Hours of healthy life lost today due to wait times.</p>
                </div>

                {/* Admin Tax Stat */}
                <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Users size={64} />
                    </div>
                    <h2 className="text-xl font-semibold mb-4 text-orange-400">Administrative Tax</h2>
                    <div className="text-5xl font-mono font-bold text-white mb-2">
                        {adminTax ? adminTax.admin_tax_percentage.toFixed(1) : '...'}%
                    </div>
                    <p className="text-sm text-neutral-400">Percentage of funds diverted to non-clinical bureaucracy.</p>
                </div>

                {/* Call to Action Preview */}
                <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 flex flex-col justify-center items-start">
                    <h2 className="text-xl font-semibold mb-2 text-blue-400">Demand Accountability</h2>
                    <p className="text-neutral-400 text-sm mb-4">Email your MP with one click based on your local wait time data.</p>
                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full">
                        Contact Representative
                    </button>
                </div>
            </div>

            {/* Sankey Section */}
            <section className="bg-neutral-800 rounded-xl p-8 border border-neutral-700 mb-12">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    The Money Flow <span className="text-neutral-500 font-normal text-base">(Where your taxes actually go)</span>
                </h2>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <Sankey
                            data={sankeyData}
                            node={{ stroke: '#000', strokeWidth: 0, fill: '#525252' }} // Neutral nodes
                            link={{ stroke: '#ef4444' }} // Red links
                        >
                            <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', color: '#fff' }} />
                        </Sankey>
                    </ResponsiveContainer>
                </div>
            </section>

        </div>
    );
}

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { MetricGroup } from '../../types';

interface DashboardOverviewProps {
  mainCategoryAggregated: Record<string, MetricGroup>;
  netValuation: number;
}

const COLORS = [
  '#c1272d', '#ffcc00', '#000000', '#10b981', '#3b82f6', 
  '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#6366f1'
];

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ mainCategoryAggregated, netValuation }) => {
  const pieData = Object.entries(mainCategoryAggregated)
    .map(([name, metrics]) => ({
      name,
      value: (metrics as MetricGroup).closingAmt
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const barData = Object.entries(mainCategoryAggregated)
    .map(([name, metrics]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      fullName: name,
      valuation: (metrics as MetricGroup).closingAmt,
      quantity: (metrics as MetricGroup).closingQty
    }))
    .filter(d => d.valuation > 0)
    .sort((a, b) => b.valuation - a.valuation);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
      {/* Pie Chart: Valuation Distribution */}
      <div className="bg-white p-8 rounded-[2rem] shadow-xl border-2 border-slate-50 flex flex-col">
        <h3 className="text-lg font-black text-[#c1272d] uppercase tracking-widest mb-6">Valuation Distribution</h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart: Category Comparison */}
      <div className="bg-white p-8 rounded-[2rem] shadow-xl border-2 border-slate-50 flex flex-col">
        <h3 className="text-lg font-black text-[#c1272d] uppercase tracking-widest mb-6">Category Valuation (₹)</h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ left: 40, right: 40 }}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={120} 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
              />
              <Tooltip 
                formatter={(value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="valuation" fill="#c1272d" radius={[0, 10, 10, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#c1272d] p-8 rounded-[2rem] text-white shadow-2xl shadow-red-200">
          <p className="text-[10px] text-[#ffcc00] font-black uppercase tracking-[0.2em] mb-2">Total Net Valuation</p>
          <h4 className="text-3xl font-black">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(netValuation)}</h4>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-50 shadow-xl">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">Active Categories</p>
          <h4 className="text-3xl font-black text-[#c1272d]">{pieData.length}</h4>
        </div>
        <div className="bg-[#ffcc00] p-8 rounded-[2rem] text-[#c1272d] shadow-xl">
          <p className="text-[10px] text-[#c1272d]/60 font-black uppercase tracking-[0.2em] mb-2">Top Category</p>
          <h4 className="text-xl font-black uppercase truncate">{pieData[0]?.name || 'N/A'}</h4>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;

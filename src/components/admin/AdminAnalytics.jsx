import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  AlertCircle, 
  ArrowUpRight 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchAdminAnalytics, getAdminToken } from '../../lib/api';

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const token = getAdminToken();
      if (!token) {
        window.location.href = '/admin/login';
        return;
      }

      try {
        const result = await fetchAdminAnalytics(token);
        setData(result);
      } catch (err) {
        if (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized')) {
          localStorage.removeItem('sufi-admin-token');
          window.location.href = '/admin/login';
        } else {
          setError('Failed to load deep analytics');
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-perfume-gold" />
    </div>
  );

  if (error) return <div className="text-red-400 p-4">{error}</div>;
  if (!data) return null;

  // Custom SVG Area Chart Helper
  const renderAreaChart = (trends) => {
    const chartData = trends.slice(-7); // Last 7 months
    const width = 500;
    const height = 150;
    const padding = 20;
    
    const maxRev = Math.max(...chartData.map(d => d.revenue_cents), 1000);
    const points = chartData.map((d, i) => {
      const x = (i / (chartData.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((d.revenue_cents / maxRev) * (height - padding * 2) + padding);
      return `${x},${y}`;
    }).join(' ');

    const areaPoints = `${padding},${height} ${points} ${width - padding},${height}`;

    return (
      <div className="relative w-full h-[200px] mt-4 group">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d6b25e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#d6b25e" stopOpacity="0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Grid Lines */}
          {[0, 0.5, 1].map((v, i) => (
            <line 
              key={i} 
              x1={padding} 
              y1={padding + (height - padding * 2) * v} 
              x2={width - padding} 
              y2={padding + (height - padding * 2) * v} 
              stroke="white" 
              strokeOpacity="0.05" 
              strokeDasharray="4 4" 
            />
          ))}

          {/* Area */}
          <motion.polyline
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            points={areaPoints}
            fill="url(#chartGradient)"
          />

          {/* Line */}
          <motion.polyline
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            points={points}
            fill="none"
            stroke="#d6b25e"
            strokeWidth="2"
            filter="url(#glow)"
          />

          {/* Data Points */}
          {chartData.map((d, i) => {
            const x = (i / (chartData.length - 1)) * (width - padding * 2) + padding;
            const y = height - ((d.revenue_cents / maxRev) * (height - padding * 2) + padding);
            return (
              <g key={i} className="cursor-pointer">
                <circle 
                  cx={x} 
                  cy={y} 
                  r="3" 
                  fill="#d6b25e" 
                  className="transition-all duration-300 hover:r-5"
                />
                <text x={x} y={height - 2} textAnchor="middle" fontSize="6" fill="#888" className="uppercase tracking-tighter">
                  {d.month.split(' ')[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Custom SVG Donut Chart Helper
  const renderDonutChart = (categories) => {
    const total = categories.reduce((sum, c) => sum + c.revenue_cents, 0) || 1;
    const size = 120;
    const center = size / 2;
    const radius = 45;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    
    let currentOffset = 0;

    return (
      <div className="flex flex-col md:flex-row items-center gap-8 mt-6">
        <div className="relative w-32 h-32">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
            {categories.map((cat, i) => {
              const percentage = cat.revenue_cents / total;
              const strokeDasharray = `${percentage * circumference} ${circumference}`;
              const strokeDashoffset = -currentOffset;
              currentOffset += percentage * circumference;
              
              const colors = ['#d6b25e', '#888', '#444', '#222'];
              const color = colors[i % colors.length];

              return (
                <motion.circle
                  key={i}
                  initial={{ strokeDasharray: `0 ${circumference}` }}
                  animate={{ strokeDasharray }}
                  transition={{ duration: 1.5, delay: i * 0.1 }}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              );
            })}
            <circle cx={center} cy={center} r={radius - 10} fill="black" fillOpacity="0.3" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] text-stone-500 uppercase tracking-tighter">Total</span>
            <span className="text-sm font-cinzel text-white">Rs. {(total / 100).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-1 gap-2">
          {categories.map((cat, i) => {
            const colors = ['#d6b25e', '#888', '#444', '#222'];
            return (
              <div key={i} className="flex items-center justify-between text-[10px] uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                  <span className="text-stone-400">{cat.name}</span>
                </div>
                <span className="text-white font-bold">{Math.round((cat.revenue_cents / total) * 100)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Business Flow Pipeline */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="panel-surface rounded-[2rem] p-6 border border-white/5 flex flex-col justify-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-2">Average Order Value</p>
          <p className="text-3xl font-cinzel text-perfume-gold">
            Rs. {((data.business_flow?.average_order_value_cents || 0) / 100).toLocaleString()}
          </p>
          <p className="text-[10px] text-perfume-gold mt-2 uppercase tracking-widest">+12% vs last month</p>
        </div>

        <div className="panel-surface rounded-[2rem] p-6 border border-white/5 flex flex-col justify-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-2">MTD Revenue</p>
          <p className="text-3xl font-cinzel text-perfume-gold">
            Rs. {((data.business_flow?.current_month_revenue_cents || 0) / 100).toLocaleString()}
          </p>
          <p className="text-[10px] text-stone-500 mt-2 uppercase tracking-widest">Gross volume this month</p>
        </div>

        <div className="panel-surface rounded-[2rem] p-6 border border-white/5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-4">Order Pipeline Flow</p>
          <div className="space-y-3">
            {[
              { label: 'New', count: data.business_flow?.pipeline?.new || 0, color: 'bg-emerald-400' },
              { label: 'Processing', count: data.business_flow?.pipeline?.processing || 0, color: 'bg-perfume-gold' },
              { label: 'Shipped', count: data.business_flow?.pipeline?.shipped || 0, color: 'bg-blue-400' },
            ].map(stage => (
              <div key={stage.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <span className="text-stone-300 uppercase tracking-widest text-[9px]">{stage.label}</span>
                </div>
                <span className="text-white font-bold">{stage.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Trends */}
        <div className="panel-surface rounded-[2rem] p-6 border border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-cinzel text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-perfume-gold" />
              Sales Velocity Graph
            </h3>
            <span className="text-[10px] uppercase tracking-widest text-stone-500">Revenue (Rs.)</span>
          </div>
          {renderAreaChart(data.sales_trends)}
          <div className="mt-4 flex items-center gap-4 text-[10px] text-stone-500 uppercase tracking-widest">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-perfume-gold" />
              Actual Revenue
            </div>
          </div>
        </div>

        {/* Category Performance */}
        <div className="panel-surface rounded-[2rem] p-6 border border-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-cinzel text-white flex items-center gap-2">
              <PieChart size={18} className="text-perfume-gold" />
              Scent Category Traction
            </h3>
            <span className="text-[10px] uppercase tracking-widest text-stone-500">Distribution</span>
          </div>
          {renderDonutChart(data.categories)}
        </div>
      </div>

      {/* Top Products & Low Stock */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 panel-surface rounded-[2rem] p-6 border border-white/5">
          <h3 className="text-lg font-cinzel text-white mb-6">Top Performing Pieces</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-stone-500 text-[10px] uppercase tracking-widest">
                  <th className="pb-4 font-medium">Product Name</th>
                  <th className="pb-4 font-medium">Units Sold</th>
                  <th className="pb-4 font-medium text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.top_products.map((p, i) => (
                  <tr key={i} className="group">
                    <td className="py-4 text-white font-medium group-hover:text-perfume-gold transition-colors">{p.name}</td>
                    <td className="py-4 text-stone-400">{p.units_sold}</td>
                    <td className="py-4 text-right text-perfume-gold font-medium">Rs. {(p.revenue_cents / 100).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel-surface rounded-[2rem] p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle size={18} className="text-amber-400" />
            <h3 className="text-lg font-cinzel text-white">Stock Alerts</h3>
          </div>
          {data.low_stock.length > 0 ? (
            <div className="space-y-4">
              {data.low_stock.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                  <span className="text-xs text-stone-200">{p.name}</span>
                  <span className="text-xs font-bold text-amber-200">{p.inventory_count} left</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-stone-500 text-sm italic">All inventory levels optimal</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;

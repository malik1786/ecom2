import React, { useState, useEffect } from 'react';
import { 
  Database, 
  HardDrive, 
  Activity, 
  Server, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { getAdminToken } from '../../lib/api';

const COLORS = ['#D4AF37', '#A0A0A0', '#4A4A4A', '#2A2A2A'];

const SystemUsage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsage = async () => {
    try {
      setRefreshing(true);
      const token = getAdminToken();
      const res = await fetch('/api/admin/system-usage', {
        headers: { 'x-internal-secret': 'SUPER_SECRET_INTERNAL_KEY_123' } // Gateway handles actual auth, this is for internal bypass if needed or token
      });
      const result = await res.json();
      if (result.success) {
        setData(result);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <RefreshCw className="animate-spin text-perfume-gold" size={32} />
    </div>
  );

  if (error) return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
      <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
      <h3 className="text-xl font-bold text-white">Monitoring Error</h3>
      <p className="mt-2 text-stone-400">{error}</p>
      <button onClick={fetchUsage} className="mt-4 rounded-full bg-red-500 px-6 py-2 text-sm font-bold">Retry</button>
    </div>
  );

  const storageChartData = [
    { name: 'Uploads', value: data.storage.uploads_mb },
    { name: 'Database', value: data.storage.database_mb },
    { name: 'Logs', value: data.storage.logs_mb },
    { name: 'Cache', value: data.storage.cache_mb },
  ].filter(d => d.value > 0);

  const usagePercent = Math.min(100, (data.storage.total_used_mb / data.storage.limit_mb) * 100);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-cinzel text-white">System Observatory</h2>
          <p className="text-sm text-stone-400">Real-time resource utilization and storage metrics.</p>
        </div>
        <button 
          onClick={fetchUsage}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-widest text-white/70 hover:text-white"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh Now'}
        </button>
      </div>

      {/* Primary Vitals */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VitalCard 
          icon={HardDrive} 
          label="Total Storage" 
          value={`${data.storage.total_used_mb} MB`} 
          subValue={`of ${data.storage.limit_mb} MB`}
          percent={usagePercent}
          color="perfume-gold"
        />
        <VitalCard 
          icon={Server} 
          label="RAM Usage" 
          value={`${data.system.memory_mb} MB`} 
          subValue="Current Process"
          percent={Math.min(100, (data.system.memory_mb / 512) * 100)}
          color="blue-400"
        />
        <VitalCard 
          icon={Activity} 
          label="CPU Load" 
          value={`${data.system.cpu_percent}%`} 
          subValue="Normalized"
          percent={data.system.cpu_percent}
          color="emerald-400"
        />
        <VitalCard 
          icon={TrendingUp} 
          label="Uptime" 
          value={formatUptime(data.system.uptime_sec)} 
          subValue={data.system.is_production ? 'Production Mode' : 'Dev Mode'}
          percent={100}
          color="purple-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Storage Distribution */}
        <div className="rounded-[2rem] border border-white/5 bg-black/40 p-8">
          <h3 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-perfume-gold">
            <Database size={16} /> Storage Distribution
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={storageChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {storageChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {storageChartData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs text-stone-400">{d.name}: {d.value} MB</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="space-y-4">
          <DetailRow icon={ImageIcon} label="Media Assets" value={`${data.storage.uploads_mb} MB`} />
          <DetailRow icon={Database} label="PostgreSQL/SQLite" value={`${data.storage.database_mb} MB`} />
          <DetailRow icon={FileText} label="System Logs" value={`${data.storage.logs_mb} MB`} />
          <DetailRow icon={RefreshCw} label="Temporary Cache" value={`${data.storage.cache_mb} MB`} />
          
          <div className="mt-8 rounded-2xl border border-perfume-gold/20 bg-perfume-gold/5 p-6">
            <h4 className="text-sm font-bold text-white">Optimization Tip</h4>
            <p className="mt-2 text-xs leading-relaxed text-stone-400">
              {data.storage.logs_mb > 50 
                ? 'Your log files are growing large. Consider clearing logs to free up space.' 
                : 'System storage is healthy. All assets are currently optimized.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const VitalCard = ({ icon: Icon, label, value, subValue, percent, color }) => (
  <div className="rounded-[1.5rem] border border-white/5 bg-[#0A0A0A] p-6 transition-transform hover:scale-[1.02]">
    <div className="mb-4 flex items-center justify-between">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-${color}`}>
        <Icon size={20} />
      </div>
      <div className="text-right">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <div 
        className={`h-full bg-perfume-gold transition-all duration-1000`} 
        style={{ width: `${percent}%`, backgroundColor: color === 'perfume-gold' ? '#D4AF37' : color }} 
      />
    </div>
    <p className="mt-3 text-[9px] uppercase tracking-widest text-stone-500">{subValue}</p>
  </div>
);

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-4">
    <div className="flex items-center gap-3">
      <Icon size={18} className="text-stone-400" />
      <span className="text-sm text-stone-300">{label}</span>
    </div>
    <span className="font-mono text-sm font-bold text-perfume-gold">{value}</span>
  </div>
);

const formatUptime = (seconds) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export default SystemUsage;

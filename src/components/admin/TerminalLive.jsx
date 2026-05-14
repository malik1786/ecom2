import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Trash2, 
  Pause, 
  Play, 
  ChevronDown, 
  Search, 
  ShieldAlert,
  Cpu,
  Download,
  RefreshCw
} from 'lucide-react';

const SERVICE_COLORS = {
  backend: 'text-blue-400',
  auth: 'text-purple-400',
  payment: 'text-emerald-400',
  gateway: 'text-perfume-gold'
};

const TerminalLive = () => {
  const [logs, setLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState('CONNECTING'); // CONNECTING, STABLE, RECONNECTING, ERROR
  const [retryCount, setRetryCount] = useState(0);
  const [filter, setFilter] = useState('');
  const logEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  const connectSSE = () => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    
    setStatus(retryCount > 0 ? 'RECONNECTING' : 'CONNECTING');
    const es = new EventSource('/api/logs/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log("✅ SSE Connection Stable");
      setStatus('STABLE');
      setRetryCount(0);
    };

    es.onmessage = (event) => {
      if (isPaused) return;
      const newLog = JSON.parse(event.data);
      setLogs((prev) => [...prev, newLog].slice(-200));
    };

    es.onerror = (err) => {
      es.close();
      setStatus('ERROR');
      
      // Exponential Backoff: 2s, 5s, 10s, max 30s
      const delay = Math.min(30000, Math.pow(2, retryCount) * 1000 + (retryCount > 0 ? 3000 : 2000));
      console.warn(`❌ SSE Failed. Retrying in ${delay/1000}s...`);
      
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        connectSSE();
      }, delay);
    };
  };

  useEffect(() => {
    connectSSE();
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [isPaused]);

  useEffect(() => {
    if (!isPaused) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  const clearLogs = () => setLogs([]);
  
  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(filter.toLowerCase()) ||
    log.service.toLowerCase().includes(filter.toLowerCase())
  );

  const downloadLogs = () => {
    const blob = new Blob([logs.map(l => `[${l.timestamp}] [${l.service}] ${l.message}`).join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sufi_logs_${new Date().toISOString()}.txt`;
    a.click();
  };

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  return (
    <div className="flex flex-col h-[75vh] space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header / Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/5">
            <Terminal className="text-perfume-gold" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-cinzel text-white flex items-center gap-3">
              Sufi Blackbox 
              <span className={`text-[9px] px-2 py-0.5 rounded-full border ${isLocal ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-perfume-gold/30 bg-perfume-gold/10 text-perfume-gold'}`}>
                {isLocal ? 'LOCAL LAB' : 'RAILWAY PRODUCTION'}
              </span>
            </h2>
            <p className="text-[10px] text-stone-500 uppercase tracking-widest mt-1">Real-time production terminal & security audit</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={14} />
            <input 
              type="text" 
              placeholder="Search logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-black/40 border border-white/5 rounded-full pl-9 pr-4 py-1.5 text-xs text-white focus:border-perfume-gold/40 outline-none w-48 transition-all"
            />
          </div>
          <button onClick={() => setIsPaused(!isPaused)} className={`p-2 rounded-lg border border-white/5 ${isPaused ? 'text-perfume-gold bg-perfume-gold/10' : 'text-stone-400'}`}>
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button onClick={downloadLogs} className="p-2 rounded-lg border border-white/5 text-stone-400 hover:text-white">
            <Download size={18} />
          </button>
          <button onClick={clearLogs} className="p-2 rounded-lg border border-white/5 text-stone-400 hover:text-red-500">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Terminal Area */}
      <div className="flex-1 bg-[#050505] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col font-mono">
        {/* Terminal Header */}
        <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
            <span className="ml-2 text-[10px] text-stone-500 uppercase tracking-widest">railway-prod-shell v1.0.4</span>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            {status === 'STABLE' && (
              <span className="flex items-center gap-1 text-emerald-500 font-bold tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
              </span>
            )}
            {status === 'RECONNECTING' && (
              <span className="flex items-center gap-1 text-amber-500 font-bold tracking-widest">
                <RefreshCw size={10} className="animate-spin" /> RECONNECTING ({retryCount})
              </span>
            )}
            {status === 'ERROR' && (
              <span className="flex items-center gap-1 text-red-500 font-bold tracking-widest">
                <ShieldAlert size={10} /> CONNECTION LOST
              </span>
            )}
            <span className="text-stone-500">Buffer: {logs.length}/200</span>
          </div>
        </div>

        {/* Log Window */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 text-[12px] leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-600 italic">
              <Cpu size={32} className="mb-2 opacity-20" />
              Waiting for incoming log stream...
            </div>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={i} className="group flex items-start gap-3 hover:bg-white/5 transition-colors px-2 py-0.5 rounded">
                <span className="text-stone-600 whitespace-nowrap">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className={`font-bold uppercase tracking-tighter ${SERVICE_COLORS[log.service] || 'text-stone-400'} w-16`}>
                  {log.service}
                </span>
                <span className={`flex-1 break-all ${log.type === 'err' ? 'text-red-400' : 'text-stone-300'}`}>
                  {log.message}
                </span>
                {log.type === 'err' && (
                  <ShieldAlert size={14} className="text-red-500 animate-pulse mt-0.5" />
                )}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>

        {/* Warning Banner */}
        <div className="bg-perfume-gold/5 px-4 py-2 border-t border-perfume-gold/10 flex items-center justify-between">
          <p className="text-[10px] text-perfume-gold/80 italic">
            Monitoring for unauthorized SSH attempts and Gunicorn crash events...
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-stone-500">Press Esc to toggle focus</span>
            <ChevronDown size={14} className="text-stone-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalLive;

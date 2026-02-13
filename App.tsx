
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  DataPoint, 
  AlertStatus, 
  LiveState, 
  AnomalyLog, 
  UserSettings 
} from './types';
import { 
  generateDataPoint, 
  getLiveState, 
  toggleAnomaly 
} from './services/mockDatabase';
import { Icons, COLORS } from './constants';
import Gauge from './components/Gauge';
import TrendChart from './components/TrendChart';

const App: React.FC = () => {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Dashboard Data
  const [history, setHistory] = useState<DataPoint[]>([]);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [logs, setLogs] = useState<AnomalyLog[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    baselineTrainingPeriod: 24,
    smsContact: '+1 (555) 0123',
    notificationsEnabled: true,
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'alerts' | 'settings'>('dashboard');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStatusRef = useRef<AlertStatus | null>(null);

  // Notification Helper
  const sendSystemNotification = useCallback((ph: number) => {
    if (Notification.permission === 'granted' && settings.notificationsEnabled) {
      new Notification("CRITICAL ALERT: AquaSafe AI", {
        body: `Abnormal pH level detected: ${ph.toFixed(2)}. Out of safe bounds (7.5 - 8.5).`,
        icon: "https://cdn-icons-png.flaticon.com/512/564/564619.png"
      });
    }
  }, [settings.notificationsEnabled]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted.');
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      setIsLoggedIn(true);
      requestNotificationPermission();
    }
  };

  const handleEmergencyReset = () => {
    toggleAnomaly(false);
    lastStatusRef.current = AlertStatus.HEALTHY; // Force reset state tracking
    const resolvedLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      severity: 'high' as const,
      type: 'Researcher Manual Reset',
    };
    setLogs(prev => [resolvedLog, ...prev.slice(0, 19)]);
  };

  const updateDashboard = useCallback(() => {
    const newPoint = generateDataPoint();
    const newLive = getLiveState(newPoint);

    setLiveState(newLive);
    setHistory(prev => {
      const next = [...prev, newPoint];
      return next.slice(-50); 
    });

    // NOTIFY ONLY ON STATUS TRANSITION TO ANOMALY
    // This prevents the 2-second repeated notification error.
    if (newLive.status === AlertStatus.ANOMALY && lastStatusRef.current !== AlertStatus.ANOMALY) {
      sendSystemNotification(newLive.currentPh);

      setLogs(prev => {
        return [{
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          severity: 'high',
          type: 'pH Boundary Violation Detected'
        }, ...prev].slice(0, 20);
      });
    }

    lastStatusRef.current = newLive.status;
  }, [sendSystemNotification]);

  useEffect(() => {
    if (isLoggedIn) {
      const initialHistory = Array.from({ length: 30 }).map(() => generateDataPoint());
      setHistory(initialHistory);
      timerRef.current = setInterval(updateDashboard, 2000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoggedIn, updateDashboard]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <Icons.Activity className="w-12 h-12 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 tracking-tight text-white">AquaSafe AI</h1>
          <p className="text-slate-400 text-center mb-8">Intelligent System Gateway</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Researcher ID</label>
              <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-100"
                placeholder="ID-8291"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Access Token</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-100"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
            >
              Authenticate System
            </button>
          </form>
          <div className="mt-6 text-[10px] text-slate-500 text-center uppercase tracking-widest leading-relaxed">
            By logging in, you enable high-priority browser notifications for critical anomalies.
          </div>
        </div>
      </div>
    );
  }

  const isAnomaly = liveState?.status === AlertStatus.ANOMALY;
  const isDrift = liveState?.status === AlertStatus.DRIFT;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-emerald-500 selection:text-white">
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <Icons.Activity className="w-8 h-8 text-emerald-400" />
          <span className="text-xl font-bold tracking-tight uppercase">AquaSafe <span className="text-emerald-500">v2.0</span></span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Live Anomaly Detection</span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isAnomaly ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              <span className={`text-xs font-bold uppercase ${isAnomaly ? 'text-red-400' : 'text-emerald-400'}`}>
                {isAnomaly ? 'pH Bound Violation' : 'Nominal State'}
              </span>
            </div>
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
            <Icons.Power className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 md:pb-6 text-white">
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
          <div className="flex gap-2 p-1 bg-slate-900 rounded-xl w-fit border border-slate-800">
            {['dashboard', 'history', 'alerts', 'settings'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all uppercase tracking-wide ${
                  activeTab === tab 
                    ? 'bg-slate-800 text-white shadow-xl shadow-black/50' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {isAnomaly && (
            <div className="bg-red-500/10 border-2 border-red-500/50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between animate-pulse-red gap-6 shadow-2xl shadow-red-900/10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-red-600 rounded-2xl shadow-lg">
                  <Icons.Alert className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-red-100 uppercase tracking-tighter">PH CRITICAL ALERT</h3>
                  <p className="text-red-400/80 font-medium">Out-of-bounds trigger detected. One alert sent to researcher.</p>
                </div>
              </div>
              <div className="flex flex-col items-center md:items-end">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] mb-1">Extrapolated Lethal Limit</span>
                <span className="text-5xl font-black mono text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  {liveState?.forecastedLethalTime || '--'} MIN
                </span>
              </div>
              <button 
                onClick={handleEmergencyReset}
                className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-2xl font-black uppercase text-xl transition-all active:scale-95 shadow-lg shadow-red-900/40"
              >
                Clear Alert
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <Gauge 
                  label="PH Signal" 
                  value={liveState?.currentPh || 0} 
                  min={6} max={10} unit="pH" 
                  color={isAnomaly ? COLORS.ANOMALY : isDrift ? COLORS.DRIFT : COLORS.HEALTHY}
                  decimals={2}
                />
                <Gauge 
                  label="Thermal Index" 
                  value={liveState?.currentTemp || 0} 
                  min={15} max={40} unit="°C" 
                  color="#f59e0b" 
                />
                
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl grid grid-cols-1 gap-4 shadow-inner">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2 mb-1">Secondary Telemetry</h4>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 flex justify-between items-center group hover:border-emerald-500/30 transition-colors">
                    <span className="text-xs font-semibold text-slate-400 uppercase group-hover:text-emerald-400 transition-colors">Nitrate</span>
                    <span className="text-xl font-bold mono text-emerald-400">{liveState?.nitrate.toFixed(1)} <span className="text-[10px] text-slate-600">PPM</span></span>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 flex justify-between items-center group hover:border-amber-500/30 transition-colors">
                    <span className="text-xs font-semibold text-slate-400 uppercase group-hover:text-amber-400 transition-colors">Ammonia</span>
                    <span className="text-xl font-bold mono text-amber-400">{liveState?.ammonia.toFixed(2)} <span className="text-[10px] text-slate-600">MG/L</span></span>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 flex justify-between items-center group hover:border-blue-500/30 transition-colors">
                    <span className="text-xs font-semibold text-slate-400 uppercase group-hover:text-blue-400 transition-colors">Oxygen</span>
                    <span className="text-xl font-bold mono text-blue-400">{liveState?.do.toFixed(1)} <span className="text-[10px] text-slate-600">MG/L</span></span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-6">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Icons.Activity className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold uppercase tracking-widest text-slate-200">Real-time PH Dynamics</h3>
                    </div>
                    <div className="flex gap-2">
                       <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[10px] mono text-emerald-400 font-bold uppercase">Safe Corridor: 7.5 - 8.5</span>
                       <span className="px-3 py-1 bg-emerald-900/20 border border-emerald-900/40 rounded-lg text-[10px] mono text-emerald-400 font-bold uppercase">Event Rate: ~1/min</span>
                    </div>
                  </div>
                  <TrendChart data={history} type="raw" />
                </div>

                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                        <Icons.Activity className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold uppercase tracking-widest text-slate-200">AI Residual Signal</h3>
                    </div>
                  </div>
                  <TrendChart data={history} type="residual" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h3 className="text-xl font-bold uppercase tracking-widest">Anomaly Audit Center</h3>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notifications: {settings.notificationsEnabled ? 'Active' : 'Muted'}</span>
              </div>
              <div className="divide-y divide-slate-800/50">
                {logs.length === 0 ? (
                  <div className="p-20 text-center">
                    <Icons.Alert className="w-16 h-16 text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium italic">System is clean. Monitoring for pH violations.</p>
                  </div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="p-8 flex items-center justify-between hover:bg-slate-800/30 transition-all border-l-4 border-l-transparent hover:border-l-red-500">
                      <div className="flex items-center gap-6">
                        <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                          <Icons.Alert className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-black text-slate-100 text-lg tracking-tight uppercase">{log.type}</div>
                          <div className="text-xs text-slate-500 mono uppercase tracking-widest mt-1">{new Date(log.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Protocol status</span>
                        <div className="px-4 py-1.5 bg-red-500 text-white text-xs font-black uppercase rounded-full shadow-lg shadow-red-500/20">Critical Alert Sent</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
             <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center shadow-2xl">
               <div className="max-w-xl mx-auto">
                 <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                   <Icons.History className="w-12 h-12 text-slate-500" />
                 </div>
                 <h3 className="text-3xl font-black mb-4 uppercase tracking-tight">Compliance & Analytics</h3>
                 <p className="text-slate-400 text-lg mb-10 leading-relaxed font-medium">
                   Access cryptographically signed data exports containing recorded out-of-bounds pH spikes and user intervention timestamps.
                 </p>
                 <div className="grid grid-cols-2 gap-4">
                   <button className="bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase transition-all shadow-lg shadow-emerald-900/20">
                     Export Full CSV
                   </button>
                   <button className="bg-slate-800 hover:bg-slate-700 text-white py-5 rounded-2xl font-black uppercase transition-all">
                     View Summary
                   </button>
                 </div>
               </div>
             </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                    <Icons.Settings className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-widest">Notification Engine</h3>
                </div>
                
                <div className="space-y-8">
                  <div className="flex items-center justify-between p-6 bg-slate-950 rounded-2xl border border-slate-800">
                    <div>
                      <div className="font-bold text-lg text-slate-100 uppercase tracking-tight">System Notifications</div>
                      <div className="text-sm text-slate-500 font-medium">Receive OS-level alerts for out-of-bounds pH events.</div>
                    </div>
                    <button 
                      onClick={() => {
                        if (!settings.notificationsEnabled) requestNotificationPermission();
                        setSettings({...settings, notificationsEnabled: !settings.notificationsEnabled});
                      }}
                      className={`w-14 h-7 rounded-full transition-all relative shadow-inner ${settings.notificationsEnabled ? 'bg-emerald-600' : 'bg-slate-800'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${settings.notificationsEnabled ? 'left-8' : 'left-1'}`}></div>
                    </button>
                  </div>
                  
                  <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Emergency SMS Integration (Twilio)</label>
                    <input 
                      type="text" 
                      value={settings.smsContact}
                      onChange={(e) => setSettings({...settings, smsContact: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-6 py-4 text-slate-100 font-bold mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

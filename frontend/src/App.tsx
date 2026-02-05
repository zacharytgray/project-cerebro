import { useState, useEffect } from 'react';
import { Activity, Brain, Server, Terminal, Briefcase, Calendar, BookOpen, DollarSign, Database, Play, Plus, Settings, ChevronLeft, Save, Trash2, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Types
interface BrainStatus {
  id: string;
  name: string;
  status: 'IDLE' | 'EXECUTING';
  autoMode: boolean;
}

interface Task {
  id: string;
  brainId: string;
  title: string;
  description?: string;
  status: string;
  modelOverride?: string;
  createdAt: number;
}


interface RecurringTask {
  id: string;
  brainId: string;
  title: string;
  description?: string;
  modelOverride?: string;
  scheduleType: 'INTERVAL' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  intervalMs?: number;
  scheduleConfig?: string;
  nextRunAt: number;
  lastRunAt?: number;
  enabled: boolean;
}


interface Job {
  id: string;
  company: string;
  position: string;
  status: string;
  updatedAt: number;
}

interface Report {
  id: string;
  brainId: string;
  date: string | null;
  kind: 'morning' | 'night' | null;
  updatedAt: number;
  markdown: string;
}

// Components
const Card = ({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div className={`bg-white/5 border border-white/10 rounded-xl p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur ${className}`} onClick={onClick}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' }) => {
  const colors = {
    default: 'bg-secondary text-secondary-foreground',
    success: 'bg-green-900/50 text-green-300 border-green-900',
    warning: 'bg-yellow-900/50 text-yellow-300 border-yellow-900'
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium border ${colors[variant]} border-opacity-50`}>
      {children}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
};

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
      checked ? 'bg-blue-500' : 'bg-gray-700'
    }`}
  >
    <div
      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export default function Dashboard() {
  const [brains, setBrains] = useState<BrainStatus[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ brainId: 'nexus', title: '', description: '', modelOverride: 'default', isRecurring: false, scheduleType: 'DAILY', intervalMinutes: 60, dailyTime: '09:00', weeklyDay: '1' });
  const [currentView, setCurrentView] = useState<'dashboard' | 'brain-detail' | 'reports'>('dashboard');
  const [selectedBrainId, setSelectedBrainId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [brainConfigObj, setBrainConfigObj] = useState<any>({});
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringTask | null>(null);
  const [isRecurringDetailOpen, setIsRecurringDetailOpen] = useState(false);
  const [editRecurring, setEditRecurring] = useState({
    title: '',
    description: '',
    modelOverride: 'default',
    scheduleType: 'DAILY' as 'INTERVAL' | 'HOURLY' | 'DAILY' | 'WEEKLY',
    intervalMinutes: 60,
    dailyTime: '09:00',
    weeklyDay: '1'
  });
  const [reportMorning, setReportMorning] = useState<string>('08:00');
  const [reportNight, setReportNight] = useState<string>('21:00');
  const [fitnessFocusInput, setFitnessFocusInput] = useState<string>('');
  const [proactiveInput, setProactiveInput] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [themeSource, setThemeSource] = useState<'system' | 'manual'>('system');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [reportBrainId, setReportBrainId] = useState<string>('personal');
  const [reports, setReports] = useState<Report[]>([]);
  const [reportLoading, setReportLoading] = useState<boolean>(false);

  const getBrainName = (brainId: string) => {
    const brain = brains.find(b => b.id === brainId);
    return brain ? brain.name : brainId;
  };

  const models = [
    { alias: 'default', id: 'google/gemini-3-flash-preview' },
    { alias: 'full', id: 'google/gemini-3-pro-preview' },
    { alias: 'cheap', id: 'google/gemini-2.5-flash' },
    { alias: 'free', id: 'google/gemini-2.5-flash-lite' },
    { alias: 'old-default', id: 'google/gemini-2.5-pro' }
  ];

  const fetchData = async () => {
    try {
      const [statusRes, tasksRes, jobsRes, recurringRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/tasks'),
        fetch('/api/jobs'),
        fetch('/api/recurring-tasks')
      ]);
      
      const statusData = await statusRes.json();
      const tasksData = await tasksRes.json();
      const jobsData = await jobsRes.json();
      const recurringData = await recurringRes.json();

      setBrains(statusData.brains || []);
      setTasks(tasksData.tasks || []);
      setJobs(jobsData.jobs || []);
      setRecurringTasks(recurringData.recurringTasks || []);
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  };

  const fetchReports = async (brainId: string, limit = 10) => {
    try {
      setReportLoading(true);
      const res = await fetch(`/api/reports?brainId=${encodeURIComponent(brainId)}&limit=${limit}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) {
      console.error(e);
      setReports([]);
    } finally {
      setReportLoading(false);
    }
  };

  const loadBrainConfig = async (brainId: string) => {
    try {
      const res = await fetch(`/api/brains/${brainId}/config`);
      const data = await res.json();
      const text = data.config || '{}';
      try {
        const cfg = JSON.parse(text || '{}');
        setBrainConfigObj(cfg || {});
        const timing = cfg.reportTiming || {};
        if (timing.morning) setReportMorning(timing.morning);
        if (timing.night) setReportNight(timing.night);
      } catch (e) {
        setBrainConfigObj({});
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveBrainConfig = async () => {
    if (!selectedBrainId) return;
    try {
      const cfg = { ...(brainConfigObj || {}) };
      cfg.reportTiming = {
        ...(cfg.reportTiming || {}),
        morning: reportMorning,
        night: reportNight
      };
      const updatedText = JSON.stringify(cfg, null, 2);
      setBrainConfigObj(cfg);

      await fetch(`/api/brains/${selectedBrainId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: updatedText })
      });
      setLastSavedAt(new Date());
    } catch (e) {
      console.error(e);
    }
  };

  const [saveTimer, setSaveTimer] = useState<any>(null);
  useEffect(() => {
    if (!selectedBrainId) return;
    if (saveTimer) clearTimeout(saveTimer);
    const t = setTimeout(() => {
      saveBrainConfig();
    }, 700);
    setSaveTimer(t);
    return () => clearTimeout(t);
  }, [brainConfigObj, reportMorning, reportNight]);


  useEffect(() => {
    fetchData();
    fetchReports(reportBrainId, 10);
    const interval = setInterval(fetchData, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('cerebro-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'light' || stored === 'dark') {
      setThemeSource('manual');
      setTheme(stored as any);
    } else {
      setThemeSource('system');
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (themeSource === 'system') {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    if (media && media.addEventListener) media.addEventListener('change', handler);
    return () => {
      if (media && media.removeEventListener) media.removeEventListener('change', handler);
    };
  }, [themeSource]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (currentView === 'brain-detail' && selectedBrainId) {
      loadBrainConfig(selectedBrainId);
    }
  }, [currentView, selectedBrainId]);

  useEffect(() => {
    if (currentView === 'reports' || currentView === 'dashboard') {
      fetchReports(reportBrainId, 10);
    }
  }, [currentView, reportBrainId]);

  const toggleBrain = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/brains/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      fetchData(); // Refresh immediately
    } catch (e) {
      console.error(e);
    }
  };

  const forceRun = async (id: string) => {
    try {
      await fetch(`/api/brains/${id}/run`, { method: 'POST' });
      setTimeout(fetchData, 500);
    } catch (e) {
      console.error(e);
    }
  };

  const openBrainConfig = (brain: BrainStatus) => {
    setSelectedBrainId(brain.id);
    setCurrentView('brain-detail');
  };

  const getCfg = (path: string, fallback: any = '') => {
    const parts = path.split('.');
    let cur: any = brainConfigObj;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object' || !(p in cur)) return fallback;
      cur = cur[p];
    }
    return cur ?? fallback;
  };

  const setCfg = (path: string, value: any) => {
    const parts = path.split('.');
    setBrainConfigObj((prev: any) => {
      const next = { ...(prev || {}) };
      let cur: any = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        cur[p] = typeof cur[p] === 'object' && cur[p] !== null ? { ...cur[p] } : {};
        cur = cur[p];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const deleteTask = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleRecurringTask = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/recurring-tasks/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const runRecurringTask = async (id: string) => {
    try {
      await fetch(`/api/recurring-tasks/${id}/run`, { method: 'POST' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteRecurringTask = async (id: string) => {
    try {
      await fetch(`/api/recurring-tasks/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const openRecurringEditor = (rt: RecurringTask) => {
    let dailyTime = '09:00';
    let weeklyDay = '1';
    let intervalMinutes = Math.round((rt.intervalMs || 0) / 60000) || 60;
    if (rt.scheduleConfig) {
      try {
        const cfg = JSON.parse(rt.scheduleConfig);
        if (rt.scheduleType === 'HOURLY' && typeof cfg.minute === 'number') {
          dailyTime = `00:${String(cfg.minute).padStart(2, '0')}`;
        }
        if (rt.scheduleType === 'DAILY' && typeof cfg.hour === 'number') {
          dailyTime = `${String(cfg.hour).padStart(2, '0')}:${String(cfg.minute || 0).padStart(2, '0')}`;
        }
        if (rt.scheduleType === 'WEEKLY') {
          weeklyDay = String(cfg.day ?? '1');
          dailyTime = `${String(cfg.hour ?? 9).padStart(2, '0')}:${String(cfg.minute || 0).padStart(2, '0')}`;
        }
      } catch (e) {
        // ignore
      }
    }

    setSelectedRecurring(rt);
    setEditRecurring({
      title: rt.title,
      description: rt.description || '',
      modelOverride: rt.modelOverride || 'default',
      scheduleType: rt.scheduleType,
      intervalMinutes,
      dailyTime,
      weeklyDay
    });
    setIsRecurringDetailOpen(true);
  };

  const saveRecurringEdits = async () => {
    if (!selectedRecurring) return;
    try {
      let scheduleConfig: any = {};
      if (editRecurring.scheduleType === 'HOURLY') {
        scheduleConfig = { minute: Number(editRecurring.dailyTime.split(':')[1] || 0) };
      } else if (editRecurring.scheduleType === 'DAILY') {
        const [h, m] = editRecurring.dailyTime.split(':');
        scheduleConfig = { hour: Number(h), minute: Number(m || 0) };
      } else if (editRecurring.scheduleType === 'WEEKLY') {
        const [h, m] = editRecurring.dailyTime.split(':');
        scheduleConfig = { day: Number(editRecurring.weeklyDay), hour: Number(h), minute: Number(m || 0) };
      }

      await fetch(`/api/recurring-tasks/${selectedRecurring.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editRecurring.title,
          description: editRecurring.description,
          modelOverride: editRecurring.modelOverride,
          scheduleType: editRecurring.scheduleType,
          intervalMinutes: editRecurring.intervalMinutes,
          scheduleConfig
        })
      });
      setIsRecurringDetailOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const createTask = async () => {
    if (!newTask.title) return;
    try {
      if (newTask.isRecurring) {
        let scheduleConfig: any = {};
        if (newTask.scheduleType === 'HOURLY') {
          scheduleConfig = { minute: Number(newTask.dailyTime.split(':')[1] || 0) };
        } else if (newTask.scheduleType === 'DAILY') {
          const [h, m] = newTask.dailyTime.split(':');
          scheduleConfig = { hour: Number(h), minute: Number(m || 0) };
        } else if (newTask.scheduleType === 'WEEKLY') {
          const [h, m] = newTask.dailyTime.split(':');
          scheduleConfig = { day: Number(newTask.weeklyDay), hour: Number(h), minute: Number(m || 0) };
        }

        await fetch('/api/recurring-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brainId: newTask.brainId,
            title: newTask.title,
            description: newTask.description,
            modelOverride: newTask.modelOverride,
            scheduleType: newTask.scheduleType,
            intervalMinutes: newTask.intervalMinutes,
            scheduleConfig
          })
        });
      } else {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brainId: newTask.brainId,
            title: newTask.title,
            description: newTask.description,
            modelOverride: newTask.modelOverride
          })
        });
      }
      setIsAddTaskOpen(false);
      setNewTask({ ...newTask, title: '', description: '' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const getBrainIcon = (id: string) => {
    switch (id) {
      case 'nexus': return <Activity className="w-5 h-5" />;
      case 'personal': return <Calendar className="w-5 h-5" />;
      case 'school': return <BookOpen className="w-5 h-5" />;
      case 'research': return <Database className="w-5 h-5" />;
      case 'money': return <DollarSign className="w-5 h-5" />;
      case 'job': return <Briefcase className="w-5 h-5" />;
      default: return <Brain className="w-5 h-5" />;
    }
  };

  const filteredTasks = statusFilter === 'ALL' 
    ? tasks 
    : tasks.filter(t => t.status === statusFilter);

  const activeBrain = selectedBrainId ? brains.find(b => b.id === selectedBrainId) : null;

  if (currentView === 'brain-detail' && activeBrain) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8 font-sans">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentView('dashboard')} className="p-2 hover:bg-white/10 rounded-lg transition-colors mr-2">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="p-2 bg-secondary rounded-lg text-blue-400">
              {getBrainIcon(activeBrain.id)}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{activeBrain.name} <span className="text-muted-foreground font-normal text-lg ml-2">Configuration</span></h1>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setCurrentView('dashboard')} className="px-4 py-2 text-sm rounded border border-border hover:bg-white/5 transition-colors">Cancel</button>
             <div className="flex items-center gap-3">
               <span className="text-xs text-muted-foreground">
                 {lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : 'Not saved yet'}
               </span>
               <button onClick={saveBrainConfig} className="flex items-center gap-2 px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                  <Save className="w-4 h-4" />
                  Save Changes
               </button>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-blue-400" /> Core Automation</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-border">
                  <div>
                    <div className="font-medium">Autonomous Execution</div>
                    <div className="text-sm text-muted-foreground">Allow this brain to pull and execute tasks without manual triggers</div>
                  </div>
                  <Toggle checked={activeBrain.autoMode} onChange={(v) => toggleBrain(activeBrain.id, v)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2 text-muted-foreground">Execution Schedule</label>
                    <input className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm" placeholder="e.g. 0 7 * * * (daily 7am)" />
                    <p className="mt-2 text-xs text-muted-foreground">Supports cron expressions or natural language like \"every 30 mins\"</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2 text-muted-foreground">Heartbeat Affinity</label>
                    <select className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm">
                      <option>High Priority (Every 30s)</option>
                      <option>Balanced (Every 5m)</option>
                      <option>Lazy (Hourly)</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2"><Database className="w-5 h-5 text-purple-400" /> Brain Settings</h2>
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">Configure human‑readable settings for <strong>{activeBrain.id}</strong>. Backend integrations and secrets are hidden.</p>

                {activeBrain.id === 'personal' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Schedule Window Start</label>
                        <input type="time" className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('preferences.scheduleWindow.start','09:00')}
                          onChange={(e) => setCfg('preferences.scheduleWindow.start', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Schedule Window End</label>
                        <input type="time" className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('preferences.scheduleWindow.end','23:00')}
                          onChange={(e) => setCfg('preferences.scheduleWindow.end', e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Lunch Target</label>
                        <input type="time" className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('preferences.lunchPreference.targetTime','13:00')}
                          onChange={(e) => setCfg('preferences.lunchPreference.targetTime', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Study Window</label>
                        <select className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('preferences.studyWindow','mid-day to late-night')}
                          onChange={(e) => setCfg('preferences.studyWindow', e.target.value)}>
                          <option value="morning">Morning</option>
                          <option value="mid-day to late-night">Mid‑day to late‑night</option>
                          <option value="evening">Evening</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Study Min (minutes)</label>
                        <input type="number" min={30} className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('preferences.studySessionMinutes.min',90)}
                          onChange={(e) => setCfg('preferences.studySessionMinutes.min', Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Study Max (minutes)</label>
                        <input type="number" min={30} className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('preferences.studySessionMinutes.max',120)}
                          onChange={(e) => setCfg('preferences.studySessionMinutes.max', Number(e.target.value))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Gym Days / Week</label>
                        <input type="number" min={0} max={7} className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('preferences.fitnessGoals.gymDaysPerWeek',3)}
                          onChange={(e) => setCfg('preferences.fitnessGoals.gymDaysPerWeek', Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Cardio Days / Week</label>
                        <input type="number" min={0} max={7} className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('preferences.fitnessGoals.cardioDaysPerWeek',3)}
                          onChange={(e) => setCfg('preferences.fitnessGoals.cardioDaysPerWeek', Number(e.target.value))} />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Fitness Focus</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(getCfg('preferences.fitnessGoals.focus',[]) as string[]).map((item) => (
                          <span key={item} className="px-2 py-1 rounded bg-secondary text-xs flex items-center gap-2">
                            {item}
                            <button className="text-muted-foreground hover:text-foreground" onClick={() => {
                              const current = (getCfg('preferences.fitnessGoals.focus',[]) as string[]).filter((x) => x !== item);
                              setCfg('preferences.fitnessGoals.focus', current);
                            }}>✕</button>
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input
                          className="w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          placeholder="Add focus (e.g., endurance)"
                          value={fitnessFocusInput}
                          onChange={(e) => setFitnessFocusInput(e.target.value)}
                        />
                        <button className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white" onClick={() => {
                          const val = fitnessFocusInput.trim();
                          if (!val) return;
                          const current = new Set(getCfg('preferences.fitnessGoals.focus',[]) as string[]);
                          current.add(val);
                          setCfg('preferences.fitnessGoals.focus', Array.from(current));
                          setFitnessFocusInput('');
                        }}>Add</button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground">Proactive Activities</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(getCfg('proactiveActivities',[]) as string[]).map((item) => (
                          <span key={item} className="px-2 py-1 rounded bg-secondary text-xs flex items-center gap-2">
                            {item}
                            <button className="text-muted-foreground hover:text-foreground" onClick={() => {
                              const current = (getCfg('proactiveActivities',[]) as string[]).filter((x) => x !== item);
                              setCfg('proactiveActivities', current);
                            }}>✕</button>
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input
                          className="w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          placeholder="Add activity (e.g., yoga)"
                          value={proactiveInput}
                          onChange={(e) => setProactiveInput(e.target.value)}
                        />
                        <button className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white" onClick={() => {
                          const val = proactiveInput.trim();
                          if (!val) return;
                          const current = new Set(getCfg('proactiveActivities',[]) as string[]);
                          current.add(val);
                          setCfg('proactiveActivities', Array.from(current));
                          setProactiveInput('');
                        }}>Add</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Planning (Morning)</label>
                        <input type="time" className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('personalPlanning.morning','09:30')}
                          onChange={(e) => setCfg('personalPlanning.morning', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Planning (Night)</label>
                        <input type="time" className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('personalPlanning.night','20:30')}
                          onChange={(e) => setCfg('personalPlanning.night', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                {activeBrain.id === 'school' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Study Session Length (min)</label>
                        <input type="number" min={30} className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('preferences.sessionLengthMinutes',50)}
                          onChange={(e) => setCfg('preferences.sessionLengthMinutes', Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Scheduling Window Start</label>
                        <input type="time" className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('scheduling.windowStart','09:00')}
                          onChange={(e) => setCfg('scheduling.windowStart', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Scheduling Window End</label>
                        <input type="time" className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('scheduling.windowEnd','23:00')}
                          onChange={(e) => setCfg('scheduling.windowEnd', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Escalation (Auto schedule + notify)</label>
                        <div className="mt-2">
                          <Toggle checked={getCfg('escalation.action','auto_schedule_notify') === 'auto_schedule_notify'} onChange={(v) => setCfg('escalation.action', v ? 'auto_schedule_notify' : 'notify_only')} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Planning (Morning)</label>
                        <input type="time" className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('schoolPlanning.morning','09:30')}
                          onChange={(e) => setCfg('schoolPlanning.morning', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Planning (Night)</label>
                        <input type="time" className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('schoolPlanning.night','20:30')}
                          onChange={(e) => setCfg('schoolPlanning.night', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Todoist Labels</label>
                      <input className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                        value={(getCfg('todoist.labels',[]) as string[]).join(', ')}
                        onChange={(e) => setCfg('todoist.labels', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
                    </div>
                  </div>
                )}

                {activeBrain.id === 'job' && (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg">
                      <h3 className="text-sm font-bold text-blue-300 mb-2">Job Application Profile</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1 uppercase">Veteran Status</label>
                          <select className="w-full bg-black/20 border border-blue-900/20 rounded px-2 py-1.5 text-sm"
                            value={getCfg('profile.veteranStatus','not_protected')}
                            onChange={(e) => setCfg('profile.veteranStatus', e.target.value)}>
                            <option value="not_protected">Not a protected veteran</option>
                            <option value="protected">Protected veteran</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1 uppercase">Work Authorization</label>
                          <select className="w-full bg-black/20 border border-blue-900/20 rounded px-2 py-1.5 text-sm"
                            value={getCfg('profile.workAuthorization','US')}
                            onChange={(e) => setCfg('profile.workAuthorization', e.target.value)}>
                            <option value="US">US</option>
                            <option value="CA">Canada</option>
                            <option value="EU">EU</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="text-xs text-muted-foreground">Auto‑submit applications</label>
                        <div className="mt-2">
                          <Toggle checked={!!getCfg('privileges.maySubmitEndToEnd', false)} onChange={(v) => setCfg('privileges.maySubmitEndToEnd', v)} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeBrain.id === 'money' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Weekly Run Hours</label>
                        <input type="number" min={1} max={8} className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('moneySearch.weeklyHours',2)}
                          onChange={(e) => setCfg('moneySearch.weeklyHours', Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Weekly Run Time</label>
                        <input type="time" className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('scheduling.weeklyRunTime','10:00')}
                          onChange={(e) => setCfg('scheduling.weeklyRunTime', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Weekly Run Day</label>
                        <select className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('scheduling.weeklyRunDay',1)}
                          onChange={(e) => setCfg('scheduling.weeklyRunDay', Number(e.target.value))}>
                          <option value={0}>Sunday</option>
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Outreach Mode</label>
                        <select className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                          value={getCfg('outreach.mode','queue_only')}
                          onChange={(e) => setCfg('outreach.mode', e.target.value)}>
                          <option value="queue_only">Queue only (manual)</option>
                          <option value="auto">Auto send</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Focus Topics</label>
                      <input className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                        value={(getCfg('moneySearch.focus',[]) as string[]).join(', ')}
                        onChange={(e) => setCfg('moneySearch.focus', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Avoid Topics</label>
                      <input className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                        value={(getCfg('moneySearch.avoid',[]) as string[]).join(', ')}
                        onChange={(e) => setCfg('moneySearch.avoid', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Target Types</label>
                      <input className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                        value={(getCfg('moneySearch.targets',[]) as string[]).join(', ')}
                        onChange={(e) => setCfg('moneySearch.targets', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Job Type</label>
                      <input className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                        value={getCfg('moneySearch.jobType','summer internships')}
                        onChange={(e) => setCfg('moneySearch.jobType', e.target.value)} />
                    </div>
                  </div>
                )}

                {activeBrain.id === 'digest' && (
                  <div>
                    <label className="text-xs text-muted-foreground">Summary Style</label>
                    <select className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                      value={getCfg('reporting.summaryStyle','concise')}
                      onChange={(e) => setCfg('reporting.summaryStyle', e.target.value)}>
                      <option value="concise">Concise</option>
                      <option value="detailed">Detailed</option>
                    </select>
                  </div>
                )}

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground">Advanced</summary>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Reporting Enabled</label>
                      <div className="mt-2">
                        <Toggle checked={!!getCfg('reporting.enabled', true)} onChange={(v) => setCfg('reporting.enabled', v)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Calendar Write Without Confirmation</label>
                      <div className="mt-2">
                        <Toggle checked={!!getCfg('privileges.calendarWriteWithoutConfirmation', false)} onChange={(v) => setCfg('privileges.calendarWriteWithoutConfirmation', v)} />
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-400">Reporting</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <input type="checkbox" className="w-4 h-4 accent-blue-500" defaultChecked={['money','job','research','personal','school','digest','nexus'].includes(activeBrain.id)} readOnly />
                   <span className="text-sm font-medium">Generate Markdown Reports</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                   Configure daily report times for this brain. Updates are saved into the brain config JSON.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Morning Report</label>
                    <input
                      type="time"
                      className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                      value={reportMorning}
                      onChange={(e) => setReportMorning(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Night Report</label>
                    <input
                      type="time"
                      className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                      value={reportNight}
                      onChange={(e) => setReportNight(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                   <input type="checkbox" className="w-4 h-4 accent-blue-500" defaultChecked readOnly />
                   <span className="text-sm font-medium">Post Summaries to Discord</span>
                </div>
              </div>
            </Card>

            <Card className="bg-blue-600/5 border-blue-600/20">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-2">Internal Metadata</h2>
              <div className="text-xs space-y-2 font-mono">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-muted-foreground">ID:</span>
                  <span>{activeBrain.id}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={activeBrain.status === 'EXECUTING' ? 'text-green-400' : ''}>{activeBrain.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">OpenClaw ID:</span>
                  <span>{activeBrain.id}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0e14] via-[#0d111c] to-[#0a0f1a] text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-64 flex-col gap-6 border-r border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-300"><Activity className="w-5 h-5" /></div>
            <div>
              <div className="text-sm font-semibold">Project Cerebro</div>
              <div className="text-[11px] text-muted-foreground">Control Surface</div>
            </div>
          </div>
          <nav className="flex flex-col gap-1 text-sm">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
              { key: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" /> }
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setCurrentView(item.key as any)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${currentView === item.key ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30' : 'text-muted-foreground hover:bg-white/5'}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              System Online
            </div>
          </div>
        </aside>

        <div className="flex-1 p-6">
      <header className="mb-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-300"><Activity className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Project Cerebro</h1>
            <p className="text-xs text-muted-foreground">Polished control surface</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsAddTaskOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs rounded-md bg-blue-600/80 hover:bg-blue-600 text-white transition-colors"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
          <button
            onClick={fetchData}
            className="px-3 py-2 text-xs rounded-md border border-white/10 hover:bg-white/5"
          >
            Refresh
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{theme === 'dark' ? 'Dark' : 'Light'}</span>
            <Toggle checked={theme === 'dark'} onChange={(v) => {
              setThemeSource('manual');
              const next = v ? 'dark' : 'light';
              setTheme(next as any);
              localStorage.setItem('cerebro-theme', next);
            }} />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs text-muted-foreground">System Online</span>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* File Ingestion */}
        <section className="lg:col-span-3">
          <Card>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white"><Database className="w-5 h-5 text-blue-300" /> File Ingestion</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs text-muted-foreground">Target Brain</label>
                <select
                  className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                  value={getCfg('uiUploadTarget','default')}
                  onChange={(e) => setCfg('uiUploadTarget', e.target.value)}
                >
                  <option value="default">Default Intake</option>
                  {brains.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Choose File</label>
                <input
                  type="file"
                  className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                  id="fileUploadInput"
                />
              </div>
              <div>
                <button
                  className="w-full px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white"
                  onClick={async () => {
                    const input = document.getElementById('fileUploadInput') as HTMLInputElement | null;
                    if (!input || !input.files || input.files.length === 0) return;
                    const file = input.files[0];
                    const form = new FormData();
                    form.append('file', file);
                    const target = getCfg('uiUploadTarget','default');
                    form.append('brainId', target);
                    await fetch('/api/upload', { method: 'POST', body: form });
                    input.value = '';
                  }}
                >
                  Upload
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Uploads go to <code>data/&lt;brain&gt;/intake/</code> or <code>data/default/intake/</code>.</p>
          </Card>
        </section>

        {/* Brain Status Grid */}
        <section className="lg:col-span-3">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white"><Server className="w-5 h-5 text-blue-300" /> Active Brains</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {brains.map((brain) => (
              <motion.div key={brain.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="flex flex-col gap-3 relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-1 h-full ${brain.status === 'EXECUTING' ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                  <div className="flex justify-between items-start">
                    <div className="p-2 bg-secondary rounded-lg text-blue-400">
                      {getBrainIcon(brain.id)}
                    </div>
                    <Badge variant={brain.status === 'EXECUTING' ? 'success' : 'default'}>
                      {brain.status}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-medium truncate">{brain.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {brain.status === 'EXECUTING' ? 'Processing task...' : 'Waiting for heartbeat'}
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                     <Toggle checked={brain.autoMode} onChange={(v) => toggleBrain(brain.id, v)} />
                     <span className="text-xs text-muted-foreground">Auto</span>
                     <div className="flex-1" />
                     <button onClick={() => openBrainConfig(brain)} className="p-1 hover:bg-white/10 rounded transition-colors" title="Configure Brain">
                        <Settings className="w-4 h-4 text-blue-300" />
                     </button>
                     <button onClick={() => forceRun(brain.id)} className="p-1 hover:bg-white/10 rounded transition-colors" title="Force Run">
                        <Play className="w-4 h-4 text-green-400" />
                     </button>
                  </div>

                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Task Graph Stream */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-white"><Terminal className="w-5 h-5 text-blue-300" /> Execution Stream</h2>
              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-md">
                {['ALL', 'READY', 'EXECUTING', 'COMPLETED', 'FAILED'].map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-2 py-1 text-[10px] uppercase font-bold rounded transition-colors ${
                      statusFilter === f ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-muted-foreground'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{filteredTasks.length} tasks</span>
              <button
                onClick={() => setIsAddTaskOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-blue-600/80 hover:bg-blue-600 text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </div>
          </div>
          <Card className="h-[500px] overflow-y-auto font-mono text-sm">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-card z-10 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="pb-3 pl-2">Status</th>
                  <th className="pb-3">Brain</th>
                  <th className="pb-3">Model</th>
                  <th className="pb-3">Task</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTasks.map((task) => (
                  <tr 
                    key={task.id} 
                    className="group hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsTaskDetailOpen(true);
                    }}
                  >
                    <td className="py-3 pl-2 whitespace-nowrap">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 
                        ${task.status === 'COMPLETED' ? 'bg-green-500' : 
                          task.status === 'FAILED' ? 'bg-red-500' : 
                          task.status === 'EXECUTING' ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'}`}>
                      </span>
                      <span className={
                        task.status === 'COMPLETED' ? 'text-green-400' : 
                        task.status === 'FAILED' ? 'text-red-400' : 'text-muted-foreground'
                      }>{task.status}</span>
                    </td>
                    <td className="py-3 text-muted-foreground">{task.brainId}</td>
                    <td className="py-3 text-muted-foreground">
                      <Badge variant="default">{task.modelOverride || 'default'}</Badge>
                    </td>
                    <td className="py-3 font-medium text-foreground">
                      <div>{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground font-normal mt-1 line-clamp-1 max-w-md">
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right pr-2">
                       <button 
                         onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                         className="p-1.5 hover:bg-red-900/20 hover:text-red-400 rounded transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
                         title="Delete Task"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))}
                {filteredTasks.length === 0 && (
                   <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No tasks matching filter.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </section>

        {/* Recurring Tasks */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Calendar className="w-5 h-5" /> Recurring Tasks</h2>
            <span className="text-xs text-muted-foreground">{recurringTasks.length} active</span>
          </div>
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto">
            {recurringTasks.map((rt) => {
              const isBrainTask = (rt.description || '').includes('REPORT_KIND:') || (rt.description || '').includes('PLANNING_KIND:') || (rt.description || '').includes('MONEY_SEARCH');
              return (
              <Card key={rt.id} className={`p-4 hover:border-blue-500/50 transition-colors ${isBrainTask ? '' : 'cursor-pointer'}`} onClick={() => { if (!isBrainTask) openRecurringEditor(rt); }}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold">{rt.title}</h3>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Toggle checked={rt.enabled} onChange={(v) => toggleRecurringTask(rt.id, v)} />
                    <button
                      onClick={() => runRecurringTask(rt.id)}
                      className="p-1.5 hover:bg-blue-900/20 hover:text-blue-300 rounded transition-colors text-muted-foreground"
                      title="Run Now"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRecurringTask(rt.id)}
                      className="p-1.5 hover:bg-red-900/20 hover:text-red-400 rounded transition-colors text-muted-foreground"
                      title="Delete Recurring Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{getBrainName(rt.brainId)} • {rt.scheduleType === 'INTERVAL' ? `Every ${Math.round((rt.intervalMs || 0) / 60000)} min` : rt.scheduleType}{(rt.description || '').includes('REPORT_KIND:') || (rt.description || '').includes('PLANNING_KIND:') || (rt.description || '').includes('MONEY_SEARCH') ? ' • Brain Task' : ''}</p>
                {((rt.description || '').includes('REPORT_KIND:') || (rt.description || '').includes('PLANNING_KIND:') || (rt.description || '').includes('MONEY_SEARCH')) && (
                  <p className="text-[11px] text-muted-foreground">Managed in Brain Config → Schedules</p>
                )}
                <div className="text-xs text-gray-500 flex justify-between items-center">
                  <span>Next: {new Date(rt.nextRunAt).toLocaleString()}</span>
                  <span>{rt.enabled ? 'Enabled' : 'Paused'}</span>
                </div>
              </Card>
              );
            })}
            {recurringTasks.length === 0 && (
              <div className="text-center p-8 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
                No recurring tasks configured.
              </div>
            )}
          </div>
        </section>

        {/* Active Jobs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Briefcase className="w-5 h-5" /> Tracked Jobs</h2>
            <span className="text-xs text-muted-foreground">{jobs.length} active</span>
          </div>
          <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
            {jobs.map((job) => (
              <Card key={job.id} className="p-4 hover:border-blue-500/50 transition-colors cursor-default">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold">{job.company}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-800">
                    {job.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{job.position}</p>
                <div className="text-xs text-gray-500 flex justify-between items-center">
                  <span>ID: {job.id.slice(-6)}</span>
                  <span>{new Date(job.updatedAt).toLocaleDateString()}</span>
                </div>
              </Card>
            ))}
            {jobs.length === 0 && (
              <div className="text-center p-8 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
                No active job applications tracked.
              </div>
            )}
          </div>
        </section>



        {/* Reports */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-white"><FileText className="w-5 h-5 text-blue-300" /> Reports</h2>
            <div className="flex items-center gap-2">
              <select
                className="bg-secondary/50 border border-border rounded px-3 py-1.5 text-xs"
                value={reportBrainId}
                onChange={(e) => setReportBrainId(e.target.value)}
              >
                {brains.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <button onClick={() => fetchReports(reportBrainId, 10)} className="text-xs text-blue-300 hover:underline">Refresh</button>
            </div>
          </div>
          <Card>
            {reportLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
            {!reportLoading && reports.length === 0 && (
              <p className="text-xs text-muted-foreground">No reports found.</p>
            )}
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
              {reports.map(r => (
                <div key={r.id} className="border border-border rounded-lg p-4 bg-secondary/20">
                  <div className="text-xs text-muted-foreground mb-2">{r.date || 'Unknown date'} • {r.kind || 'report'} • {new Date(r.updatedAt).toLocaleString()}</div>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{r.markdown}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

      </main>

        </div>
      </div>

            {/* Add Task Modal */}
      <Modal isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} title="Create Task">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Task Title</label>
            <input
              className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
              placeholder="Describe the task..."
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <textarea
              className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm min-h-[80px]"
              placeholder="Add details, context, or instructions..."
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
            <div>
              <div className="text-sm font-medium">Recurring Task</div>
              <div className="text-xs text-muted-foreground">Create a scheduled task that spawns executions</div>
            </div>
            <Toggle checked={newTask.isRecurring} onChange={(v) => setNewTask({ ...newTask, isRecurring: v })} />
          </div>
          {newTask.isRecurring && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Schedule Type</label>
                <select
                  className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                  value={newTask.scheduleType}
                  onChange={(e) => setNewTask({ ...newTask, scheduleType: e.target.value })}
                >
                  <option value="HOURLY">Hourly</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="INTERVAL">Interval</option>
                </select>
              </div>

              {newTask.scheduleType === 'INTERVAL' && (
                <div>
                  <label className="text-xs text-muted-foreground">Interval (minutes)</label>
                  <input
                    type="number"
                    min={1}
                    className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                    value={newTask.intervalMinutes}
                    onChange={(e) => setNewTask({ ...newTask, intervalMinutes: Number(e.target.value) })}
                  />
                </div>
              )}

              {newTask.scheduleType === 'HOURLY' && (
                <div>
                  <label className="text-xs text-muted-foreground">Minute of Hour</label>
                  <select
                    className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                    value={newTask.dailyTime}
                    onChange={(e) => setNewTask({ ...newTask, dailyTime: e.target.value })}
                  >
                    {['00','15','30','45'].map(m => (
                      <option key={m} value={`00:${m}`}>:{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {newTask.scheduleType === 'DAILY' && (
                <div>
                  <label className="text-xs text-muted-foreground">Time of Day</label>
                  <input
                    type="time"
                    className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                    value={newTask.dailyTime}
                    onChange={(e) => setNewTask({ ...newTask, dailyTime: e.target.value })}
                  />
                </div>
              )}

              {newTask.scheduleType === 'WEEKLY' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Day</label>
                    <select
                      className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                      value={newTask.weeklyDay}
                      onChange={(e) => setNewTask({ ...newTask, weeklyDay: e.target.value })}
                    >
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Time</label>
                    <input
                      type="time"
                      className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                      value={newTask.dailyTime}
                      onChange={(e) => setNewTask({ ...newTask, dailyTime: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Brain</label>
              <select
                className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                value={newTask.brainId}
                onChange={(e) => setNewTask({ ...newTask, brainId: e.target.value })}
              >
                {brains.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Model</label>
              <select
                className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                value={newTask.modelOverride}
                onChange={(e) => setNewTask({ ...newTask, modelOverride: e.target.value })}
              >
                {models.map((m) => (
                  <option key={m.alias} value={m.alias}>{m.alias}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Model Aliases</p>
            {models.map((m) => (
              <div key={m.alias} className="flex justify-between">
                <span>{m.alias}</span>
                <span className="text-muted-foreground">{m.id}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setIsAddTaskOpen(false)} className="px-3 py-2 text-sm rounded border border-border hover:bg-white/5">Cancel</button>
            <button onClick={createTask} className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white">Create</button>
          </div>
        </div>
      </Modal>

      {/* Recurring Task Detail Modal */}
      <Modal isOpen={isRecurringDetailOpen} onClose={() => setIsRecurringDetailOpen(false)} title="Edit Recurring Task">
        {selectedRecurring && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Title</label>
              <input
                className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                value={editRecurring.title}
                onChange={(e) => setEditRecurring({ ...editRecurring, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <textarea
                className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm min-h-[80px]"
                value={editRecurring.description}
                onChange={(e) => setEditRecurring({ ...editRecurring, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Schedule Type</label>
                <select
                  className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                  value={editRecurring.scheduleType}
                  onChange={(e) => setEditRecurring({ ...editRecurring, scheduleType: e.target.value as any })}
                >
                  <option value="HOURLY">Hourly</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="INTERVAL">Interval</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Model</label>
                <select
                  className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                  value={editRecurring.modelOverride}
                  onChange={(e) => setEditRecurring({ ...editRecurring, modelOverride: e.target.value })}
                >
                  {models.map((m) => (
                    <option key={m.alias} value={m.alias}>{m.alias}</option>
                  ))}
                </select>
              </div>
            </div>

            {editRecurring.scheduleType === 'INTERVAL' && (
              <div>
                <label className="text-xs text-muted-foreground">Interval (minutes)</label>
                <input
                  type="number"
                  min={1}
                  className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                  value={editRecurring.intervalMinutes}
                  onChange={(e) => setEditRecurring({ ...editRecurring, intervalMinutes: Number(e.target.value) })}
                />
              </div>
            )}

            {editRecurring.scheduleType === 'HOURLY' && (
              <div>
                <label className="text-xs text-muted-foreground">Minute of Hour</label>
                <select
                  className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                  value={editRecurring.dailyTime}
                  onChange={(e) => setEditRecurring({ ...editRecurring, dailyTime: e.target.value })}
                >
                  {['00','15','30','45'].map(m => (
                    <option key={m} value={`00:${m}`}>:{m}</option>
                  ))}
                </select>
              </div>
            )}

            {editRecurring.scheduleType === 'DAILY' && (
              <div>
                <label className="text-xs text-muted-foreground">Time of Day</label>
                <input
                  type="time"
                  className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                  value={editRecurring.dailyTime}
                  onChange={(e) => setEditRecurring({ ...editRecurring, dailyTime: e.target.value })}
                />
              </div>
            )}

            {editRecurring.scheduleType === 'WEEKLY' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Day</label>
                  <select
                    className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                    value={editRecurring.weeklyDay}
                    onChange={(e) => setEditRecurring({ ...editRecurring, weeklyDay: e.target.value })}
                  >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Time</label>
                  <input
                    type="time"
                    className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm"
                    value={editRecurring.dailyTime}
                    onChange={(e) => setEditRecurring({ ...editRecurring, dailyTime: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsRecurringDetailOpen(false)} className="px-3 py-2 text-sm rounded border border-border hover:bg-white/5">Cancel</button>
              <button onClick={saveRecurringEdits} className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white">Save</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Task Detail Modal */}
      <Modal 
        isOpen={isTaskDetailOpen} 
        onClose={() => setIsTaskDetailOpen(false)} 
        title="Task Inspector"
      >
        {selectedTask && (
          <div className="flex flex-col gap-5">
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Title</div>
              <div className="text-lg font-bold text-blue-400">{selectedTask.title}</div>
            </div>

            {selectedTask.description && (
              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Description</div>
                <div className="text-sm bg-secondary/30 p-3 rounded-lg border border-border leading-relaxed">
                  {selectedTask.description}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Brain</div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="p-1 bg-secondary rounded text-blue-400">
                    {getBrainIcon(selectedTask.brainId)}
                  </div>
                  {getBrainName(selectedTask.brainId)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Model</div>
                <Badge variant="default">{selectedTask.modelOverride || 'default'}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    selectedTask.status === 'COMPLETED' ? 'bg-green-500' : 
                    selectedTask.status === 'FAILED' ? 'bg-red-500' : 
                    selectedTask.status === 'EXECUTING' ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'
                  }`} />
                  <span className="text-sm font-bold uppercase">{selectedTask.status}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Created</div>
                <div className="text-sm text-muted-foreground">{new Date(selectedTask.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="pt-4 flex justify-between gap-3 border-t border-border">
              <button 
                onClick={() => {
                  deleteTask(selectedTask.id);
                  setIsTaskDetailOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded bg-red-900/20 hover:bg-red-900/40 text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </button>
              <button 
                onClick={() => setIsTaskDetailOpen(false)} 
                className="px-6 py-2 text-sm rounded bg-secondary hover:bg-secondary/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
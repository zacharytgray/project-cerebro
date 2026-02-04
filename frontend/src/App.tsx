import { useState, useEffect } from 'react';
import { Activity, Brain, Server, Terminal, Briefcase, Calendar, BookOpen, DollarSign, Database, Play, Plus, Settings, ChevronLeft, Save } from 'lucide-react';
import { motion } from 'framer-motion';

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
  status: string;
  modelOverride?: string;
  createdAt: number;
}

interface Job {
  id: string;
  company: string;
  position: string;
  status: string;
  updatedAt: number;
}

// Components
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ brainId: 'nexus', title: '', modelOverride: 'default' });
  const [currentView, setCurrentView] = useState<'dashboard' | 'brain-detail'>('dashboard');
  const [selectedBrainId, setSelectedBrainId] = useState<string | null>(null);
  const [isBrainConfigOpen, setIsBrainConfigOpen] = useState(false);

  const models = [
    { alias: 'default', id: 'google/gemini-3-flash-preview' },
    { alias: 'full', id: 'google/gemini-3-pro-preview' },
    { alias: 'cheap', id: 'google/gemini-2.5-flash' },
    { alias: 'free', id: 'google/gemini-2.5-flash-lite' },
    { alias: 'old-default', id: 'google/gemini-2.5-pro' }
  ];

  const fetchData = async () => {
    try {
      const [statusRes, tasksRes, jobsRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/tasks'),
        fetch('/api/jobs')
      ]);
      
      const statusData = await statusRes.json();
      const tasksData = await tasksRes.json();
      const jobsData = await jobsRes.json();

      setBrains(statusData.brains || []);
      setTasks(tasksData.tasks || []);
      setJobs(jobsData.jobs || []);
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

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
      // Ideally we'd show a toast or something.
      // But refreshing data will show status: EXECUTING.
      setTimeout(fetchData, 500);
    } catch (e) {
      console.error(e);
    }
  };

  const openBrainConfig = (brain: BrainStatus) => {
    setSelectedBrainId(brain.id);
    setCurrentView('brain-detail');
  };

  const createTask = async () => {
    if (!newTask.title) return;
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      setIsAddTaskOpen(false);
      setNewTask({ ...newTask, title: '' });
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
             <button className="flex items-center gap-2 px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                <Save className="w-4 h-4" />
                Save Changes
             </button>
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
                    <p className="mt-2 text-xs text-muted-foreground">Supports cron expressions or natural language like "every 30 mins"</p>
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
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2"><Database className="w-5 h-5 text-purple-400" /> Brain Context & Memory</h2>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Configuration specific to the <strong>{activeBrain.id}</strong> domain.</p>
                
                {activeBrain.id === 'job' && (
                  <div className="grid grid-cols-1 gap-4">
                     <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg">
                        <h3 className="text-sm font-bold text-blue-300 mb-2">Job Application Profile</h3>
                        <div className="space-y-3">
                           <div>
                              <label className="text-xs text-muted-foreground block mb-1 uppercase">Veteran Status</label>
                              <select className="w-full bg-black/20 border border-blue-900/20 rounded px-2 py-1.5 text-sm">
                                 <option>I am not a protected veteran</option>
                                 <option>I am a protected veteran</option>
                              </select>
                           </div>
                           <div>
                              <label className="text-xs text-muted-foreground block mb-1 uppercase">Resume Link (PDF/Markdown)</label>
                              <input className="w-full bg-black/20 border border-blue-900/20 rounded px-2 py-1.5 text-sm" placeholder="URL or path to latest resume..." />
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                <div className="p-4 border border-dashed border-border rounded-lg text-center text-muted-foreground text-sm py-12">
                   No additional specialization fields defined for this brain yet.
                </div>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-400">Reporting</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <input type="checkbox" className="w-4 h-4 accent-blue-500" defaultChecked={['money','job','research'].includes(activeBrain.id)} />
                   <span className="text-sm font-medium">Generate Markdown Reports</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                   When enabled, this brain will write a detailed execution log and summary to disk at the end of each run.
                </p>
                <div className="flex items-center gap-3 pt-2">
                   <input type="checkbox" className="w-4 h-4 accent-blue-500" defaultChecked />
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
    <div className="min-h-screen bg-background text-foreground p-8 font-sans">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold tracking-tight">Project Cerebro <span className="text-muted-foreground font-normal text-lg ml-2">Control Surface</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm text-muted-foreground">System Online</span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Brain Status Grid */}
        <section className="lg:col-span-3">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Server className="w-5 h-5" /> Active Brains</h2>
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
            <h2 className="text-lg font-semibold flex items-center gap-2"><Terminal className="w-5 h-5" /> Execution Stream</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{tasks.length} tasks recorded</span>
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
                  <th className="pb-3 text-right pr-2">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map((task) => (
                  <tr key={task.id} className="group hover:bg-white/5 transition-colors">
                    <td className="py-3 pl-2">
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
                    <td className="py-3 font-medium text-foreground">{task.title}</td>
                    <td className="py-3 text-right pr-2 text-muted-foreground">
                      {Math.floor((Date.now() - task.createdAt) / 60000)}m ago
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                   <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No tasks in graph history.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
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

      </main>

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

      {/* Brain Config Modal */}
      <Modal isOpen={isBrainConfigOpen} onClose={() => setIsBrainConfigOpen(false)} title={activeBrain ? `${activeBrain.name} Settings` : 'Brain Settings'}>
        {activeBrain && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Automation</div>
                <div className="text-xs text-muted-foreground">Toggle auto-execution and schedules</div>
              </div>
              <Toggle checked={activeBrain.autoMode} onChange={(v) => toggleBrain(activeBrain.id, v)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Schedule (cron or human)</label>
              <input className="mt-2 w-full bg-secondary/50 border border-border rounded px-3 py-2 text-sm" placeholder="e.g. 0 7 * * * (daily 7am)" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Reports & Summaries</label>
              <div className="mt-2 flex items-center gap-2">
                <input type="checkbox" className="accent-blue-500" defaultChecked={['money','job','research'].includes(activeBrain.id)} />
                <span>Generate markdown reports</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Short summary posted to Discord; full report stored on disk.</div>
            </div>
            <div className="text-xs text-muted-foreground">This is a placeholder config panel—wiring comes next.</div>
          </div>
        )}
      </Modal>
    </div>
  );
}

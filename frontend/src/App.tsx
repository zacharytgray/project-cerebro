import { useState, useEffect } from 'react';
import { Activity, Brain, Server, Terminal, Briefcase, Calendar, BookOpen, DollarSign, Database, CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';

// Types
interface BrainStatus {
  id: string;
  name: string;
  status: 'IDLE' | 'EXECUTING';
}

interface Task {
  id: string;
  brainId: string;
  title: string;
  status: string;
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

export default function Dashboard() {
  const [brains, setBrains] = useState<BrainStatus[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

  const getBrainIcon = (id: string) => {
    switch (id) {
      case 'personal': return <Calendar className="w-5 h-5" />;
      case 'school': return <BookOpen className="w-5 h-5" />;
      case 'research': return <Database className="w-5 h-5" />;
      case 'money': return <DollarSign className="w-5 h-5" />;
      case 'job': return <Briefcase className="w-5 h-5" />;
      default: return <Brain className="w-5 h-5" />;
    }
  };

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
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Task Graph Stream */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Terminal className="w-5 h-5" /> Execution Stream</h2>
            <span className="text-xs text-muted-foreground">{tasks.length} tasks recorded</span>
          </div>
          <Card className="h-[500px] overflow-y-auto font-mono text-sm">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-card z-10 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="pb-3 pl-2">Status</th>
                  <th className="pb-3">Brain</th>
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
    </div>
  );
}

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../cerebro.db');
const db = new sqlite3.Database(dbPath);

const configs = {
  personal: {
    domain: 'Personal Life',
    integrations: {
      googleCalendar: { enabled: true, permissions: ['read', 'write'], calendars: ['primary', 'Spring 2026 Classes'], mergeMode: 'merged' },
      weather: { enabled: true, location: 'auto' },
      location: { enabled: true, mode: 'auto' }
    },
    preferences: {
      hobbies: [],
      energyLevels: {},
      activityDurations: {},
      scheduleWindow: { start: '09:00', end: '23:00' },
      lunchPreference: { targetTime: '13:00', strategy: 'dynamic' },
      studySessionMinutes: { min: 90, max: 120 },
      studyWindow: 'mid-day to late-night',
      fitnessGoals: { focus: ['fat loss', 'muscle building'], gymDaysPerWeek: 3, cardioDaysPerWeek: 3 }
    },
    reporting: { enabled: true, markdownReports: true },
    reportTiming: { morning: '08:00', night: '21:00' },
    personalPlanning: { morning: '09:30', night: '20:30' },
    proactiveActivities: ['gym', 'cardio', 'walk', 'reading', 'social'],
    privileges: { calendarWriteWithoutConfirmation: true, respectHigherPriorityBlocks: ['school', 'research'] }
  },
  school: {
    domain: 'Schoolwork',
    integrations: {
      todoist: { enabled: true, permissions: ['read', 'write'], labels: ['Quiz', 'Exam', 'Homework', 'Research'] },
      googleCalendar: { enabled: true, permissions: ['read', 'write_safe'], calendars: ['primary', 'Spring 2026 Classes'], mergeMode: 'merged' }
    },
    preferences: { studyHabits: {}, preferredTimes: [], sessionLengthMinutes: 50 },
    notifications: { enabled: true, escalation: true },
    reporting: { enabled: true, markdownReports: true },
    reportTiming: { morning: '08:00', night: '21:00' },
    privileges: { highestSchedulingAuthority: true, overridePersonalBlocks: true, neverDeleteCalendarEvents: true }
  },
  research: {
    domain: 'Research',
    integrations: {
      filesystem: { enabled: true, read: true, write: true, basePath: './data/research' },
      todoist: { enabled: true, permissions: ['read'] },
      webSearch: { enabled: true, scope: 'academic', sources: ['arXiv', 'conference'] }
    },
    reporting: { enabled: true, markdownReports: true, artifactPath: './reports/research' },
    reportTiming: { morning: '08:00', night: '21:00' },
    privileges: { longRunningTasks: true, weeklyAutonomousScans: true }
  },
  money: {
    domain: 'Money Making',
    integrations: {
      webSearch: { enabled: true },
      agentBrowser: { enabled: true },
      email: { enabled: true, send: true, inboxMonitor: true },
      filesystem: { enabled: true, read: true, write: true, basePath: './data/money' }
    },
    tracking: { prospectsStore: './data/money/prospects.json', logExternalContacts: true },
    reporting: { enabled: true, markdownReports: true },
    reportTiming: { morning: '08:00', night: '21:00' },
    privileges: { proactiveOutbound: true, longRunningWorkflows: true }
  },
  job: {
    domain: 'Job Application',
    integrations: {
      agentBrowser: { enabled: true, trust: 'high' },
      jobSearchMcp: { enabled: true },
      inbox: { enabled: true, mode: 'read' }
    },
    database: { enabled: true, table: 'jobs' },
    profile: { veteranStatus: 'not_protected', workAuthorization: 'US', resumeVariants: [] },
    answerBank: { enabled: true, fabricationForbidden: true },
    reporting: { enabled: true, markdownReports: true },
    reportTiming: { morning: '08:00', night: '21:00' },
    privileges: { maySubmitEndToEnd: true, queueForReview: true }
  },
  digest: {
    domain: 'Daily Digest',
    integrations: { calendarReadOnly: true, readAllTaskStates: true, logs: true },
    reporting: { enabled: true, markdownReports: true, summaryStyle: 'concise', highlightPriorities: true },
    reportTiming: { morning: '08:00', night: '21:00' },
    privileges: { outputOnly: true, noScheduling: true }
  },
  nexus: {
    domain: 'Nexus',
    integrations: { defaultTools: true },
    reporting: { enabled: true, markdownReports: true },
    reportTiming: { morning: '08:00', night: '21:00' },
    privileges: { controller: true }
  }
};

console.log('Seeding brain configurations...');

const now = Date.now();

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS brain_configs (
      brainId TEXT PRIMARY KEY,
      config TEXT,
      updatedAt INTEGER
    )
  `);

  const stmt = db.prepare(`
    INSERT INTO brain_configs (brainId, config, updatedAt)
    VALUES (?, ?, ?)
    ON CONFLICT(brainId) DO UPDATE SET
      config = excluded.config,
      updatedAt = excluded.updatedAt
  `);

  Object.entries(configs).forEach(([id, config]) => {
    stmt.run(id, JSON.stringify(config, null, 2), now, (err) => {
      if (err) console.error(`Failed to seed ${id}:`, err);
      else console.log(`Seeded config for ${id}`);
    });
  });

  stmt.finalize(() => {
    console.log('Done.');
    db.close();
  });
});

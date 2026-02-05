import { exec } from 'child_process';
import { format, toZonedTime } from 'date-fns-tz';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CALENDARS = [
    { id: 'primary', name: 'Primary' },
    { id: '11f616ac4709e82271d6902bec2d12cb2f927a7777dbad0a7e9c7ae611bf00a7@group.calendar.google.com', name: 'Spring 2026 Classes' }
];

const TIMEZONE = 'America/Chicago';

interface CalendarEvent {
    summary: string;
    start: { dateTime?: string; date?: string; timeZone?: string };
    end: { dateTime?: string; date?: string; timeZone?: string };
}

interface NormalizedEvent {
    summary: string;
    start: Date;
    end: Date;
    isAllDay: boolean;
    source: string;
}

async function fetchEvents(calendarId: string, from: string, to: string): Promise<CalendarEvent[]> {
    try {
        const cmd = `GOG_ACCOUNT=zacharytgray@gmail.com gog calendar events ${calendarId} --from ${from} --to ${to} --json`;
        const { stdout } = await execAsync(cmd);
        const data = JSON.parse(stdout);
        return data.events || [];
    } catch (e) {
        console.error(`Failed to fetch calendar ${calendarId}:`, e);
        return [];
    }
}

async function main() {
    // Default to today + tomorrow
    const now = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setDate(to.getDate() + 2); // 48h window
    to.setHours(23, 59, 59, 999);

    const fromStr = from.toISOString();
    const toStr = to.toISOString();

    const allEvents: NormalizedEvent[] = [];

    for (const cal of CALENDARS) {
        const events = await fetchEvents(cal.id, fromStr, toStr);
        for (const e of events) {
            if (e.start.dateTime) {
                // Time-based event
                const dStart = new Date(e.start.dateTime);
                const dEnd = new Date(e.end.dateTime || e.start.dateTime);
                
                allEvents.push({
                    summary: e.summary,
                    start: dStart,
                    end: dEnd,
                    isAllDay: false,
                    source: cal.name
                });
            } else if (e.start.date) {
                // All-day event
                const dStart = new Date(e.start.date);
                const dEnd = new Date(e.end.date || e.start.date);
                allEvents.push({
                    summary: e.summary,
                    start: dStart,
                    end: dEnd,
                    isAllDay: true,
                    source: cal.name
                });
            }
        }
    }

    // Sort chronologically
    allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

    // Format output
    console.log(`# Schedule (${format(toZonedTime(now, TIMEZONE), 'yyyy-MM-dd', { timeZone: TIMEZONE })})`);
    
    let currentDay = '';
    
    for (const e of allEvents) {
        const zonedStart = toZonedTime(e.start, TIMEZONE);
        const zonedEnd = toZonedTime(e.end, TIMEZONE);
        
        const dayStr = format(zonedStart, 'EEEE, MMMM d', { timeZone: TIMEZONE });
        
        if (dayStr !== currentDay) {
            console.log(`\n## ${dayStr}`);
            currentDay = dayStr;
        }

        if (e.isAllDay) {
            console.log(`- [All Day] ${e.summary}`);
        } else {
            const timeStr = `${format(zonedStart, 'h:mm a', { timeZone: TIMEZONE })} - ${format(zonedEnd, 'h:mm a', { timeZone: TIMEZONE })}`;
            console.log(`- **${timeStr}**: ${e.summary}`);
        }
    }
}

main().catch(console.error);

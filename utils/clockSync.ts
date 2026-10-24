import { useState, useEffect } from 'react';

// In-memory clock offset in milliseconds (serverTime - localClientTime)
let clockOffsetMs = 0;
let isClockSynced = false;
let lastSyncTimestamp = 0;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('Clock listener error:', e);
    }
  });
}

/**
 * Performs NTP-style clock synchronization against the central server endpoint.
 */
export async function syncClockWithServer(): Promise<number> {
  const t0 = Date.now();
  try {
    const res = await fetch('/api/time', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) {
      throw new Error(`Time sync failed with HTTP status ${res.status}`);
    }
    const t3 = Date.now();
    const data = await res.json();
    const serverTimestamp =
      typeof data.serverTimestamp === 'number'
        ? data.serverTimestamp
        : new Date(data.serverTime).getTime();

    // Round-trip time (RTT)
    const rtt = t3 - t0;
    // Estimate server time at t3: serverTimestamp + (rtt / 2)
    const estimatedServerTime = serverTimestamp + rtt / 2;
    clockOffsetMs = estimatedServerTime - t3;
    isClockSynced = true;
    lastSyncTimestamp = t3;

    try {
      localStorage.setItem('kurd_server_clock_offset_ms', clockOffsetMs.toString());
    } catch {}

    notifyListeners();
    return clockOffsetMs;
  } catch (error) {
    // If offline or request failed, fallback to stored offset
    try {
      const savedOffset = localStorage.getItem('kurd_server_clock_offset_ms');
      if (savedOffset) {
        clockOffsetMs = parseFloat(savedOffset) || 0;
      }
    } catch {}
    return clockOffsetMs;
  }
}

// Initialize offset from localStorage on module load
try {
  const savedOffset = localStorage.getItem('kurd_server_clock_offset_ms');
  if (savedOffset) {
    clockOffsetMs = parseFloat(savedOffset) || 0;
  }
} catch {}

/**
 * Returns a Date object adjusted for central server time synchronization.
 */
export function getSyncedNow(): Date {
  return new Date(Date.now() + clockOffsetMs);
}

/**
 * Returns current timestamp in ms adjusted for central server synchronization.
 */
export function getSyncedTimestamp(): number {
  return Date.now() + clockOffsetMs;
}

/**
 * Returns an ISO string adjusted for central server synchronization.
 */
export function getSyncedIsoString(): string {
  return getSyncedNow().toISOString();
}

/**
 * Formats a Date or synced now for <input type="datetime-local"> in local timezone.
 */
export function toLocalDateTimeInput(dateInput?: string | Date): string {
  const d = !dateInput
    ? getSyncedNow()
    : typeof dateInput === 'string'
    ? new Date(dateInput)
    : dateInput;

  if (isNaN(d.getTime())) {
    const now = getSyncedNow();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;
  }
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/**
 * Parses user datetime input (either datetime-local or date string)
 * and produces a verified synced ISO string.
 */
export function parseInputDateToIso(val: string): string {
  if (!val) return getSyncedIsoString();
  if (val.includes('T')) {
    const d = new Date(val);
    return isNaN(d.getTime()) ? getSyncedIsoString() : d.toISOString();
  }
  // If only YYYY-MM-DD was provided, combine with synced current time
  try {
    const syncedNow = getSyncedNow();
    const parts = val.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        syncedNow.setFullYear(year, month - 1, day);
      }
    }
    return syncedNow.toISOString();
  } catch {
    return getSyncedIsoString();
  }
}

/**
 * React hook that subscribes to real-time clock pulses (every intervalMs)
 * and central server synchronization state.
 */
export function useSystemClock(intervalMs = 30000) {
  const [syncedDate, setSyncedDate] = useState<Date>(() => getSyncedNow());
  const [isSynced, setIsSynced] = useState<boolean>(isClockSynced);

  useEffect(() => {
    // Initial server sync
    syncClockWithServer().then(() => {
      setSyncedDate(getSyncedNow());
      setIsSynced(true);
    });

    const update = () => {
      setSyncedDate(getSyncedNow());
      setIsSynced(isClockSynced);
    };

    listeners.add(update);

    // Periodic pulse timer for real-time live UI updates
    const timer = setInterval(() => {
      update();
    }, intervalMs);

    // Re-sync on window focus or network reconnect
    const handleSyncTrigger = () => {
      syncClockWithServer().then(update);
    };

    window.addEventListener('focus', handleSyncTrigger);
    window.addEventListener('online', handleSyncTrigger);

    return () => {
      clearInterval(timer);
      listeners.delete(update);
      window.removeEventListener('focus', handleSyncTrigger);
      window.removeEventListener('online', handleSyncTrigger);
    };
  }, [intervalMs]);

  return {
    syncedDate,
    syncedIso: syncedDate.toISOString(),
    clockOffsetMs,
    isSynced,
    getSyncedNow,
    getSyncedIsoString,
    syncClockWithServer,
  };
}

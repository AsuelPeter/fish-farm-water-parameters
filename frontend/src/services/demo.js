// ============================================================
// Demo / simulation data service
// ------------------------------------------------------------
// Provides a fully self-contained data source for the dashboard
// so that the application is functional on Vercel without a
// live backend or MQTT broker. It replays the two-week ESP32
// simulation produced by simulation/simulate.py in compressed
// time (default: 1 simulated hour every 1.5 real seconds).
// ============================================================

import simulation from '../data/simulation.json';

const TICK_MS = 1500;          // real ms per simulated step
const STEP_HOURS = 1;          // simulated hours advanced per tick
const BASE_UTC = Date.UTC(2025, 5, 1, 0, 0, 0); // 2025-06-01
const START_HOUR = 7 * 24;     // begin replay on day 8 so the dashboard is
                               // populated immediately (history + alerts)

const POND_IDS = Object.keys(simulation.ponds);
const MAX_HOUR = Math.max(...POND_IDS.map(p => simulation.ponds[p].series.length));

let cursor = START_HOUR;        // fractional simulated hour index
let timer = null;
const listeners = new Set();
const alertListeners = new Set();
const acknowledged = {};        // pondId -> Set(alertId)
const fired = new Set();        // alertIds already pushed

POND_IDS.forEach(p => { acknowledged[p] = new Set(); });

function isoFor(day, hour) {
    return new Date(BASE_UTC + (day - 1) * 86400000 + hour * 3600000).toISOString();
}

function clockIso(hourIndex) {
    return new Date(BASE_UTC + hourIndex * 3600000).toISOString();
}

function notify() {
    listeners.forEach(cb => {
        try { cb(); } catch (e) { /* noop */ }
    });
}

function tick() {
    cursor += STEP_HOURS;
    if (cursor >= MAX_HOUR) {
        cursor = START_HOUR;
        fired.clear();                       // replay alerts on the next lap
    }
    const idx = Math.floor(cursor);
    POND_IDS.forEach(pid => {
        const pond = simulation.ponds[pid];
        pond.alerts.forEach(a => {
            const aIdx = (a.day - 1) * 24 + Math.floor(a.hour);
            if (aIdx === idx && !fired.has(`${pid}:${a._id}`)) {
                fired.add(`${pid}:${a._id}`);
                const payload = { ...a, pondId: pid, createdAt: isoFor(a.day, a.hour) };
                alertListeners.forEach(cb => {
                    try { cb(payload); } catch (e) { /* noop */ }
                });
            }
        });
    });
    notify();
}

export function startClock() {
    if (timer) return;
    timer = setInterval(tick, TICK_MS);
}

export function onUpdate(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

export function onAlert(cb) {
    alertListeners.add(cb);
    return () => alertListeners.delete(cb);
}

function resolvePond(pid) {
    if (pid && simulation.ponds[pid]) return simulation.ponds[pid];
    return simulation.ponds[POND_IDS[0]];
}

function mix(a, b, f) { return a + (b - a) * f; }

function readingAt(pond) {
    const s = pond.series;
    const i = Math.floor(cursor) % s.length;
    const j = (i + 1) % s.length;
    const f = cursor - Math.floor(cursor);
    const A = s[i], B = s[j];
    return {
        _id: clockIso(Math.floor(cursor)),
        pondId: pond.id,
        ph: +mix(A.ph, B.ph, f).toFixed(2),
        dissolvedOxygen: +mix(A.dissolved_oxygen, B.dissolved_oxygen, f).toFixed(2),
        temperature: +mix(A.temperature, B.temperature, f).toFixed(2),
        turbidity: +mix(A.turbidity, B.turbidity, f).toFixed(1),
        waterLevel: +mix(A.water_level, B.water_level, f).toFixed(3),
        flowRate: A.inlet ? 12.0 : (A.drain ? 10.0 : 0),
        battery: 96,
        signal: -62,
        timestamp: clockIso(Math.floor(cursor)),
        actuators: {
            inletValve: !!A.inlet, drainValve: !!A.drain,
            aerator: !!A.aerator, heater: !!A.heater, feeder: !!A.feeder,
        },
    };
}

function historyFor(pid, period = '24h') {
    const pond = resolvePond(pid);
    const cur = Math.max(1, Math.floor(cursor));
    let n = 24;
    if (period === '1h') n = 1;
    else if (period === '24h') n = 24;
    else if (period === '7d') n = 168;
    else if (period === '30d') n = pond.series.length;
    const start = Math.max(0, cur - n);
    return pond.series.slice(start, cur + 1).map(p => ({
        _id: isoFor(p.day, p.hour),
        avgPH: p.ph,
        avgDO: p.dissolved_oxygen,
        avgTemp: p.temperature,
        avgTurbidity: p.turbidity,
        avgWaterLevel: p.water_level,
        count: 12,
    }));
}

function avg(arr, key) {
    if (!arr.length) return 0;
    return arr.reduce((s, d) => s + (d[key] || 0), 0) / arr.length;
}

function statsFor(pid, period = '24h') {
    const h = historyFor(pid, period);
    const nums = (key) => h.map(d => d[key]).filter(v => typeof v === 'number');
    const rng = (key) => { const v = nums(key); return v.length ? { min: Math.min(...v), max: Math.max(...v) } : { min: 0, max: 0 }; };
    return {
        avgPH: +avg(h, 'avgPH').toFixed(2),
        ...Object.fromEntries(Object.entries(rng('avgPH')).map(([k, v]) => [`${k}PH`, +v.toFixed(2)])),
        avgDO: +avg(h, 'avgDO').toFixed(2),
        ...Object.fromEntries(Object.entries(rng('avgDO')).map(([k, v]) => [`${k}DO`, +v.toFixed(2)])),
        avgTemp: +avg(h, 'avgTemp').toFixed(2),
        ...Object.fromEntries(Object.entries(rng('avgTemp')).map(([k, v]) => [`${k}Temp`, +v.toFixed(2)])),
        avgTurbidity: +avg(h, 'avgTurbidity').toFixed(1),
        avgWaterLevel: +avg(h, 'avgWaterLevel').toFixed(3),
        totalReadings: h.length * 12,
    };
}

function alertsFor(pid, limit = 100) {
    const pond = resolvePond(pid);
    const cur = Math.floor(cursor);
    return pond.alerts
        .filter(a => (a.day - 1) * 24 + Math.floor(a.hour) <= cur)
        .map(a => ({
            ...a,
            createdAt: isoFor(a.day, a.hour),
            acknowledged: acknowledged[pond.id].has(a._id),
        }))
        .sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt))
        .slice(0, limit);
}

function alertStats(pid) {
    const list = alertsFor(pid, 10000);
    const byType = {};
    list.forEach(a => { byType[a.type] = (byType[a.type] || 0) + 1; });
    return byType;
}

// ------------------------------------------------------------
// Axios-like adapter
// ------------------------------------------------------------
function routesGet(url, params = {}) {
    const pid = params.pondId;
    if (url.startsWith('/sensors/latest')) {
        return { success: true, data: readingAt(resolvePond(pid)) };
    }
    if (url.startsWith('/sensors/history')) {
        const data = historyFor(pid, params.period);
        return { success: true, count: data.length, data };
    }
    if (url.startsWith('/sensors/stats')) {
        return { success: true, period: params.period || '24h', data: statsFor(pid, params.period) };
    }
    if (url.startsWith('/sensors')) {
        return { success: true, data: historyFor(pid, '24h') };
    }
    if (url.startsWith('/alerts/stats')) {
        return { success: true, byType: alertStats(pid) };
    }
    if (url.startsWith('/alerts/unacknowledged')) {
        const data = alertsFor(pid).filter(a => !a.acknowledged);
        return { success: true, count: data.length, data };
    }
    if (url.startsWith('/alerts')) {
        const data = alertsFor(pid, params.limit || 100);
        return { success: true, count: data.length, total: data.length, data };
    }
    if (url.startsWith('/actuators/runtime')) {
        const pond = resolvePond(pid);
        return { success: true, data: simulation.summary.per_tank[pond.tank].actuator_runtime_hours_total };
    }
    if (url.startsWith('/dashboard/overview')) {
        return {
            success: true,
            data: {
                ponds: { total: POND_IDS.length },
                devices: { active: 1, total: 1 },
                alerts: { unacknowledged: 0, critical: 0, today: 0 },
                latestReadings: POND_IDS.map(p => readingAt(simulation.ponds[p])),
                summary: simulation.summary,
            },
        };
    }
    return { success: true, data: null };
}

function routesPost(url, body) {
    if (url.startsWith('/actuators/command')) {
        return { success: true, message: `Command '${body.action}' sent to ${body.deviceId}` };
    }
    if (url.startsWith('/actuators/thresholds')) {
        return { success: true, message: `Thresholds updated for ${body.deviceId}` };
    }
    return { success: true, message: 'ok' };
}

function routesPut(url, body) {
    if (url.includes('/acknowledge-all')) {
        POND_IDS.forEach(p => simulation.ponds[p].alerts.forEach(a => acknowledged[p].add(a._id)));
        return { success: true, message: 'All alerts acknowledged' };
    }
    const m = url.match(/\/alerts\/(.+)\/acknowledge/);
    if (m) {
        const id = m[1];
        POND_IDS.forEach(p => {
            if (simulation.ponds[p].alerts.some(a => a._id === id)) acknowledged[p].add(id);
        });
        return { success: true, data: { _id: id, acknowledged: true } };
    }
    return { success: true };
}

export const meta = {
    periodDays: simulation.period_days,
    thresholds: simulation.thresholds,
    summary: simulation.summary,
    ponds: POND_IDS.map(p => ({ id: p, name: simulation.ponds[p].name, tank: simulation.ponds[p].tank })),
};

const demoApi = {
    get: (url, config = {}) => new Promise(resolve =>
        setTimeout(() => resolve({ data: routesGet(url, config.params || {}) }), 60)),
    post: (url, body) => new Promise(resolve =>
        setTimeout(() => resolve({ data: routesPost(url, body || {}) }), 60)),
    put: (url, body) => new Promise(resolve =>
        setTimeout(() => resolve({ data: routesPut(url, body || {}) }), 60)),
    interceptors: { request: { use: () => {} }, response: { use: () => {} } },
};

export default demoApi;

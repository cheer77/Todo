/**
 * TrashTimer — reusable SVG ring countdown timer.
 *
 * A generic countdown component that displays a circular progress ring
 * with remaining time text. Can be used with ANY duration — default is 24h
 * for the Smart Trash feature, but you can pass a custom TTL for other uses.
 *
 * Usage:
 *   import { TrashTimer } from './TrashTimer.js';
 *
 *   // Default 24h timer (Smart Trash)
 *   const el = TrashTimer.render(task.deletedAt);
 *
 *   // Custom 3-hour timer
 *   const el = TrashTimer.render(startTime, 3 * 60 * 60 * 1000);
 *
 *   // Patch existing element
 *   TrashTimer.updateInPlace(el, startTime);          // 24h default
 *   TrashTimer.updateInPlace(el, startTime, 3 * 3600000); // custom TTL
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

// ── Defaults ───────────────────────────────────────────────────────────────────
/** Default time-to-live: 24 hours (matches backend purge interval). */
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

// ── Ring geometry ──────────────────────────────────────────────────────────────
const RING_SIZE          = 18;   // px — outer dimension
const RING_STROKE        = 2;    // px — stroke thickness
const RING_RADIUS        = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Gradient colours (indigo → purple)
const GRADIENT_START = '#6366f1';
const GRADIENT_END   = '#a855f7';

// ── Public API ─────────────────────────────────────────────────────────────────
export class TrashTimer {
    /**
     * Compute remaining time and visual progress.
     *
     * @param  {string|Date} startedAt — when the countdown began (ISO-8601 or Date)
     * @param  {number}      [ttlMs=DEFAULT_TTL_MS] — total countdown duration in ms
     * @return {{ remainingMs: number, fraction: number, label: string }}
     */
    static computeProgress(startedAt, ttlMs = DEFAULT_TTL_MS) {
        const elapsed   = Date.now() - new Date(startedAt).getTime();
        const remaining = Math.max(0, ttlMs - elapsed);
        const fraction  = remaining / ttlMs; // 1 = full, 0 = expired

        const totalMinutes = Math.floor(remaining / 60_000);
        const hours   = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const label   = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        return { remainingMs: remaining, fraction, label };
    }

    /**
     * Create a new timer DOM element (SVG ring + time text).
     *
     * @param  {string} startedAt — ISO-8601 timestamp
     * @param  {number} [ttlMs=DEFAULT_TTL_MS] — total countdown duration in ms
     * @return {HTMLDivElement} .trash-timer container
     */
    static render(startedAt, ttlMs = DEFAULT_TTL_MS) {
        const { fraction, label } = TrashTimer.computeProgress(startedAt, ttlMs);

        // Container
        const container = document.createElement('div');
        container.classList.add('trash-timer');

        // ── SVG ring ───────────────────────────────────────────────────────
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', RING_SIZE);
        svg.setAttribute('height', RING_SIZE);
        svg.setAttribute('viewBox', `0 0 ${RING_SIZE} ${RING_SIZE}`);
        svg.classList.add('trash-timer-ring');

        // Gradient definition
        const defs     = document.createElementNS(SVG_NS, 'defs');
        const gradient = document.createElementNS(SVG_NS, 'linearGradient');
        gradient.setAttribute('id', 'trash-timer-gradient');

        const stop1 = document.createElementNS(SVG_NS, 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', GRADIENT_START);

        const stop2 = document.createElementNS(SVG_NS, 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', GRADIENT_END);

        gradient.append(stop1, stop2);
        defs.appendChild(gradient);
        svg.appendChild(defs);

        // Background track
        const bgCircle = TrashTimer._createCircle('rgba(255,255,255,0.08)');
        svg.appendChild(bgCircle);

        // Progress arc
        const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);
        const progressCircle = TrashTimer._createCircle('url(#trash-timer-gradient)');
        progressCircle.setAttribute('stroke-linecap', 'round');
        progressCircle.setAttribute('stroke-dasharray', RING_CIRCUMFERENCE);
        progressCircle.setAttribute('stroke-dashoffset', dashOffset);
        progressCircle.setAttribute('transform', `rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`);
        progressCircle.classList.add('trash-timer-progress');
        svg.appendChild(progressCircle);

        container.appendChild(svg);

        // ── Time label ─────────────────────────────────────────────────────
        const text = document.createElement('span');
        text.classList.add('trash-timer-text');
        text.textContent = label;
        container.appendChild(text);

        return container;
    }

    /**
     * Patch an existing timer element in the DOM (text + arc progress).
     * Avoids full re-creation for better performance.
     *
     * @param {HTMLElement} timerEl    — the .trash-timer container
     * @param {string}      startedAt — ISO-8601 timestamp
     * @param {number}      [ttlMs=DEFAULT_TTL_MS] — total countdown duration in ms
     */
    static updateInPlace(timerEl, startedAt, ttlMs = DEFAULT_TTL_MS) {
        const { fraction, label } = TrashTimer.computeProgress(startedAt, ttlMs);
        const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);

        const progress = timerEl.querySelector('.trash-timer-progress');
        if (progress) progress.setAttribute('stroke-dashoffset', dashOffset);

        const text = timerEl.querySelector('.trash-timer-text');
        if (text) text.textContent = label;
    }

    // ── Private helpers ────────────────────────────────────────────────────────
    /** Create a configured <circle> element with shared geometry. */
    static _createCircle(stroke) {
        const c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('cx', RING_SIZE / 2);
        c.setAttribute('cy', RING_SIZE / 2);
        c.setAttribute('r', RING_RADIUS);
        c.setAttribute('fill', 'none');
        c.setAttribute('stroke', stroke);
        c.setAttribute('stroke-width', RING_STROKE);
        return c;
    }
}

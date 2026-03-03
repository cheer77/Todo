/**
 * TrashTimer — reusable SVG ring countdown timer for the Smart Trash feature.
 *
 * Displays a circular progress indicator + remaining time text.
 * Used by TaskItem to render timers inside trashed task cards,
 * and by App to patch them every minute without full re-renders.
 *
 * Usage:
 *   import { TrashTimer } from './TrashTimer.js';
 *
 *   const el = TrashTimer.render(task.deletedAt);   // create DOM element
 *   TrashTimer.updateInPlace(el, task.deletedAt);   // patch existing element
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

// ── Configuration ──────────────────────────────────────────────────────────────
/** How long a task lives in the trash before auto-purge (must match backend). */
export const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const RING_SIZE = 18;       // px — outer dimension of the SVG ring
const RING_STROKE = 2;      // px — stroke width
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Gradient colours (indigo → purple)
const GRADIENT_START = '#6366f1';
const GRADIENT_END   = '#a855f7';

// ── Public API ─────────────────────────────────────────────────────────────────
export class TrashTimer {
    /**
     * Compute remaining time and visual progress for a trashed task.
     *
     * @param  {string|Date} deletedAt — ISO-8601 timestamp or Date object
     * @return {{ remainingMs: number, fraction: number, label: string }}
     */
    static computeProgress(deletedAt) {
        const elapsed = Date.now() - new Date(deletedAt).getTime();
        const remaining = Math.max(0, TTL_MS - elapsed);
        const fraction  = remaining / TTL_MS; // 1 = full, 0 = expired

        const totalMinutes = Math.floor(remaining / 60_000);
        const hours   = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const label   = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        return { remainingMs: remaining, fraction, label };
    }

    /**
     * Create a new timer DOM element (SVG ring + time text).
     *
     * @param  {string} deletedAt — ISO-8601 timestamp
     * @return {HTMLDivElement} .trash-timer container
     */
    static render(deletedAt) {
        const { fraction, label } = TrashTimer.computeProgress(deletedAt);

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
     * @param {HTMLElement} timerEl  — the .trash-timer container
     * @param {string}      deletedAt — ISO-8601 timestamp
     */
    static updateInPlace(timerEl, deletedAt) {
        const { fraction, label } = TrashTimer.computeProgress(deletedAt);
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

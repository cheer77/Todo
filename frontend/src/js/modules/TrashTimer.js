/**
 * TrashTimer — reusable, configurable SVG ring countdown timer.
 *
 * A generic countdown component that displays a circular progress ring
 * with remaining time text. Fully customizable: size, colors, stroke, TTL.
 *
 * Usage:
 *   import { TrashTimer } from './TrashTimer.js';
 *
 *   // Default (24h, indigo→purple, 18px)
 *   const el = TrashTimer.render(task.deletedAt);
 *
 *   // Custom 3-hour red timer, bigger ring
 *   const el = TrashTimer.render(startTime, {
 *       ttl: 3 * 60 * 60 * 1000,
 *       size: 24,
 *       stroke: 3,
 *       colors: ['#ef4444', '#f97316']
 *   });
 *
 *   // Patch existing element (must pass same options if non-default)
 *   TrashTimer.updateInPlace(el, startTime);
 *   TrashTimer.updateInPlace(el, startTime, { ttl: 3 * 3600000 });
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

// ── Default configuration ──────────────────────────────────────────────────────
const DEFAULTS = {
    ttl:    24 * 60 * 60 * 1000,  // 24 hours — must match backend purge interval
    size:   18,                    // px — outer SVG dimension
    stroke: 2,                     // px — ring stroke width
    colors: ['#6366f1', '#a855f7'] // gradient [start, end]
};

/** Default TTL exported for external use (e.g. backend config sync). */
export const DEFAULT_TTL_MS = DEFAULTS.ttl;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Merge user options with defaults. */
function _resolveOpts(options = {}) {
    return {
        ttl:    options.ttl    ?? DEFAULTS.ttl,
        size:   options.size   ?? DEFAULTS.size,
        stroke: options.stroke ?? DEFAULTS.stroke,
        colors: options.colors ?? DEFAULTS.colors
    };
}

/** Compute radius and circumference from size & stroke. */
function _ringGeometry(size, stroke) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    return { radius, circumference };
}

/** Create a configured <circle> SVG element. */
function _createCircle(size, radius, stroke, strokeColor) {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', size / 2);
    c.setAttribute('cy', size / 2);
    c.setAttribute('r', radius);
    c.setAttribute('fill', 'none');
    c.setAttribute('stroke', strokeColor);
    c.setAttribute('stroke-width', stroke);
    return c;
}

// ── Public API ─────────────────────────────────────────────────────────────────
export class TrashTimer {
    /**
     * Compute remaining time and visual progress.
     *
     * @param  {string|Date} startedAt — when the countdown began
     * @param  {object}      [options]
     * @param  {number}      [options.ttl=24h] — total countdown duration in ms
     * @return {{ remainingMs: number, fraction: number, label: string }}
     */
    static computeProgress(startedAt, options = {}) {
        const { ttl } = _resolveOpts(options);
        const elapsed   = Date.now() - new Date(startedAt).getTime();
        const remaining = Math.max(0, ttl - elapsed);
        const fraction  = remaining / ttl; // 1 = full, 0 = expired

        const totalSeconds = Math.floor(remaining / 1000);
        const hours   = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let label;
        if (hours > 0) {
            label = `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            label = `${minutes}m ${seconds}s`;
        } else {
            label = `${seconds}s`;
        }

        return { remainingMs: remaining, fraction, label };
    }

    /**
     * Create a new timer DOM element (SVG ring + time text).
     *
     * @param  {string} startedAt — ISO-8601 timestamp
     * @param  {object} [options]
     * @param  {number} [options.ttl=24h]             — countdown duration in ms
     * @param  {number} [options.size=18]              — ring outer size in px
     * @param  {number} [options.stroke=2]             — ring stroke width in px
     * @param  {string[]} [options.colors=['#6366f1','#a855f7']] — gradient [start, end]
     * @return {HTMLDivElement} .trash-timer container
     */
    static render(startedAt, options = {}) {
        const opts = _resolveOpts(options);
        const { size, stroke, colors } = opts;
        const { radius, circumference } = _ringGeometry(size, stroke);
        const { fraction, label } = TrashTimer.computeProgress(startedAt, opts);

        // Container
        const container = document.createElement('div');
        container.classList.add('trash-timer');

        // ── SVG ring ───────────────────────────────────────────────────────
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        svg.classList.add('trash-timer-ring');

        // Gradient definition
        const gradientId = `trash-timer-gradient-${size}-${colors[0].replace('#', '')}`;
        const defs     = document.createElementNS(SVG_NS, 'defs');
        const gradient = document.createElementNS(SVG_NS, 'linearGradient');
        gradient.setAttribute('id', gradientId);

        const stop1 = document.createElementNS(SVG_NS, 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', colors[0]);

        const stop2 = document.createElementNS(SVG_NS, 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', colors[1]);

        gradient.append(stop1, stop2);
        defs.appendChild(gradient);
        svg.appendChild(defs);

        // Background track
        svg.appendChild(_createCircle(size, radius, stroke, 'rgba(255,255,255,0.08)'));

        // Progress arc
        const dashOffset = circumference * (1 - fraction);
        const progressCircle = _createCircle(size, radius, stroke, `url(#${gradientId})`);
        progressCircle.setAttribute('stroke-linecap', 'round');
        progressCircle.setAttribute('stroke-dasharray', circumference);
        progressCircle.setAttribute('stroke-dashoffset', dashOffset);
        progressCircle.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`);
        progressCircle.classList.add('trash-timer-progress');
        svg.appendChild(progressCircle);

        container.appendChild(svg);

        // Store geometry on the container for updateInPlace
        container.dataset.circumference = circumference;

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
     * @param {object}      [options]
     * @param {number}      [options.ttl=24h] — countdown duration in ms
     */
    static updateInPlace(timerEl, startedAt, options = {}) {
        const opts = _resolveOpts(options);
        const { fraction, label } = TrashTimer.computeProgress(startedAt, opts);

        // Read stored circumference (set during render) or recalculate
        const circumference = parseFloat(timerEl.dataset.circumference)
            || _ringGeometry(opts.size, opts.stroke).circumference;

        const dashOffset = circumference * (1 - fraction);

        const progress = timerEl.querySelector('.trash-timer-progress');
        if (progress) progress.setAttribute('stroke-dashoffset', dashOffset);

        const text = timerEl.querySelector('.trash-timer-text');
        if (text) text.textContent = label;
    }
}

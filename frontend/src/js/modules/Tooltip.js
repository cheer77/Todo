export class Tooltip {
    constructor({ target, message, position = 'top', duration = 3000 }) {
        this.target = target;
        this.message = message;
        this.position = position;
        this.duration = duration;
        this.tooltipElement = null;
        this.hideTimeout = null;
    }

    show() {
        // Remove existing tooltip if any
        this.hide();

        // Create tooltip element
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = `tooltip tooltip--${this.position}`;
        this.tooltipElement.textContent = this.message;
        
        // Add to DOM
        document.body.appendChild(this.tooltipElement);

        // Position tooltip
        this.positionTooltip();

        // Trigger animation
        requestAnimationFrame(() => {
            this.tooltipElement.classList.add('tooltip--visible');
        });

        // Auto-hide after duration
        if (this.duration > 0) {
            this.hideTimeout = setTimeout(() => this.hide(), this.duration);
        }

        // Hide on window resize
        this.resizeHandler = () => this.hide();
        window.addEventListener('resize', this.resizeHandler);
    }

    hide() {
        if (this.tooltipElement) {
            this.tooltipElement.classList.remove('tooltip--visible');
            
            // Wait for animation to complete before removing
            setTimeout(() => {
                if (this.tooltipElement && this.tooltipElement.parentNode) {
                    this.tooltipElement.parentNode.removeChild(this.tooltipElement);
                }
                this.tooltipElement = null;
            }, 300); // Match CSS transition duration
        }

        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
    }

    positionTooltip() {
        const targetRect = this.target.getBoundingClientRect();
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        const spacing = 12; // Gap between target and tooltip

        let top, left;

        switch (this.position) {
            case 'top':
                top = targetRect.top - tooltipRect.height - spacing;
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                break;

            case 'bottom':
                top = targetRect.bottom + spacing;
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                break;

            case 'left':
                top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                left = targetRect.left - tooltipRect.width - spacing;
                break;

            case 'right':
                top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
                left = targetRect.right + spacing;
                break;

            default:
                top = targetRect.top - tooltipRect.height - spacing;
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        }

        // Viewport boundary checks
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Horizontal boundary
        if (left < 8) {
            left = 8;
        } else if (left + tooltipRect.width > viewportWidth - 8) {
            left = viewportWidth - tooltipRect.width - 8;
        }

        // Vertical boundary
        if (top < 8) {
            top = 8;
        } else if (top + tooltipRect.height > viewportHeight - 8) {
            top = viewportHeight - tooltipRect.height - 8;
        }

        this.tooltipElement.style.top = `${top}px`;
        this.tooltipElement.style.left = `${left}px`;
    }

    // Static method for quick one-off tooltips
    static show(options) {
        const tooltip = new Tooltip(options);
        tooltip.show();
        return tooltip;
    }
}

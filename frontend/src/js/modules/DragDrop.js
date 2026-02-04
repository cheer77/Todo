export class DragDrop {
    constructor(listElement, onReorder) {
        this.listElement = listElement;
        this.onReorder = onReorder;
        this.dragSrcEl = null;
        
        this.init();
    }

    init() {
        this.listElement.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.listElement.addEventListener('dragend', this.handleDragEnd.bind(this));
        this.listElement.addEventListener('dragover', this.handleDragOver.bind(this));

        // Touch Events
        this.listElement.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.listElement.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.listElement.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    handleDragStart(e) {
        const target = e.target.closest('.task-item');
        if (!target) return;

        this.dragSrcEl = target;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', target.innerHTML); 

        setTimeout(() => {
            target.classList.add('dragging');
        }, 0);
    }


    handleDragEnd(e) {
        const target = e.target.closest('.task-item') || this.dragSrcEl;
        if (target) {
            target.classList.remove('dragging');
        }

        const items = this.listElement.querySelectorAll('.task-item');
        items.forEach(item => item.classList.remove('drag-over-item'));

        this.dragSrcEl = null;
        // Notify controller to update order based on DOM order
        this.onReorder();
    }

    handleDragOver(e) {
        e.preventDefault();
        const afterElement = this.getDragAfterElement(e.clientY);
        const dragging = this.listElement.querySelector('.dragging');
        
        if (dragging) {
            if (afterElement == null) {
                this.listElement.appendChild(dragging);
            } else {
                this.listElement.insertBefore(dragging, afterElement);
            }
        }
    }

    handleTouchStart(e) {
        if (!e.target.closest('.drag-handle')) return;

        const target = e.target.closest('.task-item');
        if (!target) return;
        
        // Prevent scrolling
        document.body.style.overflow = 'hidden';

        this.dragSrcEl = target;
        this.dragSrcEl.classList.add('dragging');

        // Create Clone for visual feedback
        this.clone = target.cloneNode(true);
        this.clone.classList.add('drag-clone');
        // Copy computed styles for width/height integrity
        const rect = target.getBoundingClientRect();
        this.clone.style.width = `${rect.width}px`;
        this.clone.style.height = `${rect.height}px`;
        this.clone.style.position = 'fixed';
        this.clone.style.top = `${rect.top}px`;
        this.clone.style.left = `${rect.left}px`;
        this.clone.style.zIndex = '1000';
        this.clone.style.pointerEvents = 'none'; // click-through
        this.clone.style.opacity = '0.9';
        this.clone.style.transform = 'scale(1.05)';
        this.clone.style.boxShadow = '0 10px 20px rgba(0,0,0,0.5)';
        
        document.body.appendChild(this.clone);
        
        // Calculate offset for smooth dragging (finger relative to items top-left)
        const touch = e.targetTouches[0];
        this.touchOffsetX = touch.clientX - rect.left;
        this.touchOffsetY = touch.clientY - rect.top;
    }

    handleTouchMove(e) {
        if (!this.dragSrcEl || !this.clone) return;
        e.preventDefault();

        const touch = e.targetTouches[0];
        const clientY = touch.clientY;

        // Move Clone
        this.clone.style.top = `${clientY - this.touchOffsetY}px`;
        this.clone.style.left = `${touch.clientX - this.touchOffsetX}px`;

        // Move Placeholder (Original Element)
        const afterElement = this.getDragAfterElement(clientY);
        if (afterElement == null) {
            this.listElement.appendChild(this.dragSrcEl);
        } else {
            this.listElement.insertBefore(this.dragSrcEl, afterElement);
        }
    }

    handleTouchEnd(e) {
        if (this.dragSrcEl) {
            e.preventDefault(); // Only block if we were dragging
            this.dragSrcEl.classList.remove('dragging');
            this.dragSrcEl = null;
        }
        if (this.clone) {
            this.clone.remove();
            this.clone = null;
        }
        document.body.style.overflow = '';
        this.onReorder();
    }

    getDragAfterElement(y) {
        const draggableElements = [...this.listElement.querySelectorAll('.task-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}

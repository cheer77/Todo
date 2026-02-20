export class EditModal {
    static activeModal = null;

    static show({ taskId, currentText, sourceElement, onSave }) {
        // Prevent double-open
        if (EditModal.activeModal) return;

        // Get source position for animation origin
        const sourceRect = sourceElement.getBoundingClientRect();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'edit-modal-overlay';

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'edit-modal';

        // Set transform origin from the task card position
        const centerX = sourceRect.left + sourceRect.width / 2;
        const centerY = sourceRect.top + sourceRect.height / 2;
        modal.style.transformOrigin = `${centerX}px ${centerY}px`;

        modal.innerHTML = `
            <div class="edit-modal-header">
                <h2 class="edit-modal-title">Редактирование</h2>
                <button class="edit-modal-close" aria-label="Close">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <textarea class="edit-modal-textarea" rows="4">${EditModal.escapeHtml(currentText)}</textarea>
            <div class="edit-modal-actions">
                <button class="edit-modal-btn cancel">Отмена</button>
                <button class="edit-modal-btn save">Сохранить</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        EditModal.activeModal = { overlay, modal, taskId };

        // Focus textarea and select text
        const textarea = modal.querySelector('.edit-modal-textarea');
        requestAnimationFrame(() => {
            overlay.classList.add('active');
            modal.classList.add('active');
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        });

        // Event handlers
        const close = () => EditModal.hide();

        const save = () => {
            const newText = textarea.value.trim();
            if (newText && newText !== currentText) {
                onSave(taskId, newText);
            }
            EditModal.hide();
        };

        // Button clicks
        modal.querySelector('.edit-modal-close').addEventListener('click', close);
        modal.querySelector('.edit-modal-btn.cancel').addEventListener('click', close);
        modal.querySelector('.edit-modal-btn.save').addEventListener('click', save);

        // Overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        // Keyboard
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                close();
            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                save();
            }
        };
        document.addEventListener('keydown', handleKeydown);

        // Store handler ref for cleanup
        EditModal.activeModal.handleKeydown = handleKeydown;
    }

    static hide() {
        if (!EditModal.activeModal) return;

        const { overlay, modal, handleKeydown } = EditModal.activeModal;

        // Remove keyboard listener
        document.removeEventListener('keydown', handleKeydown);

        // Animate out
        modal.classList.remove('active');
        modal.classList.add('closing');
        overlay.classList.remove('active');
        overlay.classList.add('closing');

        setTimeout(() => {
            overlay.remove();
            EditModal.activeModal = null;
        }, 300);
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

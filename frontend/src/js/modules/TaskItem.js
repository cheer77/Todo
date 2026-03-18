import { TrashTimer } from './TrashTimer.js';

/**
 * TTL constants for timers (must match main.js values)
 */
const COMPLETION_AUTO_TRASH_MS = 3 * 60 * 1000;  // 3 minutes (testing)
const TRASH_AUTO_DELETE_MS = 5 * 60 * 1000;      // 5 minutes (testing)

// Pre-built SVG templates — created once, cloned per task (avoids repeated HTML parsing)
const _svgNS = 'http://www.w3.org/2000/svg';

function _createSvgTemplate(html, width, height) {
    const tpl = document.createElement('template');
    tpl.innerHTML = `<svg width="${width}" height="${height}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="${_svgNS}">${html}</svg>`;
    return tpl.content.firstElementChild;
}

const DRAG_ICON = _createSvgTemplate(
    '<circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle>',
    12, 12
);

const DELETE_ICON = _createSvgTemplate(
    '<path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    18, 18
);

const EDIT_ICON = _createSvgTemplate(
    '<path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    16, 16
);

const EDITED_ICON = _createSvgTemplate(
    '<path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    10, 10
);

const RESTORE_ICON = _createSvgTemplate(
    '<polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>',
    16, 16
);

export class TaskItem {
    static create(taskObj, onDelete, onToggle, onEdit, options = {}) {
        const isTrash = options.isTrash || false;
        const onRestore = options.onRestore || null;
        const onPermanentDelete = options.onPermanentDelete || null;

        const li = document.createElement('li');
        li.classList.add('task-item');
        if (isTrash) li.classList.add('in-trash');
        if (taskObj.completed) {
            li.classList.add('completed');
        }
        li.setAttribute('draggable', 'false');
        li.dataset.id = taskObj.id;
        if (isTrash && taskObj.deletedAt) {
            li.dataset.deletedAt = taskObj.deletedAt;
        }
        if (!isTrash && taskObj.completed && taskObj.completedAt) {
            li.dataset.completedAt = taskObj.completedAt;
        }

        // Task Content Wrapper (main row)
        const taskContent = document.createElement('div');
        taskContent.classList.add('task-content');

        if (!isTrash) {
            // Drag Handle
            const dragHandle = document.createElement('div');
            dragHandle.classList.add('drag-handle');
            dragHandle.appendChild(DRAG_ICON.cloneNode(true));

            dragHandle.addEventListener('mousedown', () => {
                li.setAttribute('draggable', 'true');
            });
            dragHandle.addEventListener('mouseup', () => {
                li.setAttribute('draggable', 'false');
            });
            dragHandle.addEventListener('mouseleave', () => {
                li.setAttribute('draggable', 'false');
            });

            taskContent.appendChild(dragHandle);

            // Checkbox Container
            const checkboxLabel = document.createElement('label');
            checkboxLabel.classList.add('checkbox-container');
            
            const checkboxInput = document.createElement('input');
            checkboxInput.type = 'checkbox';
            checkboxInput.checked = taskObj.completed;
            
            checkboxInput.addEventListener('change', () => {
                onToggle(taskObj.id, checkboxInput.checked);
                if (checkboxInput.checked) {
                    li.classList.add('completed');
                } else {
                    li.classList.remove('completed');
                }
            });

            const checkmark = document.createElement('span');
            checkmark.classList.add('checkmark');

            checkboxLabel.appendChild(checkboxInput);
            checkboxLabel.appendChild(checkmark);
            taskContent.appendChild(checkboxLabel);

        } else {
            // Timer for trash mode with correct TTL
            const timer = TrashTimer.render(taskObj.deletedAt, {
                ttl: TRASH_AUTO_DELETE_MS,
            });
            taskContent.appendChild(timer);
        }

        // Task Text
        const TEXT_TRUNCATE_LIMIT = 400;
        const isLong = taskObj.text.length > TEXT_TRUNCATE_LIMIT;

        const textWrapper = document.createElement('div');
        textWrapper.classList.add('task-text-wrapper');
        if (isLong) textWrapper.classList.add('truncated');

        const span = document.createElement('span');
        span.classList.add('task-text');
        span.textContent = taskObj.text;
        textWrapper.appendChild(span);

        // Expand/Collapse button for long texts
        let expandBtn = null;
        let expandBtnBottom = null;
        if (isLong) {
            const createExpandBtn = (className) => {
                const btn = document.createElement('button');
                btn.classList.add('expand-btn', className);
                btn.innerHTML = `
                    <span class="expand-btn-text">Show more</span>
                    <svg class="expand-btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                `;
                return btn;
            };

            expandBtn = createExpandBtn('expand-btn-top');
            expandBtnBottom = createExpandBtn('expand-btn-bottom');

            const toggleExpand = (e) => {
                e.stopPropagation();
                const isExpanded = textWrapper.classList.toggle('expanded');
                textWrapper.classList.toggle('truncated', !isExpanded);

                [expandBtn, expandBtnBottom].forEach(btn => {
                    btn.querySelector('.expand-btn-text').textContent = isExpanded ? 'Show less' : 'Show more';
                    btn.classList.toggle('expanded', isExpanded);
                });

                expandBtnBottom.classList.toggle('visible', isExpanded);
            };

            expandBtn.addEventListener('click', toggleExpand);
            expandBtnBottom.addEventListener('click', (e) => {
                toggleExpand(e);
                setTimeout(() => {
                    const taskList = li.closest('.task-list');
                    if (taskList) {
                        taskList.scrollTo({
                            top: li.offsetTop - taskList.offsetTop,
                            behavior: 'smooth'
                        });
                    }
                }, 50);
            });
        }

        taskContent.appendChild(textWrapper);

        if (!isTrash) {
            // Edit Button
            const editBtn = document.createElement('button');
            editBtn.classList.add('edit-btn');
            editBtn.appendChild(EDIT_ICON.cloneNode(true));

            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const currentText = span.textContent;
                onEdit(taskObj.id, currentText, li);
            });

            // Delete Button
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-btn');
            deleteBtn.appendChild(DELETE_ICON.cloneNode(true));
            
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                li.classList.add('removing');
                await onDelete(taskObj.id);
                setTimeout(() => {
                    li.remove();
                }, 300);
            });

            taskContent.appendChild(editBtn);
            taskContent.appendChild(deleteBtn);
        } else {
            // Restore Button for trash mode
            const restoreBtn = document.createElement('button');
            restoreBtn.classList.add('restore-btn');
            restoreBtn.appendChild(RESTORE_ICON.cloneNode(true));

            const restoreLabel = document.createElement('span');
            restoreLabel.textContent = 'Restore';
            restoreBtn.appendChild(restoreLabel);

            restoreBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                li.classList.add('restoring');
                if (onRestore) await onRestore(taskObj.id);
                setTimeout(() => {
                    li.remove();
                }, 350);
            });

            // Permanent Delete Button for trash
            const permDeleteBtn = document.createElement('button');
            permDeleteBtn.classList.add('delete-btn', 'trash-delete-btn');
            permDeleteBtn.appendChild(DELETE_ICON.cloneNode(true));

            permDeleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                li.classList.add('removing');
                if (onPermanentDelete) await onPermanentDelete(taskObj.id);
                setTimeout(() => {
                    li.remove();
                }, 300);
            });

            // Actions wrapper: restore + "or" + delete (vertical stack)
            const actionsWrapper = document.createElement('div');
            actionsWrapper.classList.add('trash-actions');

            actionsWrapper.appendChild(restoreBtn);

            const orDivider = document.createElement('span');
            orDivider.classList.add('trash-actions-or');
            orDivider.textContent = 'or';
            actionsWrapper.appendChild(orDivider);

            actionsWrapper.appendChild(permDeleteBtn);

            taskContent.appendChild(actionsWrapper);
        }

        // Timestamp & Edited Indicator
        const metaContainer = document.createElement('div');
        metaContainer.classList.add('task-meta-container');

        const timestamp = document.createElement('span');
        timestamp.classList.add('task-timestamp');
        if (taskObj.createdAt) {
            const date = new Date(taskObj.createdAt);
            timestamp.textContent = date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        metaContainer.appendChild(timestamp);

        if (taskObj.isEdited) {
            const editedIndicator = document.createElement('span');
            editedIndicator.classList.add('task-edited-indicator');
            editedIndicator.appendChild(EDITED_ICON.cloneNode(true));
            editedIndicator.append(' was edited');
            metaContainer.appendChild(editedIndicator);
        }

        // Completion countdown timer (moved to meta-container)
        if (!isTrash && taskObj.completed && taskObj.completedAt) {
            const countdownEl = document.createElement('div');
            countdownEl.classList.add('completion-countdown');
            const { label } = TrashTimer.computeProgress(taskObj.completedAt, {
                ttl: COMPLETION_AUTO_TRASH_MS,
            });
            countdownEl.textContent = `🗑️ ${label}`;
            metaContainer.appendChild(countdownEl);
        }

        // Completion countdown badge removed - already shown in taskContent above
        // This prevents duplicate timers with conflicting TTL values

        if (expandBtnBottom) li.appendChild(expandBtnBottom);
        li.appendChild(taskContent);
        if (expandBtn) li.appendChild(expandBtn);
        li.appendChild(metaContainer);

        return li;
    }
}

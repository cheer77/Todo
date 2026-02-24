export class TaskItem {
    static create(taskObj, onDelete, onToggle, onEdit) {
        const li = document.createElement('li');
        li.classList.add('task-item');
        if (taskObj.completed) {
            li.classList.add('completed');
        }
        li.setAttribute('draggable', 'false');
        li.dataset.id = taskObj.id; // Store ID for reference

        // Drag Handle
        const dragHandle = document.createElement('div');
        dragHandle.classList.add('drag-handle');
        dragHandle.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="5" r="1"></circle>
                <circle cx="9" cy="12" r="1"></circle>
                <circle cx="9" cy="19" r="1"></circle>
                <circle cx="15" cy="5" r="1"></circle>
                <circle cx="15" cy="12" r="1"></circle>
                <circle cx="15" cy="19" r="1"></circle>
            </svg>
        `;

        // Enable drag only on handle interactions (Desktop)
        dragHandle.addEventListener('mousedown', () => {
            li.setAttribute('draggable', 'true');
        });
        
        dragHandle.addEventListener('mouseup', () => {
            li.setAttribute('draggable', 'false');
        });
        dragHandle.addEventListener('mouseleave', () => {
            li.setAttribute('draggable', 'false');
        });

        // Checkbox Container
        const checkboxLabel = document.createElement('label');
        checkboxLabel.classList.add('checkbox-container');
        
        const checkboxInput = document.createElement('input');
        checkboxInput.type = 'checkbox';
        checkboxInput.checked = taskObj.completed;
        
        checkboxInput.addEventListener('change', (e) => {
            onToggle(taskObj.id, taskObj.completed);
            if (checkboxInput.checked) {
                li.classList.add('completed');
            } else {
                li.classList.remove('completed');
            }
        });
        
        // Remove stopPropagation to allow normal flow (Task active state excluded by target check below)
        // checkboxLabel.addEventListener('click', ...); - removed

        const checkmark = document.createElement('span');
        checkmark.classList.add('checkmark');

        checkboxLabel.appendChild(checkboxInput);
        checkboxLabel.appendChild(checkmark);

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

                // Show/hide bottom button
                expandBtnBottom.classList.toggle('visible', isExpanded);
            };

            expandBtn.addEventListener('click', toggleExpand);
            expandBtnBottom.addEventListener('click', (e) => {
                toggleExpand(e);
                // Scroll the task-list container so this task is at the top
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

        // Edited Indicator
        if (taskObj.isEdited) {
            const editedIndicator = document.createElement('span');
            editedIndicator.classList.add('task-edited-indicator');
            editedIndicator.innerHTML = `
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                was edited
            `;
            metaContainer.appendChild(editedIndicator);
        }

        // Delete Button
        // Toggle active state for delete button visibility on mobile
        li.addEventListener('click', (e) => {
            // If clicking inside checkbox (label/input/span) or delete btn, don't toggle active state
            if (e.target.closest('.checkbox-container') || e.target.closest('.delete-btn') || e.target.closest('.edit-btn') || e.target.closest('.expand-btn')) return;
            
            // Remove active from all others
            document.querySelectorAll('.task-item.active').forEach(item => { // ...
                if (item !== li) item.classList.remove('active');
            });
            
            li.classList.toggle('active');
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-btn');
        deleteBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        
        deleteBtn.addEventListener('click', () => {
            li.classList.add('removing');
            setTimeout(() => {
                onDelete(taskObj.id);
                li.remove();
            }, 300);
        });

        // Edit Button
        const editBtn = document.createElement('button');
        editBtn.classList.add('edit-btn');
        editBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Read current text from DOM, not from closure
            const currentText = span.textContent;
            onEdit(taskObj.id, currentText, li);
        });

        // Task Content Wrapper (main row)
        const taskContent = document.createElement('div');
        taskContent.classList.add('task-content');
        taskContent.appendChild(dragHandle);
        taskContent.appendChild(checkboxLabel);
        taskContent.appendChild(textWrapper);
        taskContent.appendChild(editBtn);
        taskContent.appendChild(deleteBtn);

        if (expandBtnBottom) li.appendChild(expandBtnBottom);
        li.appendChild(taskContent);
        if (expandBtn) li.appendChild(expandBtn);
        li.appendChild(metaContainer);

        return li;
    }
}

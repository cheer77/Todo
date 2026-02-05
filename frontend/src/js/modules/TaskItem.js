export class TaskItem {
    static create(taskObj, onDelete, onToggle) {
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
        const span = document.createElement('span');
        span.classList.add('task-text');
        span.textContent = taskObj.text;

        // Timestamp
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

        // Delete Button
        // Toggle active state for delete button visibility on mobile
        li.addEventListener('click', (e) => {
            // If clicking inside checkbox (label/input/span) or delete btn, don't toggle active state
            if (e.target.closest('.checkbox-container') || e.target.closest('.delete-btn')) return;
            
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

        // Task Content Wrapper (main row)
        const taskContent = document.createElement('div');
        taskContent.classList.add('task-content');
        taskContent.appendChild(dragHandle);
        taskContent.appendChild(checkboxLabel);
        taskContent.appendChild(span);
        taskContent.appendChild(deleteBtn);

        li.appendChild(taskContent);
        li.appendChild(timestamp);

        return li;
    }
}

export class Skeleton {
    static render(container, count = 3) {
        // Clear container first to avoid duplicates if called multiple times
        // actually, we might want to append? validation plan said clear/render logic in main. 
        // Let's just create the HTML string.
        
        const skeletonHTML = Array(count).fill(0).map(() => `
            <li class="skeleton-card">
                <div class="skeleton-checkbox"></div>
                <div class="skeleton-content">
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text short"></div>
                </div>
            </li>
        `).join('');
        
        container.innerHTML = skeletonHTML;
    }

    static clear(container) {
        // Check if the container only contains skeletons before clearing, 
        // to avoid accidentally clearing real tasks if we're not careful.
        // But for this use case, we usually replace the whole list content.
        // So we can assume the container manages its own state or we just clear it all.
        // The prompt says "When data loads -> skeleton hides and real cards render".
        // So clearing innerHTML is fine as we will re-render tasks immediately after.
        container.innerHTML = ''; 
    }
}

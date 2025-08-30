// WHATWG Spec Table of Contents Extension
(function() {
    'use strict';

    // Check if TOC already exists to avoid duplicates
    if (document.getElementById('whatwg-toc-extension')) {
        return;
    }

    // Function to extract headings and create TOC
    function createTOC() {
        // Get all headings (h1-h6) that have an id attribute
        const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
        
        if (headings.length === 0) {
            console.log('No headings with IDs found on this page');
            return;
        }

        // Create TOC container
        const tocContainer = document.createElement('div');
        tocContainer.id = 'whatwg-toc-extension';
        tocContainer.className = 'whatwg-toc-container';

        // Create TOC header
        const tocHeader = document.createElement('div');
        tocHeader.className = 'whatwg-toc-header';
        tocHeader.innerHTML = `
            <span class="whatwg-toc-title">目次</span>
            <div class="whatwg-toc-controls">
                <button class="whatwg-toc-position" title="位置を変更">⌖</button>
                <button class="whatwg-toc-toggle" title="目次を閉じる/開く">−</button>
            </div>
        `;

        // Create TOC content
        const tocContent = document.createElement('div');
        tocContent.className = 'whatwg-toc-content';

        // Create TOC list
        const tocList = document.createElement('ul');
        tocList.className = 'whatwg-toc-list';

        headings.forEach((heading) => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            
            // Set link properties
            link.href = `#${heading.id}`;
            link.textContent = heading.textContent.trim();
            link.className = `whatwg-toc-link whatwg-toc-${heading.tagName.toLowerCase()}`;
            
            // Store original heading reference for translation updates
            link.dataset.headingId = heading.id;
            
            // Add click handler for smooth scrolling
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.getElementById(heading.id);
                if (target) {
                    target.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                    // Update URL hash
                    history.pushState(null, null, `#${heading.id}`);
                }
            });

            listItem.appendChild(link);
            tocList.appendChild(listItem);
        });

        // Assemble TOC
        tocContent.appendChild(tocList);
        tocContainer.appendChild(tocHeader);
        tocContainer.appendChild(tocContent);

        // Position management
        let currentPosition = localStorage.getItem('whatwg-toc-position') || 'top-left';
        
        function applyPosition(position) {
            // Reset all position classes
            tocContainer.classList.remove('pos-top-right', 'pos-top-left', 'pos-bottom-right', 'pos-bottom-left');
            
            // Apply new position
            tocContainer.classList.add(`pos-${position}`);
            currentPosition = position;
            localStorage.setItem('whatwg-toc-position', position);
            
            console.log(`Position changed to: ${position}`);
        }
        
        // Apply saved position
        applyPosition(currentPosition);

        // Add position cycling functionality
        const positionButton = tocHeader.querySelector('.whatwg-toc-position');
        const positions = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
        
        if (positionButton) {
            positionButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const currentIndex = positions.indexOf(currentPosition);
                const nextIndex = (currentIndex + 1) % positions.length;
                applyPosition(positions[nextIndex]);
            });
        }

        // Add toggle functionality
        const toggleButton = tocHeader.querySelector('.whatwg-toc-toggle');
        let isCollapsed = localStorage.getItem('whatwg-toc-collapsed') === 'true';

        function updateToggleState() {
            tocContent.style.display = isCollapsed ? 'none' : 'block';
            toggleButton.textContent = isCollapsed ? '+' : '−';
            tocContainer.classList.toggle('collapsed', isCollapsed);
            localStorage.setItem('whatwg-toc-collapsed', isCollapsed);
        }
        
        // Apply saved collapse state
        updateToggleState();

        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            isCollapsed = !isCollapsed;
            updateToggleState();
        });

        // Add drag functionality
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        tocHeader.addEventListener('mousedown', (e) => {
            // Don't start dragging if clicking on buttons
            if (e.target.closest('.whatwg-toc-position') || e.target.closest('.whatwg-toc-toggle')) {
                return;
            }
            
            isDragging = true;
            dragOffset.x = e.clientX - tocContainer.offsetLeft;
            dragOffset.y = e.clientY - tocContainer.offsetTop;
            tocContainer.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            
            // Keep within viewport bounds
            const maxX = window.innerWidth - tocContainer.offsetWidth;
            const maxY = window.innerHeight - tocContainer.offsetHeight;
            
            tocContainer.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
            tocContainer.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
            tocContainer.style.right = 'auto';
            tocContainer.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                tocContainer.style.cursor = 'auto';
            }
        });

        // Translation support - update TOC when text changes
        function updateTocTranslations() {
            const tocLinks = tocContainer.querySelectorAll('.whatwg-toc-link');
            tocLinks.forEach(link => {
                const headingId = link.dataset.headingId;
                const heading = document.getElementById(headingId);
                if (heading && heading.textContent.trim() !== link.textContent.trim()) {
                    link.textContent = heading.textContent.trim();
                }
            });
        }

        // Monitor for translation changes
        const translationObserver = new MutationObserver(() => {
            updateTocTranslations();
        });

        // Observe the document for text changes (translation)
        translationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // Scroll position tracking and active link highlighting
        function updateActiveLink() {
            const tocLinks = tocContainer.querySelectorAll('.whatwg-toc-link');
            const currentScrollY = window.scrollY;
            const windowHeight = window.innerHeight;
            
            let activeHeading = null;
            let closestDistance = Infinity;
            
            // Find the heading that's currently most visible
            headings.forEach(heading => {
                const rect = heading.getBoundingClientRect();
                const elementTop = rect.top + currentScrollY;
                
                // Calculate distance from current scroll position
                // Prefer headings that are at the top of the viewport or just above it
                let distance;
                if (rect.top <= 100 && rect.top >= -100) {
                    // Heading is near the top of viewport (preferred)
                    distance = Math.abs(rect.top);
                } else if (rect.top > 100) {
                    // Heading is below viewport
                    distance = rect.top + 1000; // Penalty for being below
                } else {
                    // Heading is above viewport
                    distance = Math.abs(rect.top) + 500; // Smaller penalty for being above
                }
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    activeHeading = heading;
                }
            });
            
            // Update active states
            tocLinks.forEach(link => {
                link.classList.remove('active');
                if (activeHeading && link.dataset.headingId === activeHeading.id) {
                    link.classList.add('active');
                    
                    // Scroll the active link into view within the TOC
                    const tocContent = tocContainer.querySelector('.whatwg-toc-content');
                    const linkRect = link.getBoundingClientRect();
                    const tocRect = tocContent.getBoundingClientRect();
                    
                    if (linkRect.top < tocRect.top || linkRect.bottom > tocRect.bottom) {
                        link.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center'
                        });
                    }
                }
            });
        }
        
        // Track scroll position and hash changes
        let scrollTimeout;
        function handleScroll() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(updateActiveLink, 50); // Throttle scroll events
        }
        
        function handleHashChange() {
            setTimeout(updateActiveLink, 100); // Small delay to let scroll complete
        }
        
        // Add event listeners
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('hashchange', handleHashChange);
        
        // Initial active link update
        setTimeout(updateActiveLink, 500);

        // Insert TOC into page
        document.body.appendChild(tocContainer);

        console.log(`WHATWG TOC Extension: Created TOC with ${headings.length} headings`);
    }

    // Create TOC when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createTOC);
    } else {
        createTOC();
    }

    // Recreate TOC if page content changes (for dynamic content)
    const observer = new MutationObserver((mutations) => {
        let shouldRecreate = false;
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        node.matches && 
                        node.matches('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')) {
                        shouldRecreate = true;
                    }
                });
            }
        });
        
        if (shouldRecreate) {
            const existingToc = document.getElementById('whatwg-toc-extension');
            if (existingToc) {
                existingToc.remove();
            }
            setTimeout(createTOC, 100);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
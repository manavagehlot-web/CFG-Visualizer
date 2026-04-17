(function() {
    // Check local storage for theme preference immediately (prevents flash of wrong theme)
    const storedTheme = localStorage.getItem('cfg-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
        document.documentElement.classList.add('dark-theme');
    } else {
        document.documentElement.classList.remove('dark-theme');
    }

    // Wait for DOM to attach listener to the toggle button
    window.addEventListener('DOMContentLoaded', () => {
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (!themeBtn) return;

        // Set initial icon based on current correct theme
        updateThemeIcon(themeBtn);

        themeBtn.addEventListener('click', () => {
            const isDark = document.documentElement.classList.contains('dark-theme');
            if (isDark) {
                document.documentElement.classList.remove('dark-theme');
                localStorage.setItem('cfg-theme', 'light');
            } else {
                document.documentElement.classList.add('dark-theme');
                localStorage.setItem('cfg-theme', 'dark');
            }
            updateThemeIcon(themeBtn);
        });
    });

    function updateThemeIcon(btn) {
        if (document.documentElement.classList.contains('dark-theme')) {
            btn.textContent = '☀️'; // Switch to light
            btn.title = 'Switch to Light Mode';
        } else {
            btn.textContent = '🌙'; // Switch to dark
            btn.title = 'Switch to Dark Mode';
        }
    }
})();

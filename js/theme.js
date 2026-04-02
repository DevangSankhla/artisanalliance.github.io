(function() {
    const savedTheme = localStorage.getItem('theme');
    
    // Default to dark mode
    if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark');
    }

    window.toggleTheme = function() {
        const html = document.documentElement;
        const isDark = html.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (typeof window.updateNavbar === 'function') {
            window.updateNavbar();
        }
    };
})();

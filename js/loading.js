// Create and show loading screen
function createLoadingScreen() {
    // Only show loading screen on index page
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
        return;
    }

    const loadingScreen = document.createElement('div');
    loadingScreen.className = 'loading-screen';
    
    loadingScreen.innerHTML = `
        <div class="loading-content">
            <h1>Disclaimer</h1>
            <p>This website is created purely for educational purposes to help students and my friends easily access study materials for exam preparation. My goal is to assist and support, not to mislead anyone. I'm just trying to lend a helping hand!</p>
            <p>No one has the right to blame me under any condition. I am not responsible for anything that happens—students are fully responsible for themselves, their actions, and how they use the materials provided here. There's no involvement on my part beyond offering this platform. Use it at your own risk, and let's keep the focus on learning and helping each other out!</p>
        </div>
    `;
    
    document.body.appendChild(loadingScreen);
    
    // Remove loading screen after 3 seconds
    setTimeout(() => {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.remove();
        }, 500);
    }, 3000);
}

// Initialize loading screen when DOM is loaded
document.addEventListener('DOMContentLoaded', createLoadingScreen); 
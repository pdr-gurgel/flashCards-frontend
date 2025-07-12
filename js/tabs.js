/**
 * Gerenciamento das tabs de login e registro
 */
export function initTabs() {
    // Elementos de tab
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    
    // Formulários
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    // Função para trocar entre os tabs
    function switchTab(activeTab, activeForm, inactiveTab, inactiveForm) {
        activeTab.classList.add('active');
        activeForm.classList.add('active');
        inactiveTab.classList.remove('active');
        inactiveForm.classList.remove('active');
    }
    
    // Event listeners para os tabs
    loginTab.addEventListener('click', () => {
        switchTab(loginTab, loginForm, registerTab, registerForm);
    });
    
    registerTab.addEventListener('click', () => {
        switchTab(registerTab, registerForm, loginTab, loginForm);
    });
}

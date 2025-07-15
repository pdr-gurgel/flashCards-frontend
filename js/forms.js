/**
 * Gerenciamento dos formulários de login e registro
 */
import { showNotification } from './notifications.js';
import axios from 'axios';

// Verificar se a função foi importada corretamente
console.log('showNotification importada:', typeof showNotification);

// URL base da API (ajuste conforme necessário)
const API_BASE_URL = 'http://localhost:3001';

// Configuração base do axios
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export function initForms() {
    // Formulários (containers)
    const loginFormContainer = document.getElementById('login-form');
    const registerFormContainer = document.getElementById('register-form');
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    
    // Verificar se os elementos existem
    if (!loginFormContainer || !registerFormContainer) {
        console.error('Erro: Containers de formulários não encontrados');
        return;
    }
    
    if (!loginTab || !registerTab) {
        console.error('Erro: Tabs de formulários não encontrados');
    }

    // Formulários (elementos form)
    const loginForm = loginFormContainer.querySelector('form');
    const registerForm = registerFormContainer.querySelector('form');
    
    // Verificar se os formulários existem
    if (!loginForm || !registerForm) {
        console.error('Erro: Elementos de formulários não encontrados');
        return;
    }

    // Manipulador para o formulário de login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const loginButton = loginForm.querySelector('button[type="submit"]');
        
        if (!emailInput || !passwordInput || !loginButton) {
            showNotification('Erro: Campos de formulário não encontrados', 'error');
            return;
        }
        
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            showNotification('Email e senha são obrigatórios.', 'error');
            return;
        }

        // Desativa o botão e mostra estado de carregamento
        loginButton.disabled = true;
        loginButton.textContent = 'Entrando...';

        try {
            const response = await api.post('/login', { email, password });
            const data = response.data;

            // Armazena o token JWT e informações do usuário (usando chaves consistentes)
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            showNotification('Login bem-sucedido!', 'success');

            // Redireciona para a página de dashboard após login
            setTimeout(() => {
                window.location.href = 'dashboard.html'; // Ajuste o nome da página conforme necessário
            }, 1000);

        } catch (error) {
            console.error('Erro no login:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Credenciais inválidas. Tente novamente.';
            showNotification(errorMsg, 'error');
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'Entrar';
        }
    });

    // Manipulador para o formulário de registro
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById('register-name');
        const emailInput = document.getElementById('register-email');
        const passwordInput = document.getElementById('register-password');
        const confirmPasswordInput = document.getElementById('register-confirm-password');
        const registerButton = registerForm.querySelector('button[type="submit"]');
        
        // Verificar se todos os campos existem
        if (!usernameInput || !emailInput || !passwordInput || !confirmPasswordInput || !registerButton) {
            showNotification('Erro: Campos de formulário não encontrados', 'error');
            return;
        }
        
        const username = usernameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validações
        if (!username || !email || !password || !confirmPassword) {
            showNotification('Todos os campos são obrigatórios.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showNotification('As senhas não coincidem!', 'error');
            return;
        }

        if (password.length < 8) {
            showNotification('A senha deve ter pelo menos 8 caracteres.', 'error');
            return;
        }

        // Desativa o botão e mostra estado de carregamento
        registerButton.disabled = true;
        registerButton.textContent = 'Criando conta...';

        try {
            const response = await api.post('/register', { username, email, password });
            const data = response.data;

            showNotification('Conta criada com sucesso! Faça login para continuar.', 'success');

            // Limpar o formulário
            registerForm.reset();

            // Alternar para o formulário de login após o registro bem-sucedido
            setTimeout(() => {
                switchTab(loginTab, loginForm, registerTab, registerForm);
            }, 2000);

        } catch (error) {
            console.error('Erro no registro:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Erro ao criar conta. Tente novamente.';
            showNotification(errorMsg, 'error');
        } finally {
            registerButton.disabled = false;
            registerButton.textContent = 'Criar Conta';
        }
    });

    // Função para trocar entre os tabs (duplicada de tabs.js para evitar dependência circular)
    function switchTab(activeTab, activeForm, inactiveTab, inactiveForm) {
        // Verificar se todos os elementos existem antes de manipular classes
        if (!activeTab || !activeForm || !inactiveTab || !inactiveForm) {
            console.error('Erro: Elementos não encontrados para alternância de tabs');
            return;
        }
        
        activeTab.classList.add('active');
        activeForm.classList.add('active');
        inactiveTab.classList.remove('active');
        inactiveForm.classList.remove('active');
    }
}

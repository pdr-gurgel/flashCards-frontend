/**
 * Gerenciamento dos formulários de login e registro
 */
import { showNotification } from './notifications.js';
import axios from 'axios';

// Verificar se a função foi importada corretamente
console.log('showNotification importada:', typeof showNotification);

// URL base da API (ajuste conforme necessário)
const API_BASE_URL = 'https://flashcards-backend-0hpf.onrender.com';

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

    // Formulários (elementos form)
    const loginForm = loginFormContainer.querySelector('form');
    const registerForm = registerFormContainer.querySelector('form');

    // Manipulador para o formulário de login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const loginButton = loginForm.querySelector('button[type="submit"]');

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

            // Armazena o token JWT e informações do usuário
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

        const username = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const registerButton = registerForm.querySelector('button[type="submit"]');

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
        activeTab.classList.add('active');
        activeForm.classList.add('active');
        inactiveTab.classList.remove('active');
        inactiveForm.classList.remove('active');
    }
}

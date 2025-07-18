/**
 * Gerenciamento de autenticação e proteção de rotas
 */

// Verifica se o usuário está autenticado
export function isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token; // Retorna true se o token existe
}

// Obtém o usuário atual
export function getCurrentUser() {
    try {
        const userString = localStorage.getItem('user');
        if (!userString) {
            return null;
        }
        return JSON.parse(userString);
    } catch (error) {
        console.error('Erro ao recuperar usuário:', error);
        return null;
    }
}

// Obtém o token JWT
export function getToken() {
    return localStorage.getItem('token');
}

// Função para logout
export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html#login'; // Redireciona para a página inicial na seção de login
}

// Proteção de rota - redireciona para login se não autenticado
export function protectRoute() {
    try {
        if (!isAuthenticated()) {
            // Redireciona apenas se não estiver autenticado, com tratamento de erro
            window.location.href = 'index.html#login';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Erro na verificação de autenticação:', error);
        // Em caso de erro, mantém o usuário na página atual
        return true;
    }
}

// Adiciona o token de autenticação ao cabeçalho de requisições fetch
export async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    
    if (!token) {
        throw new Error('Usuário não autenticado');
    }
    
    const headers = {
        ...options.headers || {},
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    // Se receber erro 401 (não autorizado), desloga o usuário
    if (response.status === 401) {
        logout();
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }
    
    return response;
}

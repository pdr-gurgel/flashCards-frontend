// Study.js - Sistema de estudos com algoritmo SM-2
// Importar estilos CSS para o build com Vite
import '../css/dashboard.css';
import '../css/study.css';

// Importar funções compartilhadas
import { initTheme, toggleTheme } from './theme.js';
import { protectRoute, getCurrentUser, logout, getToken } from './auth.js';
import { showNotification } from './notifications.js';
import axios from 'axios';

const API_BASE_URL = 'https://flashcards-backend-ejyn.onrender.com';

// Estado da aplicação
let currentSession = null;
let currentCardIndex = 0;
let sessionCards = [];
let isCardFlipped = false;

document.addEventListener('DOMContentLoaded', async function () {
    // Verificar autenticação
    if (!protectRoute()) {
        return; // Redireciona para o login se não estiver autenticado
    }

    // Inicializar o tema
    initTheme();

    // Obter informações do usuário atual
    const currentUser = getCurrentUser() || {};

    // Verificar token antes de configurar API
    const currentToken = getToken();
    console.log('🔑 Token encontrado:', currentToken ? 'SIM' : 'NÃO');

    if (!currentToken) {
        console.error('❌ Token não encontrado! Redirecionando para login...');
        logout();
        return;
    }

    // Configurar API
    const api = axios.create({
        baseURL: API_BASE_URL,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`
        }
    });

    // Interceptor para adicionar o token JWT
    api.interceptors.request.use(
        (config) => {
            const token = getToken();
            console.log('🔄 Interceptor: Token presente?', token ? 'SIM' : 'NÃO');
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
                console.log('📤 Enviando requisição para:', config.url);
            }
            return config;
        },
        (error) => {
            console.error('❌ Erro no interceptor de requisição:', error);
            return Promise.reject(error);
        }
    );

    // Interceptor para resposta
    api.interceptors.response.use(
        (response) => {
            console.log('📥 Resposta recebida:', response.status, response.config.url);
            return response;
        },
        (error) => {
            console.error('❌ Erro na resposta:', error.response?.status, error.config?.url);
            if (error.response?.status === 401) {
                console.log('🔒 Token expirado, fazendo logout...');
                logout();
            }
            return Promise.reject(error);
        }
    );

    // Configurar elementos da interface
    setupUserInterface(currentUser);
    setupEventListeners(api);

    // Carregar dados iniciais
    await loadInitialData(api);
});

/**
 * Configura a interface do usuário
 */
function setupUserInterface(currentUser) {
    // Atualizar informações do usuário na interface
    const userNameElements = document.querySelectorAll('.user-name-display');
    const userInitial = document.querySelector('.user-initial');

    if (currentUser && currentUser.name) {
        userNameElements.forEach(element => {
            element.textContent = currentUser.name;
        });

        if (userInitial) {
            userInitial.textContent = currentUser.name.charAt(0).toUpperCase();
        }
    }

    // Exibir data atual
    const dateDisplay = document.querySelector('.date-display');
    if (dateDisplay) {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(now);
        const year = now.getFullYear();
        const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(now);
        dateDisplay.innerHTML = `<strong>${weekday}</strong>, ${day} ${month} ${year}`;
    }
}

/**
 * Configura event listeners
 */
function setupEventListeners(api) {
    // Botões de tema e logout
    const themeToggle = document.getElementById('theme-toggle');
    const logoutBtn = document.getElementById('logout-btn');

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            logout();
        });
    }

    // Navegação
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const page = this.dataset.page;

            if (page === 'dashboard') {
                window.location.href = 'dashboard.html';
            } else if (page === 'decks') {
                window.location.href = 'decks.html';
            } else if (page === 'cards') {
                window.location.href = 'cards.html';
            } else if (page === 'study') {
                // Já estamos na página de estudo
                return;
            } else if (page === 'pomodoro') {
                // TODO: Implementar página de pomodoro
                console.log('Página de pomodoro ainda não implementada');
            }
        });
    });

    // Botões de ação principais
    const startStudyBtn = document.getElementById('start-study-btn');
    const viewStatsBtn = document.getElementById('view-stats-btn');
    const endSessionBtn = document.getElementById('end-session-btn');

    if (startStudyBtn) {
        startStudyBtn.addEventListener('click', () => openSessionConfigModal(api));
    }

    if (viewStatsBtn) {
        viewStatsBtn.addEventListener('click', () => openStatsModal(api));
    }

    if (endSessionBtn) {
        endSessionBtn.addEventListener('click', endStudySession);
    }

    // Flashcard
    const flashcard = document.getElementById('flashcard');
    const showAnswerBtn = document.getElementById('show-answer-btn');

    if (flashcard) {
        flashcard.addEventListener('click', flipCard);
    }

    if (showAnswerBtn) {
        showAnswerBtn.addEventListener('click', flipCard);
    }

    // Botões de dificuldade
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    difficultyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const difficulty = parseInt(e.currentTarget.dataset.difficulty);
            handleDifficultySelection(api, difficulty);
        });
    });

    // Modais
    setupModalListeners(api);
}

/**
 * Configura listeners dos modais
 */
function setupModalListeners(api) {
    // Modal de configuração de sessão
    const sessionConfigModal = document.getElementById('session-config-modal');
    const confirmStartStudyBtn = document.getElementById('confirm-start-study');

    if (confirmStartStudyBtn) {
        confirmStartStudyBtn.addEventListener('click', () => startStudySession(api));
    }

    // Modal de estatísticas
    const statsModal = document.getElementById('stats-modal');

    // Fechamento de modais
    const modalCloseButtons = document.querySelectorAll('.modal-close, .cancel-modal');
    const modalOverlays = document.querySelectorAll('.modal-overlay');

    modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    modalOverlays.forEach(overlay => {
        overlay.addEventListener('click', closeModals);
    });

    // Escape key para fechar modais
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModals();
        }
    });

    // Modal "revisar mesmo assim"
    const reviewAnywayBtn = document.getElementById('confirm-review-anyway');
    if (reviewAnywayBtn) {
        reviewAnywayBtn.addEventListener('click', async () => {
            console.log('⚪ Confirmado: Revisar mesmo assim');
            // Usa os valores atuais do modal de sessão
            const deckId = document.getElementById('session-deck')?.value || '';
            const limit = document.getElementById('session-limit')?.value || 20;

            try {
                closeModals();
                const endpoint = deckId
                    ? `/study/session/${deckId}?limit=${limit}&forceAll=true`
                    : `/study/session?limit=${limit}&forceAll=true`;
                console.log('📡 Forçando revisão via endpoint:', endpoint);
                const apiInstance = axios.create({
                    baseURL: API_BASE_URL,
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` }
                });
                const resp = await apiInstance.get(endpoint);
                const sessionData = resp.data.data;
                console.log('✅ Sessão forçada recebida:', sessionData);

                if (!sessionData || !Array.isArray(sessionData.cards) || sessionData.cards.length === 0) {
                    showNotification('Mesmo forçando, não há cards para revisar neste contexto.', 'warning');
                    return;
                }
                currentSession = sessionData.session;
                sessionCards = sessionData.cards;
                currentCardIndex = 0;
                isCardFlipped = false;
                showStudyInterface();
                showCurrentCard();
                showNotification(`Revisão iniciada com ${sessionData.totalCards} cards`, 'success');
            } catch (err) {
                console.error('Erro ao iniciar revisão forçada:', err);
                showNotification('Erro ao iniciar revisão', 'error');
            }
        });
    }
}

/**
 * Carrega dados iniciais da página
 */
async function loadInitialData(api) {
    console.log('🚀 Iniciando carregamento de dados...');

    try {
        // Carregar estatísticas gerais
        await loadGeneralStats(api);

        // Carregar progresso dos decks
        await loadDecksProgress(api);

        // Carregar decks para o modal de sessão
        await loadDecksForSession(api);

        console.log('✅ Todos os dados carregados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao carregar dados iniciais:', error);
        console.log('🔄 Carregando dados de fallback...');
        loadFallbackData();
    }
}

/**
 * Carrega estatísticas gerais
 */
async function loadGeneralStats(api) {
    console.log('🔄 Carregando estatísticas gerais...');

    try {
        console.log('📡 Fazendo chamada para /study/stats');
        const response = await api.get('/study/stats');
        console.log('✅ Resposta recebida:', response.data);

        const stats = response.data.data.stats;
        console.log('📊 Estatísticas extraídas:', stats);

        // Atualizar elementos da interface
        updateElement('cards-due', stats.cards_due || 0);
        updateElement('cards-learned', stats.cards_learned || 0);
        updateElement('cards-today', stats.cards_studied_today || 0);

        // Calcular taxa de sucesso (baseada no ease_factor médio)
        let successRate = 0;
        if (stats.avg_ease_factor && stats.total_cards_studied > 0) {
            // Só calcular taxa de sucesso se houver cards estudados
            successRate = Math.round((stats.avg_ease_factor - 1.3) / (2.5 - 1.3) * 100);
            successRate = Math.max(0, Math.min(100, successRate));
        }
        updateElement('success-rate', `${successRate}%`);

        console.log('✅ Estatísticas carregadas com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao carregar estatísticas gerais:', error);
        console.log('🔍 Detalhes do erro:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            config: error.config
        });

        // Valores padrão em caso de erro
        updateElement('cards-due', '0');
        updateElement('cards-learned', '0');
        updateElement('cards-today', '0');
        updateElement('success-rate', '0%');

        throw error; // Re-throw para que loadFallbackData seja chamada
    }
}

/**
 * Carrega progresso dos decks
 */
async function loadDecksProgress(api) {
    try {
        // Primeiro, buscar todos os decks do usuário
        const decksResponse = await api.get('/decks');
        console.log('📦 Resposta dos decks:', decksResponse.data);
        const decks = decksResponse.data;

        const progressGrid = document.getElementById('progress-grid');

        if (decks.length === 0) {
            progressGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open empty-icon"></i>
                    <h4>Nenhum deck encontrado</h4>
                    <p>Crie um deck para começar a estudar</p>
                </div>
            `;
            return;
        }

        // Buscar progresso de cada deck
        const progressPromises = decks.map(async (deck) => {
            console.log(`🔄 Carregando progresso do deck: ${deck.title} (ID: ${deck.id})`);
            try {
                const progressResponse = await api.get(`/study/decks/${deck.id}/progress`);
                console.log(`✅ Progresso carregado para ${deck.title}:`, progressResponse.data);
                console.log(`🎨 Dados do deck retornados:`, progressResponse.data.data.deck);
                return {
                    deck: progressResponse.data.data.deck,
                    progress: progressResponse.data.data.progress
                };
            } catch (error) {
                console.error(`❌ Erro ao carregar progresso do deck ${deck.title} (ID: ${deck.id}):`, error);
                return {
                    deck: deck,
                    progress: {
                        total_cards: 0,
                        studied_cards: 0,
                        learned_cards: 0,
                        due_cards: 0,
                        completion_rate: 0
                    }
                };
            }
        });

        const progressData = await Promise.all(progressPromises);

        // Renderizar cards de progresso
        progressGrid.innerHTML = progressData.map(({ deck, progress }) => {
            // Garantir valores padrão para evitar undefined
            const totalCards = progress?.total_cards || 0;
            const learnedCards = progress?.learned_cards || 0;
            const dueCards = progress?.due_cards || 0;
            const completionRate = progress?.completion_rate || 0;

            // Debug dos dados do deck
            console.log(`🎨 Renderizando deck "${deck.title}":`, {
                icon: deck.icon,
                color: deck.color,
                id: deck.id
            });

            // Debug do HTML gerado para o ícone
            const iconClass = deck.icon ? (deck.icon.startsWith('fas ') || deck.icon.startsWith('fa ') ? deck.icon : `fas ${deck.icon}`) : 'fas fa-book';
            const iconHtml = `<i class="${iconClass}"></i>`;
            console.log(`🎨 HTML do ícone gerado:`, iconHtml);

            // Teste: verificar se o ícone é válido
            if (!deck.icon || deck.icon === '') {
                console.warn(`⚠️ Deck "${deck.title}" não tem ícone definido`);
            } else {
                console.log(`✅ Ícone do deck "${deck.title}": ${deck.icon}`);
            }

            return `
                <div class="deck-progress-card">
                    <div class="deck-progress-header">
                        <div class="deck-progress-icon" style="background: ${deck.color || '#6a75ca'};">
                            <i class="${iconClass}"></i>
                        </div>
                        <div class="deck-progress-info">
                            <h4>${deck.title || 'Deck sem nome'}</h4>
                            <p>${totalCards} cards • ${completionRate}% completo</p>
                        </div>
                    </div>
                    <div class="deck-progress-stats">
                        <div class="deck-stat">
                            <div class="deck-stat-value">${dueCards}</div>
                            <div class="deck-stat-label">Para revisar</div>
                        </div>
                        <div class="deck-stat">
                            <div class="deck-stat-value">${learnedCards}</div>
                            <div class="deck-stat-label">Aprendidos</div>
                        </div>
                    </div>
                    <div class="deck-progress-bar">
                        <div class="deck-progress-fill" style="width: ${completionRate}%"></div>
                    </div>
                    <div class="deck-actions">
                        <button class="deck-action-btn primary" onclick="startDeckStudy(${deck.id})">
                            <i class="fas fa-play"></i> Estudar
                        </button>
                        <button class="deck-action-btn secondary" onclick="viewDeckDetails(${deck.id})">
                            <i class="fas fa-eye"></i> Ver Cards
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar progresso dos decks:', error);
        const progressGrid = document.getElementById('progress-grid');
        progressGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle empty-icon"></i>
                <h4>Erro ao carregar dados</h4>
                <p>Tente recarregar a página</p>
            </div>
        `;
    }
}

/**
 * Carrega decks para o modal de configuração de sessão
 */
async function loadDecksForSession(api) {
    try {
        const response = await api.get('/decks');
        const decks = response.data;

        // Atualizar filtro no modal de configuração
        const sessionDeck = document.getElementById('session-deck');
        if (sessionDeck) {
            sessionDeck.innerHTML = '<option value="">Todos os decks</option>' +
                decks.map(deck => `<option value="${deck.id}">${deck.title}</option>`).join('');
            console.log(`✅ Modal de sessão populado com ${decks.length} decks`);
        }

    } catch (error) {
        console.error('Erro ao carregar decks para modal de sessão:', error);
    }
}

/**
 * Abre modal de configuração de sessão
 */
function openSessionConfigModal(api) {
    const modal = document.getElementById('session-config-modal');
    if (modal) {
        modal.classList.add('show');
        updateSessionPreview(api);
    }
}

/**
 * Abre modal de estatísticas
 */
async function openStatsModal(api) {
    const modal = document.getElementById('stats-modal');
    const statsContent = document.getElementById('stats-content');

    if (modal && statsContent) {
        // Mostrar loading
        statsContent.innerHTML = '<div class="loading">Carregando estatísticas...</div>';
        modal.classList.add('show');

        try {
            // Carregar estatísticas básicas
            const statsResponse = await api.get('/study/stats');
            const stats = statsResponse.data.data.stats;

            // Carregar decks para estatísticas complementares
            const decksResponse = await api.get('/decks');
            const decks = decksResponse.data;

            // Calcular métricas
            const totalCards = stats.total_cards || 0;
            const cardsLearned = stats.cards_learned || 0;
            // Progresso total baseado em cards estudados (não apenas "aprendidos")
            const studied = stats.total_cards_studied || 0;
            const overallProgress = totalCards > 0 ? Math.round((studied / totalCards) * 100) : 0;

            let successRate = 0;
            if (stats.avg_ease_factor && stats.total_cards_studied > 0) {
                if (stats.avg_ease_factor <= 1.3) {
                    successRate = 0;
                } else if (stats.avg_ease_factor >= 3.0) {
                    successRate = 100;
                } else {
                    successRate = Math.round(((stats.avg_ease_factor - 1.3) / (3.0 - 1.3)) * 100);
                }
            }

            statsContent.innerHTML = `
                <div class="stats-detailed">
                    <div class="stat-section">
                        <h4><i class="fas fa-chart-pie"></i> Progresso Geral</h4>
                        <div class="stat-item">
                            <span>Cards totais:</span>
                            <strong>${totalCards}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Cards aprendidos:</span>
                            <strong>${cardsLearned}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Progresso total:</span>
                            <strong>${overallProgress}%</strong>
                        </div>
                        <div class="progress-bar-mini">
                            <div class="progress-fill-mini" style="width: ${overallProgress}%"></div>
                        </div>
                    </div>
                    
                    <div class="stat-section">
                        <h4><i class="fas fa-calendar-day"></i> Atividade Hoje</h4>
                        <div class="stat-item">
                            <span>Cards estudados:</span>
                            <strong>${stats.cards_studied_today || 0}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Cards devidos:</span>
                            <strong>${stats.cards_due || 0}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Taxa de sucesso:</span>
                            <strong>${successRate}%</strong>
                        </div>
                    </div>
                    
                    <div class="stat-section">
                        <h4><i class="fas fa-folder"></i> Coleção</h4>
                        <div class="stat-item">
                            <span>Total de decks:</span>
                            <strong>${decks.length}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Ease factor médio:</span>
                            <strong>${stats.avg_ease_factor ? stats.avg_ease_factor.toFixed(2) : '2.50'}</strong>
                        </div>
                        <div class="stat-item">
                            <span>Última sessão:</span>
                            <strong>${stats.last_study_date ? new Date(stats.last_study_date).toLocaleDateString('pt-BR') : 'Nunca'}</strong>
                        </div>
                    </div>
                    
                    <div class="stat-section">
                        <h4><i class="fas fa-lightbulb"></i> Sugestões</h4>
                        ${generateSuggestions(stats, overallProgress, totalCards)}
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Erro ao carregar estatísticas detalhadas:', error);
            statsContent.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #ff6b6b; margin-bottom: 15px;"></i>
                    <h3>Erro ao carregar estatísticas</h3>
                    <p>Tente recarregar a página ou verifique sua conexão.</p>
                    <button onclick="location.reload()" class="btn-primary" style="margin-top: 15px;">
                        <i class="fas fa-redo"></i> Recarregar Página
                    </button>
                </div>
            `;
        }
    }
}

/**
 * Gera sugestões baseadas nas estatísticas
 */
function generateSuggestions(stats, overallProgress, totalCards) {
    const suggestions = [];

    if ((stats.cards_studied_today || 0) === 0) {
        suggestions.push({
            icon: 'fas fa-play',
            message: 'Comece sua sessão de estudos hoje! Até 10 minutos já fazem diferença.',
            priority: 'high'
        });
    }

    if (overallProgress < 25 && totalCards > 0) {
        suggestions.push({
            icon: 'fas fa-chart-line',
            message: 'Considere estudar um pouco todos os dias para acelerar seu progresso.',
            priority: 'normal'
        });
    }

    if ((stats.cards_due || 0) > 10) {
        suggestions.push({
            icon: 'fas fa-clock',
            message: `Você tem ${stats.cards_due} cards devidos para revisão. Que tal começar agora?`,
            priority: 'high'
        });
    }

    if ((stats.avg_ease_factor || 2.5) < 2.0) {
        suggestions.push({
            icon: 'fas fa-brain',
            message: 'Seus cards estão um pouco difíceis. Considere revisar o material antes de estudar.',
            priority: 'normal'
        });
    }

    if ((stats.cards_studied_today || 0) >= 20) {
        suggestions.push({
            icon: 'fas fa-trophy',
            message: 'Parabéns! Você atingiu sua meta diária de estudos.',
            priority: 'normal'
        });
    }

    if (suggestions.length === 0) {
        suggestions.push({
            icon: 'fas fa-star',
            message: 'Continue mantendo a consistência nos estudos. Você está indo bem!',
            priority: 'normal'
        });
    }

    return suggestions.map(suggestion => `
        <div class="suggestion-item priority-${suggestion.priority}">
            <i class="${suggestion.icon}"></i>
            <span>${suggestion.message}</span>
        </div>
    `).join('');
}

/**
 * Atualiza preview da sessão no modal
 */
async function updateSessionPreview(api) {
    const deckId = document.getElementById('session-deck')?.value || '';
    const limit = document.getElementById('session-limit')?.value || 20;
    const preview = document.getElementById('session-preview');

    if (!preview) return;

    try {
        // Simular a busca de cards disponíveis
        const endpoint = deckId ? `/study/session/${deckId}?limit=${limit}` : `/study/session?limit=${limit}`;
        const response = await api.get(endpoint);
        const sessionData = response.data.data;

        preview.innerHTML = `
            <div class="session-preview-content">
                <h4>Preview da Sessão</h4>
                <div class="preview-stats">
                    <div class="preview-stat">
                        <span>Cards disponíveis:</span>
                        <strong>${sessionData.totalCards}</strong>
                    </div>
                    <div class="preview-stat">
                        <span>Deck selecionado:</span>
                        <strong>${deckId ? 'Deck específico' : 'Todos os decks'}</strong>
                    </div>
                </div>
                ${sessionData.totalCards === 0 ?
                '<p class="preview-warning">⚠️ Nenhum card disponível para revisão no momento.</p>' :
                '<p class="preview-success">✅ Sessão pronta para iniciar!</p>'
            }
            </div>
        `;

    } catch (error) {
        console.error('Erro ao carregar preview da sessão:', error);
        preview.innerHTML = '<div class="error">Erro ao carregar preview</div>';
    }
}

/**
 * Inicia sessão de estudo
 */
async function startStudySession(api) {
    const deckId = document.getElementById('session-deck')?.value || '';
    const limit = document.getElementById('session-limit')?.value || 20;

    console.log(`🚀 Iniciando sessão de estudo:`, { deckId, limit });

    try {
        closeModals();

        // Buscar cards para a sessão
        const endpoint = deckId ? `/study/session/${deckId}?limit=${limit}` : `/study/session?limit=${limit}`;
        console.log(`📡 Chamando endpoint: ${endpoint}`);

        const response = await api.get(endpoint);
        const sessionData = response.data.data;

        console.log(`✅ Resposta da sessão:`, sessionData);

        if (sessionData.totalCards === 0) {
            // Exibir modal oferecendo revisar mesmo assim
            const reviewModal = document.getElementById('review-anyway-modal');
            if (reviewModal) {
                reviewModal.classList.add('show');
            } else {
                // Fallback de notificação caso o modal não exista
                showNotification('Todos os cards estão em aguardo. Deseja revisar mesmo assim?', 'warning');
            }
            return;
        }

        // Verificar se os cards pertencem ao deck selecionado
        if (deckId && sessionData.cards.length > 0) {
            const firstCard = sessionData.cards[0];
            console.log(`🔍 Verificando primeiro card:`, {
                cardDeckId: firstCard.deck_id,
                selectedDeckId: deckId,
                match: firstCard.deck_id == deckId
            });
        }

        // Configurar sessão
        currentSession = sessionData.session;
        sessionCards = sessionData.cards;
        currentCardIndex = 0;
        isCardFlipped = false;

        // Mostrar interface de estudo
        showStudyInterface();

        // Mostrar primeiro card
        showCurrentCard();

        showNotification(`Sessão iniciada com ${sessionData.totalCards} cards`, 'success');

    } catch (error) {
        console.error('Erro ao iniciar sessão de estudo:', error);
        showNotification('Erro ao iniciar sessão de estudo', 'error');
    }
}

/**
 * Mostra interface de estudo
 */
function showStudyInterface() {
    const studyOverview = document.querySelector('.study-overview');
    const studySession = document.getElementById('study-session');

    if (studyOverview) {
        studyOverview.style.display = 'none';
    }

    if (studySession) {
        studySession.style.display = 'flex';
    }
}

/**
 * Mostra o card atual
 */
function showCurrentCard() {
    if (!sessionCards.length || currentCardIndex >= sessionCards.length) {
        endStudySession();
        return;
    }

    const card = sessionCards[currentCardIndex];

    // Atualizar informações da sessão
    updateElement('current-card', currentCardIndex + 1);
    updateElement('total-cards', sessionCards.length);

    // Atualizar barra de progresso
    const progressPercent = ((currentCardIndex + 1) / sessionCards.length) * 100;
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        progressFill.style.width = `${progressPercent}%`;
    }

    // Atualizar conteúdo do card
    updateElement('card-deck-name', card.deck_title);
    updateElement('card-deck-name-back', card.deck_title);
    updateElement('card-question', card.question);
    updateElement('card-question-back', card.question);
    updateElement('card-answer', card.response);

    // Atualizar ícones do deck (garantindo prefixo 'fas')
    const deckIcons = document.querySelectorAll('#card-deck-icon, #card-deck-icon-back');
    const iconClass = card.deck_icon ? (card.deck_icon.startsWith('fas ') || card.deck_icon.startsWith('fa ') ? card.deck_icon : `fas ${card.deck_icon}`) : 'fas fa-book';
    deckIcons.forEach(icon => {
        icon.innerHTML = `<i class="${iconClass}"></i>`;
        icon.style.backgroundColor = card.deck_color;
    });

    // Resetar estado do card
    const flashcard = document.getElementById('flashcard');
    if (flashcard) {
        flashcard.classList.remove('flipped');
        isCardFlipped = false;
    }
}

/**
 * Vira o card para mostrar a resposta
 */
function flipCard() {
    const flashcard = document.getElementById('flashcard');
    if (flashcard && !isCardFlipped) {
        flashcard.classList.add('flipped');
        isCardFlipped = true;
    }
}

/**
 * Processa seleção de dificuldade
 */
async function handleDifficultySelection(api, difficulty) {
    if (!currentSession || !sessionCards.length || currentCardIndex >= sessionCards.length) {
        return;
    }

    const card = sessionCards[currentCardIndex];

    try {
        // Enviar avaliação para o backend
        await api.post('/study/review', {
            cardId: card.card_id,
            difficulty: difficulty
        });

        // Próximo card
        currentCardIndex++;

        if (currentCardIndex >= sessionCards.length) {
            // Sessão finalizada
            endStudySession();
        } else {
            // Mostrar próximo card
            showCurrentCard();
        }

    } catch (error) {
        console.error('Erro ao processar dificuldade:', error);
        showNotification('Erro ao processar avaliação', 'error');
    }
}

/**
 * Finaliza sessão de estudo
 */
function endStudySession() {
    const studyOverview = document.querySelector('.study-overview');
    const studySession = document.getElementById('study-session');

    if (studyOverview) {
        studyOverview.style.display = 'block';
    }

    if (studySession) {
        studySession.style.display = 'none';
    }

    // Resetar estado
    currentSession = null;
    sessionCards = [];
    currentCardIndex = 0;
    isCardFlipped = false;

    // Recarregar dados
    setTimeout(() => {
        window.location.reload();
    }, 1000);

    showNotification('Sessão de estudo finalizada!', 'success');
}

/**
 * Fecha todos os modais
 */
function closeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.remove('show');
    });
}

/**
 * Utilitário para atualizar elemento
 */
function updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = content;
    }
}

// Funções globais para uso nos event handlers inline
window.startDeckStudy = function (deckId) {
    document.getElementById('session-deck').value = deckId;
    const api = axios.create({
        baseURL: API_BASE_URL,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        }
    });
    startStudySession(api);
};

window.viewDeckDetails = function (deckId) {
    // Redirecionar para a página de cards com o deck selecionado
    window.location.href = `cards.html?deck=${deckId}`;
};

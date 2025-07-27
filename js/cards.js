// cards.js - Gerenciamento de cards de flashcards
// Importar estilos CSS para o build com Vite
import '../css/dashboard.css';
import '../css/cards.css';

// Importar funções compartilhadas
import { initTheme, toggleTheme } from './theme.js';
import { protectRoute, getCurrentUser, logout, getToken } from './auth.js';
import { showNotification } from './notifications.js';
import axios from 'axios';

const API_BASE_URL = 'https://flashcards-backend-ejyn.onrender.com';

// Configuração do Axios com interceptor para adicionar o token JWT
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    }
});

// Interceptor para adicionar o token JWT em cada requisição
api.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Estado da aplicação
let currentCardId = null;
let cards = [];
let decks = [];

// Elementos da interface
let newCardBtn, cardModal, confirmModal, cardForm;
let searchInput, deckFilter, difficultyFilter, sortSelect;
let cardsContainer;

// Função para ordenar cards
function sortCards(cardsToSort, sortType) {
    const sorted = [...cardsToSort];
    switch (sortType) {
        case 'difficulty-asc':
            sorted.sort((a, b) => (a.difficulty || 1) - (b.difficulty || 1));
            break;
        case 'difficulty-desc':
            sorted.sort((a, b) => (b.difficulty || 1) - (a.difficulty || 1));
            break;
        case 'az':
            sorted.sort((a, b) => (a.question || '').localeCompare(b.question || ''));
            break;
        case 'za':
            sorted.sort((a, b) => (b.question || '').localeCompare(a.question || ''));
            break;
        default:
            // mais recente primeiro
            sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
    }
    return sorted;
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function () {
    // Verificar autenticação
    if (!protectRoute()) {
        return; // Redireciona para o login se não estiver autenticado
    }

    // Inicializar o tema
    initTheme();

    // Obter informações do usuário atual
    const currentUser = getCurrentUser() || {};

    // Configurar elementos da interface
    setupUIElements();

    // Configurar eventos
    setupEventListeners();

    // Carregar dados iniciais
    loadInitialData();

    // Atualizar informações do usuário na interface
    updateUserInfo(currentUser);
});

/**
 * Configura os elementos da interface
 */
function setupUIElements() {
    console.log('Configurando elementos da interface...');
    // Botões e controles
    newCardBtn = document.getElementById('new-card-btn');
    console.log('Botão novo card:', newCardBtn);

    cardModal = document.getElementById('card-modal');
    console.log('Elemento do modal de card:', cardModal);

    confirmModal = document.getElementById('confirm-modal');
    console.log('Elemento do modal de confirmação:', confirmModal);

    cardForm = document.getElementById('card-form');
    console.log('Formulário de card:', cardForm);

    // Verificar se os elementos foram encontrados
    if (!newCardBtn) console.error('ERRO: Botão new-card-btn não encontrado no DOM');
    if (!cardModal) console.error('ERRO: Elemento card-modal não encontrado no DOM');
    if (!confirmModal) console.error('ERRO: Elemento confirm-modal não encontrado no DOM');
    if (!cardForm) console.error('ERRO: Elemento card-form não encontrado no DOM');

    // Filtros e busca
    searchInput = document.querySelector('.search-input');
    deckFilter = document.getElementById('deck-filter');
    difficultyFilter = document.getElementById('difficulty-filter');

    // Containers
    cardsContainer = document.querySelector('.cards-container');

    // Configurar seletor de ordenação
    sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            filterCards();
        });
    }

    // Configurar botão de tema
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Configurar botão de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            logout();
        });
    }

    // Configurar navegação
    setupNavigation();
}

/**
 * Configura os event listeners
 */
function setupEventListeners() {
    console.log('Configurando event listeners...');
    // Novo card
    if (newCardBtn) {
        console.log('Botão novo card encontrado, adicionando listener...');
        newCardBtn.addEventListener('click', function (e) {
            console.log('Botão novo card clicado!');
            openCardModal();
        });
    } else {
        console.error('Botão novo card não encontrado no DOM!');
    }

    // Busca
    if (searchInput) {
        searchInput.addEventListener('input', filterCards);
    }

    // Filtros
    if (deckFilter) {
        deckFilter.addEventListener('change', filterCards);
    }

    if (difficultyFilter) {
        difficultyFilter.addEventListener('change', filterCards);
    }

    // Modal de confirmação
    const cancelDeleteBtn = document.querySelector('.cancel-delete');
    const confirmDeleteBtn = document.querySelector('.confirm-delete');

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => closeModal(confirmModal));
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDeleteCard);
    }

    // Fechar modais ao clicar fora
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const overlay = modal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => closeModal(modal));
        }

        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(modal));
        }
    });

    // Cancelar edição
    const cancelBtn = document.querySelector('.cancel-modal');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => closeModal(cardModal));
    }

    // Configurar submissão do formulário de card
    if (cardForm) {
        cardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCard();
        });
    }
}

/**
 * Configura a navegação entre as páginas
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', function () {
            const page = this.getAttribute('data-page');

            // Atualizar estado ativo
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // Navegar para a página correta
            if (page === 'dashboard') {
                window.location.href = 'dashboard.html';
            } else if (page === 'decks') {
                window.location.href = 'decks.html';
            } else if (page === 'study') {
                // Implementar navegação para modo de estudo
                console.log('Navegando para modo de estudo');
            } else if (page === 'pomodoro') {
                // Implementar navegação para pomodoro
                console.log('Navegando para pomodoro');
            }
        });
    });
}

/**
 * Atualiza as informações do usuário na interface
 * @param {Object} user - Objeto com as informações do usuário
 */
function updateUserInfo(user) {
    const userNameElements = document.querySelectorAll('.user-name-display');
    const userInitial = document.querySelector('.user-initial');

    if (user && user.name) {
        userNameElements.forEach(element => {
            element.textContent = user.name;
        });

        if (userInitial) {
            userInitial.textContent = user.name.charAt(0).toUpperCase();
        }
    }

    // Atualizar data atual
    updateCurrentDate();
}

/**
 * Atualiza a exibição da data atual
 */
function updateCurrentDate() {
    const dateDisplay = document.querySelector('.date-display');
    if (dateDisplay) {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        dateDisplay.textContent = now.toLocaleDateString('pt-BR', options);
    }
}

/**
 * Carrega os dados iniciais da aplicação
 */
async function loadInitialData() {
    try {
        console.log('Iniciando carregamento de dados iniciais...');
        // Carregar decks e cards em paralelo para melhor desempenho
        console.log('Fazendo requisição para /decks...');
        const [decksResponse] = await Promise.all([
            api.get('/decks')
        ]);

        decks = decksResponse.data || [];
        console.log('Resposta da API de decks:', decksResponse);
        console.log('Decks carregados:', decks);

        if (!decks || decks.length === 0) {
            console.warn('Nenhum deck encontrado para o usuário atual');
            showNotification('Você não tem nenhum deck. Crie um deck antes de adicionar cards.', 'warning');
        }

        // Preencher select de decks
        populateDeckSelects();

        // Carregar cards
        await loadCards();

    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        const errorMessage = error.response?.data?.error || 'Erro ao carregar os dados. Tente novamente mais tarde.';
        showNotification(errorMessage, 'error');

        // Se for erro de autenticação, redirecionar para o login
        if (error.response?.status === 401) {
            logout();
            window.location.href = '/login.html';
        }
    }
}

/**
 * Preenche os selects de deck nos formulários
 */
function populateDeckSelects() {
    const deckSelects = [
        document.getElementById('deck-filter'),
        document.getElementById('card-deck')
    ];

    console.log('Iniciando populateDeckSelects...');
    console.log('Decks disponíveis:', decks);

    deckSelects.forEach((select, index) => {
        console.log(`Processando select ${index}:`, select ? 'encontrado' : 'não encontrado');
        if (!select) {
            console.error('Elemento select não encontrado no DOM');
            return;
        }
        // Log para depuração
        console.log('Decks para popular o select:', decks);
        // Salva o placeholder (primeira opção) se existir e for value vazio
        let placeholder = null;
        if (select.options.length > 0 && select.options[0].value === '') {
            placeholder = select.options[0].cloneNode(true);
        }
        // Limpa todas as opções
        select.innerHTML = '';
        if (placeholder) select.appendChild(placeholder);
        // Adiciona decks reais, sem duplicatas
        const seen = new Set();
        decks.forEach(deck => {
            if (!deck || seen.has(deck.id)) return;
            seen.add(deck.id);
            const option = document.createElement('option');
            option.value = deck.id;
            option.textContent = deck.name || deck.title || `Deck ${deck.id}`;
            select.appendChild(option);
        });
    });
}

/**
 * Carrega os cards da API
 */
async function loadCards() {
    try {
        // Carrega os decks primeiro para poder associar aos cards
        const decksResponse = await api.get('/decks');
        decks = decksResponse.data;

        // Carrega todos os cards do usuário
        const response = await api.get('/cards');
        cards = response.data;

        // Atualiza os selects de filtro com os decks
        populateDeckSelects();

        // Atualiza a interface baseado na disponibilidade de decks
        updateUIForDecks();

        // Renderiza os cards
        renderCards();

    } catch (error) {
        console.error('Erro ao carregar cards:', error);
        showNotification('Erro ao carregar os cards. Tente novamente.', 'error');
    }
}

/**
 * Renderiza os cards na interface
 */
function renderCards(filteredCards = null) {
    const sortType = sortSelect ? sortSelect.value : 'default';
    const cardsToRender = sortCards(filteredCards || cards, sortType);

    if (!cardsContainer) return;

    // Limpar container
    cardsContainer.innerHTML = '';

    if (cardsToRender.length === 0) {
        // Mostrar estado vazio
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-clone empty-icon"></i>
            <h3>Nenhum card encontrado</h3>
            <p>${cards.length === 0 ? 'Crie seu primeiro card clicando no botão "Novo Card"' : 'Nenhum card corresponde aos filtros selecionados'}</p>
        `;
        cardsContainer.appendChild(emptyState);
        return;
    }

    // Renderizar cards
    cardsToRender.forEach(card => {
        const deck = decks.find(d => d.id === card.deck_id) || { name: 'Deck não encontrado', color: '#666' };
        const cardElement = createCardElement(card);
        cardsContainer.appendChild(cardElement);
    });
}

/**
 * Cria um elemento HTML para um card
 * @param {Object} card - Dados do card
 * @returns {HTMLElement} - Elemento HTML do card
 */
function createCardElement(card) {
    const deck = decks.find(d => d.id === card.deck_id) || { name: 'Deck não encontrado', color: '#666', icon: 'fa-layer-group' };

    const cardElement = document.createElement('div');
    cardElement.className = 'card flashcard-modern';
    cardElement.dataset.id = card.id;

    cardElement.innerHTML = `
        <div class="card-header-modern">
            <div class="deck-info">
                <span class="deck-color" style="background-color: ${deck.color || '#4f64ff'}"></span>
                <span class="deck-name">${deck.name || deck.title || 'Deck não encontrado'}</span>
            </div>
            <div class="card-actions">
                <button class="btn-icon edit-card" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete-card" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="card-content-modern">
            <div class="card-question-modern">${card.question || 'Sem pergunta'}</div>
            <div class="card-answer-modern">${card.response || 'Sem resposta'}</div>
        </div>
        <div class="card-footer-modern">
            <div class="card-stats">
                <span class="study-count"><i class="fas fa-repeat"></i> Estudado 3 vezes</span>
                <span class="study-last"><i class="fas fa-clock"></i> há 5 dias</span>
            </div>
            <span class="card-difficulty difficulty-${card.difficulty || 1}">
                ${getDifficultyLabel(card.difficulty || 1)}
            </span>
        </div>
    `;

    cardElement.querySelector('.edit-card').addEventListener('click', (e) => {
        e.stopPropagation();
        editCard(card.id);
    });

    cardElement.querySelector('.delete-card').addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDelete(card.id);
    });

    return cardElement;
}

/**
 * Retorna o rótulo de dificuldade formatado
 * @param {number|string} difficulty - Nível de dificuldade (1-3)
 * @returns {string} - Rótulo formatado
 */
function getDifficultyLabel(difficulty) {
    // Converte para número se for string
    const diffNum = parseInt(difficulty, 10);

    switch (diffNum) {
        case 1: return 'Fácil';
        case 3: return 'Difícil';
        case 2:
        default: return 'Médio';
    }
}

/**
 * Filtra os cards com base nos critérios de busca e filtros
 */
function filterCards() {
    const searchTerm = searchInput?.value.toLowerCase() || '';
    const selectedDeck = deckFilter?.value || '';
    const selectedDifficulty = difficultyFilter?.value || '';

    const filtered = cards.filter(card => {
        const matchesSearch = card.question.toLowerCase().includes(searchTerm) ||
            card.response.toLowerCase().includes(searchTerm);
        const matchesDeck = !selectedDeck || card.deck_id == selectedDeck; // Usar == para comparar string com número se necessário
        const matchesDifficulty = !selectedDifficulty || card.difficulty == selectedDifficulty; // Usar == para comparar string com número

        return matchesSearch && matchesDeck && matchesDifficulty;
    });

    renderCards(filtered);
}

/**
 * Verifica se existem decks disponíveis
 * @returns {boolean} true se houver decks, false caso contrário
 */
function hasAvailableDecks() {
    return decks && Array.isArray(decks) && decks.length > 0;
}

/**
 * Atualiza a interface com base na disponibilidade de decks
 */
function updateUIForDecks() {
    const hasDecks = hasAvailableDecks();

    // Atualiza o botão de novo card
    if (newCardBtn) {
        newCardBtn.disabled = !hasDecks;
        if (!hasDecks) {
            newCardBtn.title = 'Crie um deck antes de adicionar cards';
            newCardBtn.classList.add('tooltip');
        } else {
            newCardBtn.title = '';
            newCardBtn.classList.remove('tooltip');
        }
    }
}

/**
 * Abre o modal para criar/editar um card
 * @param {number} [cardId] - ID do card para edição (opcional)
 */
async function openCardModal(cardId) {
    // Verifica se existem decks disponíveis (exceto em modo edição)
    if (!cardId && !hasAvailableDecks()) {
        showNotification('Você precisa criar um deck antes de adicionar cards.', 'warning');
        return;
    }

    const modalTitle = document.querySelector('#card-modal .modal-title');

    if (cardId) {
        // Modo edição
        modalTitle.textContent = 'Editar Card';

        try {
            const response = await api.get(`/cards/${cardId}`);
            const card = response.data;

            // Preencher campos do formulário
            if (cardForm) {
                cardForm.elements['question'].value = card.question || '';
                cardForm.elements['response'].value = card.response || '';
                const deckSelect = cardForm.elements['deck_id'];
                if (deckSelect) deckSelect.value = card.deck_id;
                const diffSelect = cardForm.elements['difficulty'];
                if (diffSelect) diffSelect.value = card.difficulty;
            }

        } catch (error) {
            console.error('Erro ao carregar card para edição:', error);
            showNotification('Erro ao carregar o card para edição', 'error');
            return;
        }
    } else {
        // Modo criação
        modalTitle.textContent = 'Novo Card';
        if (cardForm) {
            cardForm.reset();
            // Define um valor padrão para dificuldade
            const difficultySelect = document.getElementById('card-difficulty');
            if (difficultySelect) difficultySelect.value = '1';
        }
    }

    openModal(cardModal);
}

/**
 * Salva um novo card ou atualiza um existente
 */
async function saveCard() {
    console.log('saveCard function called');
    const form = document.getElementById('card-form');
    if (!form) {
        console.error('Form not found');
        return;
    }

    // Get the save button and store its original state
    const saveButton = form.querySelector('button[type="submit"]');
    let originalButtonText = '';
    if (saveButton) {
        originalButtonText = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';
    }

    const formData = new FormData(form);
    console.log('Form data:', {
        deck_id: formData.get('deck_id'),
        question: formData.get('question'),
        response: formData.get('response'),
        difficulty: formData.get('difficulty')
    });

    const cardData = {
        deck_id: formData.get('deck_id'),
        question: formData.get('question')?.trim(),
        response: formData.get('response')?.trim(),
        difficulty: parseInt(formData.get('difficulty')) || 1
    };

    // Validação básica
    if (!cardData.question || !cardData.response || !cardData.deck_id) {
        const errorMsg = `Missing required fields: ${!cardData.question ? 'question ' : ''}${!cardData.response ? 'response ' : ''}${!cardData.deck_id ? 'deck_id' : ''}`;
        console.error('Validation error:', errorMsg);
        showNotification('Por favor, preencha todos os campos obrigatórios.', 'error');

        // Restore button state on validation error
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.innerHTML = originalButtonText;
        }
        return;
    }

    try {
        // Se tivermos um cardId, estamos atualizando, senão, criando um novo
        if (currentCardId) {
            await api.put(`/cards/${currentCardId}`, cardData);
            showNotification('Card atualizado com sucesso!', 'success');
        } else {
            await api.post(`/decks/${cardData.deck_id}/cards`, cardData);
            showNotification('Card criado com sucesso!', 'success');
        }

        // Fechar o modal e recarregar a lista de cards
        closeModal(cardModal);
        loadCards();
    } catch (error) {
        console.error('Erro ao salvar o card:', error);
        const errorMessage = error.response?.data?.error || 'Erro ao salvar o card. Tente novamente.';
        showNotification(errorMessage, 'error');
    } finally {
        // Restaurar o botão de salvar
        if (saveButton && originalButtonText) {
            saveButton.disabled = false;
            saveButton.innerHTML = originalButtonText;
        }
    }
}

/**
 * Prepara a edição de um card
 * @param {string} cardId - ID do card a ser editado
 */
function editCard(cardId) {
    openCardModal(cardId);
}

/**
 * Solicita confirmação antes de excluir um card
 * @param {string} cardId - ID do card a ser excluído
 */
function confirmDelete(cardId) {
    currentCardId = cardId;
    openModal(confirmModal);
}

/**
 * Confirma e executa a exclusão de um card
 */
async function confirmDeleteCard() {
    if (!currentCardId) {
        closeModal(confirmModal);
        return;
    }

    try {
        await api.delete(`/cards/${currentCardId}`);
        showNotification('Card excluído com sucesso!', 'success');
        await loadCards(); // Recarrega a lista de cards
    } catch (error) {
        console.error('Erro ao excluir card:', error);
        const errorMessage = error.response?.data?.error || 'Erro ao excluir o card. Tente novamente.';
        showNotification(errorMessage, 'error');
    } finally {
        closeModal(confirmModal);
        currentCardId = null; // Resetar ID após exclusão
    }
}

/**
 * Abre um modal
 * @param {HTMLElement} modal - Elemento do modal a ser aberto
 */
function openModal(modal) {
    console.log('Função openModal chamada com modal:', modal);
    if (!modal) {
        console.error('Nenhum modal fornecido para a função openModal');
        return;
    }

    document.body.style.overflow = 'hidden';
    modal.classList.add('active');

    // Focar no primeiro campo de entrada, se houver
    const input = modal.querySelector('input, textarea, select');
    if (input) {
        setTimeout(() => input.focus(), 100);
    }
}

/**
 * Fecha um modal
 * @param {HTMLElement} modal - Elemento do modal a ser fechado
 */
function closeModal(modal) {
    if (!modal) return;

    document.body.style.overflow = '';
    modal.classList.remove('active');

    // Limpar ID do card atual se for o modal de confirmação
    if (modal.id === 'confirm-modal') {
        currentCardId = null;
    }
}

// Adicionar suporte para tecla Esc fechar os modais
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            closeModal(activeModal);
        }
    }
});

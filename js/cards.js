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

// Configuração do Axios (sem interceptors problemáticos)
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Estado da aplicação
let currentCardId = null;
let cards = [];
let decks = [];

// Elementos da interface
let newCardBtn, cardModal, confirmModal, cardForm;
let searchInput, deckFilter, difficultyFilter;
let cardsContainer;

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

    // Salvar card
    const saveBtn = document.querySelector('.save-card');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCard);
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
        // Carregar decks
        const token = getToken();
        const decksResponse = await axios.get(`${API_BASE_URL}/api/decks`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        decks = decksResponse.data || [];

        // Preencher select de decks
        populateDeckSelects();

        // Carregar cards
        await loadCards();

    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        showNotification('Erro ao carregar os dados. Tente novamente mais tarde.', 'error');
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

    deckSelects.forEach(select => {
        if (!select) return;

        // Limpar opções existentes (exceto a primeira)
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Adicionar opções de decks
        decks.forEach(deck => {
            const option = document.createElement('option');
            option.value = deck.id;
            option.textContent = deck.name;
            select.appendChild(option);
        });
    });
}

/**
 * Carrega os cards da API
 */
async function loadCards() {
    try {
        const token = getToken();
        const response = await axios.get(`${API_BASE_URL}/api/cards`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        cards = response.data || [];
        renderCards();
    } catch (error) {
        console.error('Erro ao carregar cards:', error);
        showNotification('Erro ao carregar os cards. Tente novamente mais tarde.', 'error');
    }
}

/**
 * Renderiza os cards na interface
 */
function renderCards(filteredCards = null) {
    const cardsToRender = filteredCards || cards;

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
        const deck = decks.find(d => d.id === card.deckId) || {};
        const cardElement = createCardElement(card, deck);
        cardsContainer.appendChild(cardElement);
    });
}

/**
 * Cria um elemento HTML para um card
 * @param {Object} card - Dados do card
 * @param {Object} deck - Dados do deck ao qual o card pertence
 * @returns {HTMLElement} - Elemento HTML do card
 */
function createCardElement(card, deck) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card-item';

    // Formatar data
    const createdAt = new Date(card.createdAt);
    const formattedDate = createdAt.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    // Criar elemento do card
    cardElement.innerHTML = `
        <div class="card-header">
            <div class="card-deck">
                <span class="deck-color" style="background-color: ${deck.color || '#A5B4FC'}"></span>
                <span>${deck.name || 'Sem deck'}</span>
            </div>
            <span class="card-difficulty difficulty-${card.difficulty || 'medium'}">
                ${getDifficultyLabel(card.difficulty)}
            </span>
        </div>
        <div class="card-content">
            <p class="card-question">${card.question || ''}</p>
            <p class="card-answer">${card.answer || ''}</p>
        </div>
        <div class="card-footer">
            <span class="card-date">Criado em ${formattedDate}</span>
            <div class="card-actions">
                <button class="btn-icon edit-card" data-id="${card.id}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete-card" data-id="${card.id}" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;

    // Adicionar eventos aos botões
    const editBtn = cardElement.querySelector('.edit-card');
    const deleteBtn = cardElement.querySelector('.delete-card');

    if (editBtn) {
        editBtn.addEventListener('click', () => editCard(card.id));
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => confirmDelete(card.id));
    }

    return cardElement;
}

/**
 * Retorna o rótulo de dificuldade formatado
 * @param {string} difficulty - Nível de dificuldade
 * @returns {string} - Rótulo formatado
 */
function getDifficultyLabel(difficulty) {
    switch (difficulty) {
        case 'facil': return 'Fácil';
        case 'dificil': return 'Difícil';
        default: return 'Médio';
    }
}

/**
 * Filtra os cards com base nos critérios de busca e filtros
 */
function filterCards() {
    const searchTerm = (searchInput?.value || '').toLowerCase();
    const selectedDeckId = deckFilter?.value || '';
    const selectedDifficulty = difficultyFilter?.value || '';

    const filtered = cards.filter(card => {
        // Filtrar por termo de busca
        const matchesSearch = !searchTerm ||
            (card.question && card.question.toLowerCase().includes(searchTerm)) ||
            (card.answer && card.answer.toLowerCase().includes(searchTerm));

        // Filtrar por deck
        const matchesDeck = !selectedDeckId || card.deckId === selectedDeckId;

        // Filtrar por dificuldade
        const matchesDifficulty = !selectedDifficulty || card.difficulty === selectedDifficulty;

        return matchesSearch && matchesDeck && matchesDifficulty;
    });

    renderCards(filtered);
}

/**
 * Abre o modal para criar/editar um card
 * @param {string} [cardId] - ID do card para edição (opcional)
 */
function openCardModal(cardId = null) {
    console.log('Abrindo modal de card...');
    currentCardId = cardId;
    const modalTitle = document.querySelector('#card-modal .modal-title');
    console.log('Modal title element:', modalTitle);

    if (cardId) {
        // Modo edição
        modalTitle.textContent = 'Editar Card';
        const card = cards.find(c => c.id === cardId);

        if (card) {
            document.getElementById('card-question').value = card.question || '';
            document.getElementById('card-answer').value = card.answer || '';
            document.getElementById('card-deck').value = card.deckId || '';
            document.getElementById('card-difficulty').value = card.difficulty || 'medio';
        }
    } else {
        // Modo criação
        modalTitle.textContent = 'Novo Card';
        cardForm?.reset();
    }

    openModal(cardModal);
}

/**
 * Salva um card (cria ou atualiza)
 */
async function saveCard() {
    if (!cardForm) return;

    // Validar formulário
    const question = document.getElementById('card-question')?.value.trim();
    const answer = document.getElementById('card-answer')?.value.trim();
    const deckId = document.getElementById('card-deck')?.value;
    const difficulty = document.getElementById('card-difficulty')?.value;

    if (!question || !answer || !deckId) {
        showNotification('Preencha todos os campos obrigatórios.', 'error');
        return;
    }

    const cardData = {
        question,
        answer,
        deckId,
        difficulty: difficulty || 'medio'
    };

    try {
        if (currentCardId) {
            // Atualizar card existente
            await api.put(`/api/cards/${currentCardId}`, cardData);
            showNotification('Card atualizado com sucesso!', 'success');
        } else {
            // Criar novo card
            await api.post('/api/cards', cardData);
            showNotification('Card criado com sucesso!', 'success');
        }

        // Recarregar cards e fechar modal
        await loadCards();
        closeModal(cardModal);

    } catch (error) {
        console.error('Erro ao salvar card:', error);
        showNotification('Erro ao salvar o card. Tente novamente.', 'error');
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
        await api.delete(`/api/cards/${currentCardId}`);
        showNotification('Card excluído com sucesso!', 'success');
        await loadCards();
        closeModal(confirmModal);
    } catch (error) {
        console.error('Erro ao excluir card:', error);
        showNotification('Erro ao excluir o card. Tente novamente.', 'error');
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

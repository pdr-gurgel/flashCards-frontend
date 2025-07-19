// Decks management script - unificado (decks.js + decks-main.js)
import { protectRoute, getCurrentUser, logout } from './auth.js';
import { showNotification } from './notifications.js';

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', function () {
    // Verificar se o usuário está autenticado
    if (!protectRoute()) {
        return; // Se não estiver autenticado, protectRoute já redireciona
    }

    // Inicializar o tema
    initTheme();

    // Get current user info using auth module
    const currentUser = getCurrentUser() || {};

    // Set user name and initial if available
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

    // Set current date
    const dateDisplay = document.querySelector('.date-display');
    if (dateDisplay) {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(now);
        const year = now.getFullYear();
        const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(now);
        dateDisplay.innerHTML = `<strong>${weekday}</strong>, ${day} ${month} ${year}`;
    }

    // Handle navigation menu
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function () {
            // Se já estiver na página atual, não faz nada
            if (this.classList.contains('active')) return;

            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // Navigate based on data-page attribute
            const pageType = this.dataset.page;
            switch (pageType) {
                case 'dashboard':
                    window.location.href = 'dashboard.html';
                    break;
                case 'decks':
                    window.location.href = 'decks.html';
                    break;
                case 'flashcards':
                    // Implementação futura
                    console.log('Navegando para flashcards');
                    break;
                case 'study':
                    // Implementação futura
                    console.log('Navegando para modo estudo');
                    break;
                case 'pomodoro':
                    // Implementação futura
                    console.log('Navegando para pomodoro');
                    break;
            }
        });
    });

    // Handle logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            logout(); // Usando a função centralizada de logout
        });
    }

    // Theme toggle handler
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            toggleTheme();
        });
    }

    // Inicializar a página de decks
    initDecksPage();

    // Modal functionality
    setupDeckModal();
});

// Funções de gerenciamento de tema
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        // Atualiza visual do botão de tema
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            if (savedTheme === 'dark') {
                themeToggle.classList.add('dark-mode');
            } else {
                themeToggle.classList.remove('dark-mode');
            }
        }
    } else {
        // Tema default agora é escuro
        localStorage.setItem('theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.classList.add('dark-mode');
        }
    }
}

function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);

    // Atualiza visual do botão
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.classList.toggle('dark-mode');
    }
}

// Modal para criação e edição de decks
function setupDeckModal() {
    const modal = document.getElementById('deck-modal');
    if (!modal) return;

    const openModalBtn = document.getElementById('create-deck-btn');
    const closeModalBtn = document.querySelector('.modal-close-btn');
    const cancelBtn = document.getElementById('deck-cancel-btn');
    const form = document.getElementById('deck-form');
    const iconSelect = document.getElementById('deck-icon');
    const iconPreview = document.getElementById('icon-preview');
    const colorPresets = document.querySelectorAll('.color-preset');
    const colorInput = document.getElementById('deck-color');

    // Abrir modal ao clicar no botão de criar deck
    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            modal.classList.add('active');
        });
    }

    // Fechar modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    // Fechar modal ao clicar no botão cancelar
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    // Fechar modal ao clicar fora do conteúdo
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Atualizar preview do ícone
    if (iconSelect && iconPreview) {
        iconSelect.addEventListener('change', () => {
            iconPreview.className = `fas ${iconSelect.value}`;
        });
    }

    // Funcionalidade para as cores predefinidas
    if (colorPresets) {
        colorPresets.forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                colorInput.value = color;

                // Destacar a cor selecionada
                colorPresets.forEach(p => p.classList.remove('selected'));
                preset.classList.add('selected');
            });
        });
    }

    // Submit do formulário de deck
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            // Coletar dados do formulário
            const deckData = {
                title: document.getElementById('deck-title').value,
                color: document.getElementById('deck-color').value,
                icon: document.getElementById('deck-icon').value
            };

            // Processar o formulário (aqui seria onde você enviaria para a API)
            console.log('Dados do deck:', deckData);

            // Fechar o modal após salvar
            modal.classList.remove('active');

            // Recarregar a lista de decks (atualmente com dados mockados)
            window.location.reload();
        });
    }
}

// Mock data for decks
const mockDecks = [
    {
        id: 1,
        title: 'Matemática Avançada',
        cardCount: 45,
        color: '#4f6bed',
        icon: 'fa-square-root-variable',
        progress: 68
    },
    {
        id: 2,
        title: 'Inglês Intermediário',
        cardCount: 72,
        color: '#4caf50',
        icon: 'fa-language',
        progress: 45
    },
    {
        id: 3,
        title: 'Programação JavaScript',
        cardCount: 38,
        color: '#ff9800',
        icon: 'fa-code',
        progress: 82
    },
    {
        id: 4,
        title: 'História do Brasil',
        cardCount: 56,
        color: '#e91e63',
        icon: 'fa-landmark',
        progress: 25
    },
    {
        id: 5,
        title: 'Biologia Celular',
        cardCount: 64,
        color: '#009688',
        icon: 'fa-dna',
        progress: 52
    },
    {
        id: 6,
        title: 'Marketing Digital',
        cardCount: 29,
        color: '#673ab7',
        icon: 'fa-bullhorn',
        progress: 38
    }
];

// Function to initialize the decks page
export function initDecksPage() {
    loadDecks();
    setupEventListeners();
}

// Function to load decks from API (mocked for now)
function loadDecks() {
    renderDecks(mockDecks);
}

// Function to render decks to the page
function renderDecks(decks) {
    const decksContainer = document.querySelector('.decks-grid');
    if (!decksContainer) return;

    decksContainer.innerHTML = '';

    // Add the "Create New Deck" card first
    const createDeckCard = document.createElement('div');
    createDeckCard.className = 'deck-card create-deck';
    createDeckCard.innerHTML = `
        <div class="deck-card-inner">
            <div class="deck-card-icon">
                <i class="fas fa-plus"></i>
            </div>
            <h3 class="deck-card-title">Criar Novo Deck</h3>
        </div>
    `;
    decksContainer.appendChild(createDeckCard);

    // Then add all deck cards
    decks.forEach(deck => {
        const deckCard = document.createElement('div');
        deckCard.className = 'deck-card';
        deckCard.dataset.deckId = deck.id;
        deckCard.innerHTML = `
            <div class="deck-card-inner" style="border-top: 4px solid ${deck.color}">
                <div class="deck-card-header">
                    <div class="deck-card-icon" style="background-color: ${deck.color}">
                        <i class="fas ${deck.icon}"></i>
                    </div>
                    <div class="deck-actions">
                        <button class="deck-action-btn edit-deck" aria-label="Editar deck">
                            <i class="fas fa-pencil"></i>
                        </button>
                        <button class="deck-action-btn delete-deck" aria-label="Excluir deck">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <h3 class="deck-card-title">${deck.title}</h3>
                <div class="deck-card-stats">
                    <div class="deck-stat">
                        <i class="fas fa-clone"></i>
                        <span>${deck.cardCount} cartões</span>
                    </div>
                </div>
                <div class="deck-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${deck.progress}%; background-color: ${deck.color}"></div>
                    </div>
                    <div class="progress-text">${deck.progress}% dominado</div>
                </div>
                <div class="deck-card-actions">
                    <button class="btn-secondary study-deck">
                        <i class="fas fa-book-open"></i>
                        Estudar
                    </button>
                    <button class="btn-secondary view-deck">
                        <i class="fas fa-eye"></i>
                        Ver cartões
                    </button>
                </div>
            </div>
        `;
        decksContainer.appendChild(deckCard);
    });
}

// Helper function to display relative time (e.g. "hoje", "ontem", "há 3 dias")
function getRelativeTimeString(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'hoje';
    if (diffDays === 1) return 'ontem';
    return `há ${diffDays} dias`;
}

// Setup event listeners for the decks page
function setupEventListeners() {
    const decksContainer = document.querySelector('.decks-grid');
    if (!decksContainer) return;

    // Delegation for deck actions
    decksContainer.addEventListener('click', (event) => {
        // Study deck button
        if (event.target.closest('.study-deck')) {
            const deckCard = event.target.closest('.deck-card');
            const deckId = deckCard.dataset.deckId;
            handleStudyDeck(deckId);
        }

        // View cards button
        else if (event.target.closest('.view-deck')) {
            const deckCard = event.target.closest('.deck-card');
            const deckId = deckCard.dataset.deckId;
            handleViewDeck(deckId);
        }

        // Edit deck button
        else if (event.target.closest('.edit-deck')) {
            const deckCard = event.target.closest('.deck-card');
            const deckId = deckCard.dataset.deckId;
            handleEditDeck(deckId);
            event.stopPropagation();
        }

        // Delete deck button
        else if (event.target.closest('.delete-deck')) {
            const deckCard = event.target.closest('.deck-card');
            const deckId = deckCard.dataset.deckId;
            handleDeleteDeck(deckId);
            event.stopPropagation();
        }

        // Create new deck card
        else if (event.target.closest('.create-deck')) {
            handleCreateDeck();
        }
    });

    // Filter input for decks
    const deckFilter = document.querySelector('#deck-filter');
    if (deckFilter) {
        deckFilter.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            filterDecks(searchTerm);
        });
    }

    // Sort dropdown for decks
    const deckSort = document.querySelector('#deck-sort');
    if (deckSort) {
        deckSort.addEventListener('change', (event) => {
            sortDecks(event.target.value);
        });
    }
}

// Function to filter decks based on search term
function filterDecks(searchTerm) {
    const filteredDecks = mockDecks.filter(deck =>
        deck.title.toLowerCase().includes(searchTerm)
    );
    renderDecks(filteredDecks);
}

// Function to sort decks based on criteria
function sortDecks(sortCriteria) {
    let sortedDecks = [...mockDecks];

    switch (sortCriteria) {
        case 'name-asc':
            sortedDecks.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'name-desc':
            sortedDecks.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case 'cards':
            sortedDecks.sort((a, b) => b.cardCount - a.cardCount);
            break;
        case 'progress':
            sortedDecks.sort((a, b) => b.progress - a.progress);
            break;
        default:
            // Default is alphabetical
            sortedDecks.sort((a, b) => a.title.localeCompare(b.title));
    }

    renderDecks(sortedDecks);
}

// Handler functions for deck actions
function handleStudyDeck(deckId) {
    showNotification('Modo estudo iniciado', 'success');
    console.log(`Studying deck ${deckId}`);
    // Aqui entraria a lógica para iniciar o modo de estudo
}

function handleViewDeck(deckId) {
    showNotification('Visualizando cards do deck', 'info');
    console.log(`Viewing deck ${deckId}`);
    // Aqui entraria a lógica para visualizar os cards do deck
}

function handleEditDeck(deckId) {
    // Encontrar o deck pelo ID
    const deck = mockDecks.find(d => d.id == deckId);
    if (!deck) {
        showNotification('Deck não encontrado', 'error');
        return;
    }

    // Abrir o modal
    const modal = document.getElementById('deck-modal');
    if (!modal) return;

    // Alterar o título do modal
    const modalTitle = document.getElementById('deck-modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Editar Deck';
    }

    // Preencher os campos com os dados do deck
    const titleInput = document.getElementById('deck-title');
    const colorInput = document.getElementById('deck-color');
    const iconSelect = document.getElementById('deck-icon');
    const iconPreview = document.getElementById('icon-preview');

    if (titleInput) titleInput.value = deck.title;
    if (colorInput) colorInput.value = deck.color;
    if (iconSelect) {
        iconSelect.value = deck.icon;
        if (iconPreview) {
            iconPreview.className = `fas ${deck.icon}`;
        }
    }

    // Destacar a cor selecionada nos presets
    const colorPresets = document.querySelectorAll('.color-preset');
    colorPresets.forEach(preset => {
        preset.classList.remove('selected');
        if (preset.dataset.color === deck.color) {
            preset.classList.add('selected');
        }
    });

    // Abrir o modal
    modal.classList.add('active');
}

function handleDeleteDeck(deckId) {
    if (confirm('Tem certeza que deseja excluir este deck?')) {
        showNotification('Deck excluído com sucesso', 'success');
        console.log(`Deleting deck ${deckId}`);
        // Aqui entraria a lógica para excluir o deck
        // Por enquanto, vamos apenas recarregar a lista sem o deck
        const filteredDecks = mockDecks.filter(deck => deck.id != deckId);
        renderDecks(filteredDecks);
    }
}

function handleCreateDeck() {
    // showNotification('Criando novo deck', 'info'); // Removido pop-up
    const modal = document.getElementById('deck-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Exportar as funções que serão usadas em outros arquivos
export { loadDecks };

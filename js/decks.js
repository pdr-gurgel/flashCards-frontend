// Decks.js - Gerenciamento de decks de flashcards
// Importar estilos CSS para o build com Vite
import '../css/dashboard.css';
import '../css/decks.css';

// Importar funções compartilhadas
import { initTheme, toggleTheme } from './theme.js';
import axios from 'axios';
import { getToken } from './auth.js';

const API_BASE_URL = 'https://flashcards-backend-ejyn.onrender.com';

document.addEventListener('DOMContentLoaded', async function () {
    // Inicializar o tema
    initTheme();

    // Configurar botões de tema e logout
    const themeToggle = document.getElementById('theme-toggle');
    const logoutBtn = document.getElementById('logout-btn');

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

    // Event listeners para botões de tema e logout
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            // Importar a função de logout do módulo de autenticação quando estiver pronto
            window.location.href = 'login.html';
        });
    }

    // Atualizar os deck cards existentes para o novo layout com botões diretos
    updateExistingDeckCards();

    // Elementos da interface
    const createDeckCard = document.querySelector('.create-deck');
    const deckModal = document.getElementById('deck-modal');
    const confirmModal = document.getElementById('confirm-modal');
    const modalOverlays = document.querySelectorAll('.modal-overlay');
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    const saveButton = document.querySelector('.save-deck');
    const cancelButton = document.querySelector('.cancel-modal');
    const confirmDeleteButton = document.querySelector('.confirm-delete');
    const cancelDeleteButton = document.querySelector('.cancel-delete');
    // O botão de change-icon foi removido, vamos utilizar direto o selector
    const iconPicker = document.querySelector('.icon-picker');
    const iconOptions = document.querySelectorAll('.icon-option');
    const colorOptions = document.querySelectorAll('.color-option');
    // Também removemos o iconPreview, precisamos ajustar a lógica
    const colorPreview = document.querySelector('.color-preview');
    const deckMenuBtns = document.querySelectorAll('.deck-menu-btn');
    const deckForm = document.getElementById('deck-form');
    const deckTitle = document.getElementById('deck-title');
    const editButtons = document.querySelectorAll('.edit-deck');
    const deleteButtons = document.querySelectorAll('.delete-deck');
    const decksGrid = document.querySelector('.decks-grid');
    const navItems = document.querySelectorAll('.nav-item');

    // Gerenciando a navegação entre seções
    navItems.forEach(item => {
        item.addEventListener('click', function () {
            const page = this.getAttribute('data-page');
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // Redirecionar para a página correta
            if (page !== 'decks') {
                if (page === 'dashboard') {
                    window.location.href = 'dashboard.html';
                } else if (page === 'flashcards') {
                    window.location.href = 'flashcards.html';
                } else if (page === 'study') {
                    window.location.href = 'study.html';
                } else if (page === 'pomodoro') {
                    window.location.href = 'pomodoro.html';
                }
            }
        });
    });

    // Elementos de busca e ordenação
    const searchInput = document.querySelector('.search-input');
    const sortSelect = document.querySelector('.sort-select');

    // Adicionar event listeners para busca e ordenação
    if (searchInput) {
        searchInput.addEventListener('input', filterDecks);
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', sortDecks);
    }

    // Função para filtrar decks baseado na pesquisa
    function filterDecks() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const currentSort = sortSelect.value;

        // Obter todos os cartões de deck, exceto o de criação
        const deckCards = document.querySelectorAll('.deck-card:not(.create-deck)');

        // Filtrar decks baseado no termo de busca
        deckCards.forEach(card => {
            const title = card.querySelector('.deck-title').textContent.toLowerCase();
            const shouldShow = title.includes(searchTerm);

            // Mostrar ou esconder o card
            card.style.display = shouldShow ? '' : 'none';
        });

        // Aplicar ordenação atual aos resultados filtrados
        applySorting(currentSort);
    }

    // Função para ordenar os decks
    function sortDecks() {
        const sortType = sortSelect.value;
        applySorting(sortType);
    }

    // Função auxiliar para aplicar a ordenação
    function applySorting(sortType) {
        const deckCards = Array.from(document.querySelectorAll('.deck-card:not(.create-deck)'));
        const decksGrid = document.querySelector('.decks-grid');
        const createDeckCard = document.querySelector('.create-deck');

        // Ordenar os cards baseado no critério selecionado
        deckCards.sort((a, b) => {
            switch (sortType) {
                case 'az':
                    return a.querySelector('.deck-title').textContent
                        .localeCompare(b.querySelector('.deck-title').textContent);
                case 'za':
                    return b.querySelector('.deck-title').textContent
                        .localeCompare(a.querySelector('.deck-title').textContent);
                case 'cards':
                    // Extrair número de cards
                    const cardsTextA = a.querySelector('.deck-cards-count').textContent;
                    const cardsTextB = b.querySelector('.deck-cards-count').textContent;
                    const cardsCountA = parseInt(cardsTextA.match(/\d+/)[0]);
                    const cardsCountB = parseInt(cardsTextB.match(/\d+/)[0]);
                    return cardsCountB - cardsCountA; // Maior quantidade primeiro
                default:
                    return 0;
            }
        });

        // Remover os cards da grid e re-inserir na nova ordem
        deckCards.forEach(card => card.remove());

        // Inserir o card de criação primeiro
        decksGrid.appendChild(createDeckCard);

        // Inserir os cards ordenados
        deckCards.forEach(card => {
            // Só adicionar de volta se não estiver escondido pela busca
            if (card.style.display !== 'none') {
                decksGrid.appendChild(card);
            } else {
                // Adicionar cards escondidos ao final
                decksGrid.appendChild(card);
            }
        });
    }

    // Estado da aplicação
    let currentDeckId = null;
    let decks = [];

    // Função para buscar decks do backend
    async function fetchDecks() {
        try {
            const token = getToken();
            const response = await axios.get(`${API_BASE_URL}/decks`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            decks = response.data;
            renderAllDecks();
        } catch (error) {
            console.error('Erro ao buscar decks:', error);
            showNotification('Erro ao carregar decks. Faça login novamente.', 'error');
        }
    }

    // Função para renderizar todos os decks
    function renderAllDecks() {
        // Limpa todos os decks (exceto o card de criar)
        const deckCards = document.querySelectorAll('.deck-card:not(.create-deck)');
        deckCards.forEach(card => card.remove());
        // Renderiza cada deck
        decks.forEach(deck => renderDeck(deck));
    }

    // Função para abrir o modal de criação de deck
    function openCreateDeckModal() {
        openModal(deckModal);
        resetForm();
        currentDeckId = null;
        document.querySelector('.modal-title').textContent = 'Novo Deck';
    }

    // Adicionar event listener ao card de criação
    createDeckCard.addEventListener('click', openCreateDeckModal);

    // Adicionar event listener ao novo botão da barra secundária
    const newDeckButton = document.querySelector('.btn-new-deck');
    if (newDeckButton) {
        newDeckButton.addEventListener('click', openCreateDeckModal);
    }

    // Não precisa mais abrir/fechar o seletor de ícones, eles estão sempre visíveis

    // Selecionar ícone
    iconOptions.forEach(option => {
        option.addEventListener('click', function () {
            const icon = this.getAttribute('data-icon');
            iconOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            // Não temos mais iconPreview, então não precisamos atualizá-lo
        });
    });

    // Selecionar cor
    colorOptions.forEach(option => {
        option.addEventListener('click', function () {
            const color = this.getAttribute('data-color');
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            colorPreview.style.backgroundColor = color;
            iconPreview.parentElement.style.backgroundColor = color;
        });
    });

    // Navegação entre páginas
    navItems.forEach(item => {
        item.addEventListener('click', function () {
            const page = this.getAttribute('data-page');
            if (page) {
                window.location.href = page === 'dashboard' ? 'dashboard.html' : page + '.html';
            }
        });
    });

    // Mostrar menu de opções dos decks
    deckMenuBtns.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();

            // Fechar todos os menus abertos
            document.querySelectorAll('.deck-menu').forEach(menu => {
                if (menu !== this.nextElementSibling) {
                    menu.style.display = 'none';
                }
            });

            // Alternar visibilidade do menu atual
            const menu = this.nextElementSibling;
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });
    });

    // Fechar menus quando clicar fora
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.deck-options')) {
            document.querySelectorAll('.deck-menu').forEach(menu => {
                menu.style.display = 'none';
            });
        }
    });

    // Função para editar um deck
    function editDeck(deckId) {
        // Encontrar o deck no array
        const deck = decks.find(d => d.id === deckId);

        if (deck) {
            // Preencher o formulário com os dados do deck
            document.getElementById('deck-title').value = deck.title;

            // Selecionar o ícone correto
            iconOptions.forEach(option => {
                const icon = option.getAttribute('data-icon');
                if (icon === deck.icon) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            });

            // Selecionar a cor correta
            colorOptions.forEach(option => {
                const color = option.getAttribute('data-color');
                if (color === deck.color) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            });

            // Atualizar o modal
            document.querySelector('.modal-title').textContent = 'Editar Deck';
            currentDeckId = deck.id;

            // Abrir o modal
            openModal(deckModal);
        }
    }

    // Event listeners para botões de deletar são adicionados em renderDeck()

    // Fechar modais
    modalOverlays.forEach(overlay => {
        overlay.addEventListener('click', function () {
            const modal = this.parentElement;
            closeModal(modal);
        });
    });

    modalCloseButtons.forEach(button => {
        button.addEventListener('click', function () {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });

    cancelButton.addEventListener('click', function () {
        closeModal(deckModal);
    });

    cancelDeleteButton.addEventListener('click', function () {
        closeModal(confirmModal);
    });

    // Salvar deck
    saveButton.addEventListener('click', async function () {
        if (validateForm()) {
            const title = deckTitle.value;
            const selectedIcon = document.querySelector('.icon-option.selected').getAttribute('data-icon');
            const selectedColor = document.querySelector('.color-option.selected').getAttribute('data-color');

            if (currentDeckId) {
                // Atualizar deck existente via API
                const success = await updateDeck(currentDeckId, title, selectedIcon, selectedColor);
                if (success) {
                    closeModal(deckModal);
                }
            } else {
                // Criar novo deck via backend
                try {
                    const token = getToken();
                    const response = await axios.post(`${API_BASE_URL}/decks`, {
                        title,
                        icon: selectedIcon,
                        color: selectedColor
                    }, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const newDeck = response.data;
                    decks.push(newDeck);
                    renderDeck(newDeck);
                    showNotification('Novo deck criado com sucesso!', 'success');
                    closeModal(deckModal);
                } catch (error) {
                    console.error('Erro ao criar deck:', error);
                    showNotification('Erro ao criar deck. Tente novamente.', 'error');
                }
            }
        }
    });

    // Confirmar exclusão
    confirmDeleteButton.addEventListener('click', async function () {
        if (currentDeckId) {
            const success = await deleteDeck(currentDeckId);
            if (success) {
                closeModal(confirmModal);
            }
        }
    });

    // Validação do formulário
    function validateForm() {
        if (deckTitle.value.trim() === '') {
            showNotification('Por favor, insira um título para o deck.', 'error');
            return false;
        }
        return true;
    }

    // Resetar formulário
    function resetForm() {
        deckTitle.value = '';

        // Resetar ícone e cor
        const defaultIconOption = document.querySelector('.icon-option[data-icon="fa-square-root-alt"]');
        const defaultColorOption = document.querySelector('.color-option[data-color="#4f64ff"]');

        if (defaultIconOption) {
            iconOptions.forEach(opt => opt.classList.remove('selected'));
            defaultIconOption.classList.add('selected');
        }

        if (defaultColorOption) {
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            defaultColorOption.classList.add('selected');
        }

        // O seletor de ícones está sempre visível, não precisamos escondê-lo
    }

    // Abrir modal
    function openModal(modal) {
        modal.style.display = 'block';
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    }

    // Fechar modal
    function closeModal(modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    // Criar novo deck
    function createDeck(title, icon, color) {
        const newId = decks.length > 0 ? Math.max(...decks.map(d => d.id)) + 1 : 1;

        const newDeck = {
            id: newId,
            title,
            icon,
            color,
            cardsCount: 0
        };

        decks.push(newDeck);
        renderDeck(newDeck);
    }

    // Atualizar deck existente
    async function updateDeck(id, title, icon, color) {
        try {
            // Primeiro, faz a chamada para a API
            const token = getToken();
            const response = await axios.put(`${API_BASE_URL}/decks/${id}`,
                { title, icon, color },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const updatedDeck = response.data;

            // Atualizar no array local
            const index = decks.findIndex(d => d.id === id);
            if (index !== -1) {
                decks[index] = {
                    ...decks[index],
                    title: updatedDeck.title,
                    icon: updatedDeck.icon,
                    color: updatedDeck.color
                };

                // Atualizar na UI
                const deckCard = document.querySelector(`.deck-card[data-id="${id}"]`);

                if (deckCard) {
                    // Atualizar título
                    deckCard.querySelector('.deck-title').textContent = updatedDeck.title;

                    // Atualizar ícone
                    const deckIcon = deckCard.querySelector('.deck-icon i');
                    deckIcon.className = `fas ${updatedDeck.icon}`;
                    deckCard.querySelector('.deck-icon').style.backgroundColor = updatedDeck.color;
                }
            }

            // Mostrar notificação de sucesso
            showNotification('Deck atualizado com sucesso!', 'success');
            return true;
        } catch (error) {
            console.error('Erro ao atualizar deck:', error);
            showNotification('Erro ao atualizar o deck. Tente novamente.', 'error');
            return false;
        }
    }

    // Excluir deck
    async function deleteDeck(id) {
        try {
            const token = getToken();
            const response = await axios.delete(`${API_BASE_URL}/decks/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.status === 204) {
                // Remover do array
                const index = decks.findIndex(d => d.id === id);
                if (index !== -1) {
                    decks.splice(index, 1);
                }
                // Remover da UI
                const deckCard = document.querySelector(`.deck-card[data-id="${id}"]`);
                if (deckCard) {
                    deckCard.style.opacity = 0;
                    setTimeout(() => {
                        deckCard.remove();
                    }, 300);
                }
                showNotification('Deck excluído com sucesso!', 'success');
                return true;
            } else {
                showNotification('Erro ao excluir o deck. Tente novamente.', 'error');
                return false;
            }
        } catch (error) {
            console.error('Erro ao excluir deck:', error);
            showNotification('Erro ao excluir o deck. Tente novamente.', 'error');
            return false;
        }
    }

    // Renderizar um deck na interface
    function renderDeck(deck) {
        const deckTemplate = `
            <div class="deck-card" data-id="${deck.id}">
                <div class="deck-card-header">
                    <div class="deck-icon" style="background-color: ${deck.color};">
                        <i class="fas ${deck.icon}"></i>
                    </div>
                    <div class="deck-actions">
                        <button class="deck-action-btn edit-deck" title="Editar deck">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="deck-action-btn delete-deck" title="Excluir deck">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="deck-card-body">
                    <h3 class="deck-title">${deck.title}</h3>
                    <div class="deck-meta">
                        <span class="deck-cards-count"><i class="fas fa-clone"></i> ${deck.cardsCount || 0} flashcards</span>
                    </div>
                </div>
                <div class="deck-card-footer">
                    <button class="btn-deck-action study-deck">
                        <i class="fas fa-book-open"></i>
                        <span>Estudar</span>
                    </button>
                    <button class="btn-deck-action view-deck">
                        <i class="fas fa-eye"></i>
                        <span>Visualizar</span>
                    </button>
                </div>
            </div>
        `;

        // Inserir depois do card de criar
        const createCard = decksGrid.querySelector('.create-deck');
        createCard.insertAdjacentHTML('afterend', deckTemplate);

        // Adicionar event listeners aos novos botões
        const newDeckCard = decksGrid.querySelector(`.deck-card[data-id="${deck.id}"]`);

        // Botão editar - usar a função editDeck existente
        const editBtn = newDeckCard.querySelector('.edit-deck');
        editBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const deckId = parseInt(newDeckCard.getAttribute('data-id'));
            editDeck(deckId);
        });

        // Botão excluir
        const deleteBtn = newDeckCard.querySelector('.delete-deck');
        deleteBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            currentDeckId = parseInt(newDeckCard.getAttribute('data-id'));
            openModal(confirmModal);
        });

        // Botão estudar
        const studyBtn = newDeckCard.querySelector('.study-deck');
        studyBtn.addEventListener('click', function () {
            console.log(`Estudar deck: ${deck.id}`);
            // Adicionar animação ao botão estudar
            studyBtn.classList.add('btn-animated');
            setTimeout(() => {
                studyBtn.classList.remove('btn-animated');
            }, 500);
        });

        // Botão visualizar
        const viewBtn = newDeckCard.querySelector('.view-deck');
        viewBtn.addEventListener('click', function () {
            console.log(`Visualizar deck: ${deck.id}`);
            viewBtn.classList.add('btn-animated');
            setTimeout(() => {
                viewBtn.classList.remove('btn-animated');
            }, 500);
        });
    }

    // Função de inicialização de tema
    function initTheme() {
        // Verificar se há um tema salvo no localStorage
        const savedTheme = localStorage.getItem('theme');

        // Se o usuário já escolheu um tema antes, use-o
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else {
            // Tema default agora é escuro
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
    }

    // Função para alternar entre temas claro e escuro
    function toggleTheme() {
        // Verificar tema atual
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

        // Alternar para o outro tema
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        // Aplicar o novo tema
        document.documentElement.setAttribute('data-theme', newTheme);

        // Salvar preferência do usuário
        localStorage.setItem('theme', newTheme);
    }

    // Função para atualizar os deck cards existentes no HTML para o novo formato
    function updateExistingDeckCards() {
        // Selecionar todos os deck cards (exceto o de criar)
        const deckCards = document.querySelectorAll('.deck-card:not(.create-deck)');

        deckCards.forEach(card => {
            // 1. Remover o texto de "Última revisão" de todos os cards
            const lastReviewElement = card.querySelector('.deck-last-review');
            if (lastReviewElement) {
                lastReviewElement.remove();
            }

            // 2. Substituir o menu de 3 pontinhos por botões diretos
            const deckHeader = card.querySelector('.deck-card-header');
            const deckOptions = card.querySelector('.deck-options');

            if (deckOptions) {
                // Criar o novo container de ações
                const deckActions = document.createElement('div');
                deckActions.className = 'deck-actions';

                // Criar botão de editar
                const editBtn = document.createElement('button');
                editBtn.className = 'deck-action-btn edit-deck';
                editBtn.title = 'Editar deck';
                editBtn.innerHTML = '<i class="fas fa-edit"></i>';

                // Criar botão de excluir
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'deck-action-btn delete-deck';
                deleteBtn.title = 'Excluir deck';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';

                // Adicionar os botões ao container
                deckActions.appendChild(editBtn);
                deckActions.appendChild(deleteBtn);

                // Substituir o menu pelo novo container
                deckHeader.replaceChild(deckActions, deckOptions);

                // Adicionar event listeners aos novos botões
                editBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const deckId = parseInt(card.getAttribute('data-id') || card.dataset.id || '0');

                    // Usar a função editDeck que já foi criada
                    editDeck(deckId);
                });

                deleteBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    currentDeckId = parseInt(card.getAttribute('data-id') || card.dataset.id || '0');
                    openModal(confirmModal);
                });
            }

            // 2. Adicionar animação ao botão estudar
            const studyBtn = card.querySelector('.study-deck');
            if (studyBtn) {
                // Remover event listeners antigos (se houver)
                const newStudyBtn = studyBtn.cloneNode(true);
                studyBtn.parentNode.replaceChild(newStudyBtn, studyBtn);

                // Adicionar novo event listener com animação
                newStudyBtn.addEventListener('click', function () {
                    // Aplicar a animação quando clicado
                    this.classList.add('btn-animated');
                    setTimeout(() => {
                        this.classList.remove('btn-animated');
                    }, 500);
                });
            }
        });
    }

    // Sistema de notificações
    function showNotification(message, type = 'info') {
        const notificationContainer = document.getElementById('notification-container');

        const notificationEl = document.createElement('div');
        notificationEl.className = `notification ${type}`;

        const iconClass = type === 'success' ? 'fa-check-circle' :
            type === 'error' ? 'fa-times-circle' :
                type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';

        notificationEl.innerHTML = `
            <div class="notification-icon">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="notification-content">
                <p class="notification-message">${message}</p>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        notificationContainer.appendChild(notificationEl);

        // Fechar notificação ao clicar no botão
        const closeBtn = notificationEl.querySelector('.notification-close');
        closeBtn.addEventListener('click', function () {
            notificationEl.remove();
        });

        // Remover notificação após 5 segundos
        setTimeout(() => {
            if (notificationContainer.contains(notificationEl)) {
                notificationEl.style.opacity = '0';
                setTimeout(() => {
                    if (notificationContainer.contains(notificationEl)) {
                        notificationEl.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    // Inicializar
    // Atribuir IDs aos decks existentes no DOM
    const existingDeckCards = document.querySelectorAll('.deck-card:not(.create-deck)');
    existingDeckCards.forEach((card, index) => {
        card.setAttribute('data-id', index + 1);
    });

    // Chama fetchDecks ao carregar a página
    await fetchDecks();
});

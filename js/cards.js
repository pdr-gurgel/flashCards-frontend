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
    // Botões e controles
    newCardBtn = document.getElementById('new-card-btn');
    cardModal = document.getElementById('card-modal');
    confirmModal = document.getElementById('confirm-modal');
    cardForm = document.getElementById('card-form');

    // Lógica para controle das abas do modal de IA
    const aiTabs = document.querySelectorAll('.ai-tab');
    const aiTabPanes = document.querySelectorAll('.ai-tab-pane');
    const importJsonBtn = document.getElementById('import-json-btn');

    aiTabs.forEach(tabButton => {
        tabButton.addEventListener('click', () => {
            const tabName = tabButton.dataset.tab;

            // Atualiza o estado 'active' dos botões das abas
            aiTabs.forEach(btn => btn.classList.remove('active'));
            tabButton.classList.add('active');

            // Atualiza o estado 'active' dos painéis das abas
            aiTabPanes.forEach(pane => {
                if (pane.id === `tab-${tabName}`) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });

            // Habilita/desabilita o botão de importação com base na aba ativa
            if (importJsonBtn) {
                importJsonBtn.disabled = (tabName !== 'importar');
            }
        });
    });



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
    // Novo card
    if (newCardBtn) {
        newCardBtn.addEventListener('click', function (e) {
            openCardModal();
        });
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

    // Configurar botão de geração com IA
    const generateAIBtn = document.getElementById('generate-ai-btn');
    const aiModal = document.getElementById('ai-modal');

    if (generateAIBtn && aiModal) {
        // Elementos do formulário
        const aiForm = document.getElementById('ai-generate-form');
        const aiTema = document.getElementById('ai-tema');
        const aiQuantidade = document.getElementById('ai-quantidade');
        const aiDificuldade = document.getElementById('ai-dificuldade');
        const aiPrompt = document.getElementById('ai-prompt');
        const aiJson = document.getElementById('ai-json');
        const copyPromptBtn = document.getElementById('copy-prompt');
        const importJsonBtn = document.getElementById('import-json-btn');
        const nextToImportBtn = document.getElementById('next-to-import');
        const backToPromptBtn = document.getElementById('back-to-prompt');
        const aiDeckSelect = document.getElementById('ai-deck-select');



        // Elementos das abas
        const aiTabs = document.querySelectorAll('.ai-tab');
        const aiTabPanes = document.querySelectorAll('.ai-tab-pane');

        // Função para alternar entre abas
        const switchTab = (tabId) => {
            // Atualizar abas
            aiTabs.forEach(tab => {
                if (tab.dataset.tab === tabId) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });

            // Atualizar painéis
            aiTabPanes.forEach(pane => {
                if (pane.id === `tab-${tabId}`) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });

            // Rolar para o topo do painel
            const activePane = document.querySelector(`#tab-${tabId}`);
            if (activePane) {
                activePane.scrollTo(0, 0);
            }
        };

        // Configurar eventos das abas
        aiTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                if (tabId) {
                    switchTab(tabId);
                }
            });
        });

        // Configurar botões de navegação
        if (nextToImportBtn) {
            nextToImportBtn.addEventListener('click', () => {
                // Validar se o tema foi preenchido
                if (!aiTema.value.trim()) {
                    showNotification('Por favor, informe o tema dos flashcards', 'error');
                    aiTema.focus();
                    return;
                }

                // Gerar prompt antes de mudar de aba
                generatePrompt();

                // Mudar para a aba de importação
                switchTab('importar');

                // Rolar para o topo e focar no campo de JSON
                setTimeout(() => {
                    const container = document.querySelector('.ai-tab-pane.active');
                    if (container) container.scrollTop = 0;
                    if (aiJson) aiJson.focus();
                }, 10);
            });
        }

        if (backToPromptBtn) {
            backToPromptBtn.addEventListener('click', () => {
                switchTab('gerar');
            });
        }

        // Função para gerar o prompt
        const generatePrompt = () => {
            const tema = aiTema.value.trim();
            const quantidade = aiQuantidade.value;
            const dificuldade = aiDificuldade.value;

            if (!tema) return;

            const promptText = `Atue como um professor experiente e especialista no tema "${tema}", com habilidade para criar materiais de estudo claros e didáticos.
Sua tarefa é criar ${quantidade} flashcards sobre "${tema}" com nível de dificuldade ${dificuldade}.
Instruções importantes:
- Seja preciso e objetivo, garantindo que cada pergunta seja clara e cada resposta correta.
- Adapte a complexidade das perguntas conforme o nível de dificuldade solicitado.
- Use exemplos e contextualizações sempre que possível, para facilitar a memorização.
- Mantenha a linguagem coerente com o público-alvo (ensino médio, vestibular, ou universitário).
- Garanta que o conteúdo seja cientificamente correto e atualizado.

Por favor, retorne APENAS um array JSON válido, onde cada item é um objeto com as seguintes propriedades:
- question: A pergunta do flashcard
- response: A resposta do flashcard
- difficulty: Nível de dificuldade (1 a 3, sendo 1 fácil e 3 difícil)

Exemplo de formato esperado:
[
  {
    "question": "Pergunta exemplo 1?",
    "response": "Resposta exemplo 1.",
    "difficulty": 1
  },
  {
    "question": "Pergunta exemplo 2?",
    "response": "Resposta exemplo 2.",
    "difficulty": 2
  }
]
Retorne apenas o array JSON.  
`;

            aiPrompt.value = promptText;
            return promptText;
        };

        // Atualizar prompt quando os campos mudarem
        [aiTema, aiQuantidade, aiDificuldade].forEach(input => {
            input.addEventListener('input', generatePrompt);
            input.addEventListener('change', generatePrompt);
        });

        // Copiar prompt para área de transferência
        if (copyPromptBtn) {
            copyPromptBtn.addEventListener('click', () => {
                aiPrompt.select();
                document.execCommand('copy');

                // Feedback visual
                const originalText = copyPromptBtn.innerHTML;
                copyPromptBtn.innerHTML = '<i class="fas fa-check"></i>';
                copyPromptBtn.disabled = true;

                setTimeout(() => {
                    copyPromptBtn.innerHTML = originalText;
                    copyPromptBtn.disabled = false;
                }, 2000);
            });
        }

        // Validar JSON ao digitar
        const validateJson = (jsonString) => {
            if (!jsonString.trim()) {
                return { isValid: false, error: 'Por favor, cole o JSON aqui' };
            }

            try {
                const json = JSON.parse(jsonString);

                if (!Array.isArray(json)) {
                    throw new Error('O JSON deve ser um array');
                }

                if (json.length === 0) {
                    throw new Error('O array não pode estar vazio');
                }

                if (json.length > 100) {
                    throw new Error('Máximo de 100 cards por importação');
                }

                // Validar estrutura de cada card
                for (let i = 0; i < json.length; i++) {
                    const card = json[i];

                    if (typeof card !== 'object' || card === null) {
                        throw new Error(`Item ${i + 1} deve ser um objeto`);
                    }

                    if (!card.question || typeof card.question !== 'string' || !card.question.trim()) {
                        throw new Error(`Card ${i + 1}: 'question' é obrigatório e deve ser um texto não vazio`);
                    }

                    if (!card.response || typeof card.response !== 'string' || !card.response.trim()) {
                        throw new Error(`Card ${i + 1}: 'response' é obrigatório e deve ser um texto não vazio`);
                    }

                    if (card.question.length > 1000) {
                        throw new Error(`Card ${i + 1}: 'question' muito longa (máximo 1000 caracteres)`);
                    }

                    if (card.response.length > 2000) {
                        throw new Error(`Card ${i + 1}: 'response' muito longa (máximo 2000 caracteres)`);
                    }

                    // Validar dificuldade se fornecida
                    if (card.difficulty !== undefined) {
                        const diff = parseInt(card.difficulty);
                        if (isNaN(diff) || diff < 1 || diff > 3) {
                            throw new Error(`Card ${i + 1}: 'difficulty' deve ser 1, 2 ou 3`);
                        }
                    }
                }

                return { isValid: true, data: json };
            } catch (e) {
                return { isValid: false, error: e.message };
            }
        };

        // Validação e feedback em tempo real para o JSON
        if (aiJson) {
            const jsonFeedback = document.createElement('div');
            jsonFeedback.className = 'json-feedback';
            jsonFeedback.style.cssText = `
                margin-top: 8px;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 0.85rem;
                line-height: 1.4;
                display: none;
            `;
            aiJson.parentNode.appendChild(jsonFeedback);

            aiJson.addEventListener('input', () => {
                const { isValid, data, error } = validateJson(aiJson.value);

                console.log('Validação JSON:', { isValid, data, error, buttonElement: importJsonBtn });

                if (aiJson.value.trim() === '') {
                    // Campo vazio
                    importJsonBtn.disabled = true;
                    aiJson.classList.remove('error');
                    importJsonBtn.textContent = 'Importar Cards';
                    jsonFeedback.style.display = 'none';
                } else if (isValid) {
                    // JSON válido
                    importJsonBtn.disabled = false;
                    aiJson.classList.remove('error');
                    const cardCount = data.length;
                    importJsonBtn.textContent = `Importar ${cardCount} Card${cardCount !== 1 ? 's' : ''}`;

                    console.log('Botão habilitado:', importJsonBtn.disabled);

                    // Mostrar feedback positivo
                    jsonFeedback.style.display = 'block';
                    jsonFeedback.style.backgroundColor = 'rgba(53, 189, 111, 0.1)';
                    jsonFeedback.style.color = '#35bd6f';
                    jsonFeedback.style.border = '1px solid rgba(53, 189, 111, 0.3)';
                    jsonFeedback.innerHTML = `<i class="fas fa-check-circle"></i> ${cardCount} card${cardCount !== 1 ? 's' : ''} válido${cardCount !== 1 ? 's' : ''} encontrado${cardCount !== 1 ? 's' : ''}`;
                } else {
                    // JSON inválido
                    importJsonBtn.disabled = true;
                    aiJson.classList.add('error');
                    importJsonBtn.textContent = 'Importar Cards';

                    // Mostrar feedback de erro
                    jsonFeedback.style.display = 'block';
                    jsonFeedback.style.backgroundColor = 'rgba(255, 77, 79, 0.1)';
                    jsonFeedback.style.color = '#ff4d4f';
                    jsonFeedback.style.border = '1px solid rgba(255, 77, 79, 0.3)';
                    jsonFeedback.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error}`;
                }
            });
        }

        // Evento de clique para o botão de importação
        if (importJsonBtn) {
            importJsonBtn.addEventListener('click', async (event) => {
                event.preventDefault();

                // Se o botão estiver desabilitado, não fazer nada
                if (importJsonBtn.disabled) {
                    return;
                }
                const deckId = aiDeckSelect.value;
                const jsonContent = aiJson.value;
                const originalButtonText = importJsonBtn.textContent;

                if (!deckId) {
                    showNotification('Por favor, selecione um deck primeiro.', 'error');
                    aiDeckSelect.focus();
                    return;
                }

                if (!jsonContent.trim()) {
                    showNotification('Por favor, cole o JSON com os cards.', 'error');
                    aiJson.focus();
                    return;
                }

                const { isValid, data: cards, error } = validateJson(jsonContent);
                if (!isValid) {
                    showNotification(`Erro na validação: ${error}`, 'error');
                    return;
                }

                // Confirmação antes de importar muitos cards
                if (cards.length > 20) {
                    const confirmed = confirm(`Você está prestes a importar ${cards.length} cards. Deseja continuar?`);
                    if (!confirmed) {
                        return;
                    }
                }

                try {
                    importJsonBtn.disabled = true;
                    importJsonBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';

                    await importCardsFromJson(cards, deckId);

                    // Limpar o formulário após sucesso
                    if (aiForm) aiForm.reset();
                    if (aiJson) aiJson.value = '';
                    if (aiPrompt) aiPrompt.value = '';

                    closeModal(aiModal);
                } catch (err) {
                    // A função importCardsFromJson já mostra a notificação de erro
                    console.error('Falha no processo de importação:', err);
                } finally {
                    importJsonBtn.disabled = false;
                    importJsonBtn.innerHTML = originalButtonText;
                }
            });
        }

        // Abrir modal ao clicar no botão
        generateAIBtn.addEventListener('click', () => {
            // Limpar campos ao abrir o modal
            if (aiForm) aiForm.reset();
            if (aiJson) aiJson.value = '';
            if (aiPrompt) aiPrompt.value = '';
            importJsonBtn.disabled = true;

            // Abrir o modal
            openModal(aiModal);

            // Mudar para a aba de importação como padrão
            switchTab('importar');

            // Pré-selecionar o deck atual no modal de IA, se aplicável
            const currentDeckId = new URLSearchParams(window.location.search).get('id');
            if (currentDeckId && aiDeckSelect) {
                aiDeckSelect.value = currentDeckId;
            }

            // Focar no campo de JSON após um pequeno delay para garantir a renderização
            setTimeout(() => {
                if (aiJson) {
                    aiJson.focus();
                }
            }, 150);
        });

        // Fechar modal ao clicar no botão de cancelar
        const aiModalCancel = aiModal.querySelector('.cancel-modal');
        if (aiModalCancel) {
            aiModalCancel.addEventListener('click', () => closeModal(aiModal));
        }

        // Botão de exemplo JSON
        const exampleJsonBtn = document.getElementById('example-json-btn');
        if (exampleJsonBtn) {
            exampleJsonBtn.addEventListener('click', () => {
                const exampleJson = [
                    {
                        "question": "O que é JavaScript?",
                        "response": "JavaScript é uma linguagem de programação interpretada estruturada, de script em alto nível com tipagem dinâmica fraca e multiparadigma.",
                        "difficulty": 1
                    },
                    {
                        "question": "Quais são os tipos de dados primitivos em JavaScript?",
                        "response": "Os tipos primitivos são: number, string, boolean, undefined, null, symbol e bigint.",
                        "difficulty": 2
                    },
                    {
                        "question": "Como funciona o hoisting em JavaScript?",
                        "response": "Hoisting é um comportamento onde declarações de variáveis e funções são movidas para o topo do escopo antes da execução do código.",
                        "difficulty": 3
                    }
                ];

                aiJson.value = JSON.stringify(exampleJson, null, 2);
                // Disparar evento de input para atualizar a validação
                aiJson.dispatchEvent(new Event('input'));
            });
        }
    } else {
        console.error('Botão de geração com IA ou modal não encontrado no DOM!');
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
        document.getElementById('card-deck'),
        document.getElementById('ai-deck-select') // Adicionado seletor do modal de IA
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
 * Importa múltiplos cards para um deck via API
 * @param {Array<Object>} cardsToImport - Lista de cards a serem importados
 * @param {number} deckId - ID do deck de destino
 */
const importCardsFromJson = async (cardsToImport, deckId) => {
    if (!Array.isArray(cardsToImport) || cardsToImport.length === 0) {
        throw new Error('O array de cards está vazio ou é inválido');
    }

    if (!deckId) {
        throw new Error('ID do deck é obrigatório');
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Usuário não autenticado.', 'error');
            window.location.href = 'index.html';
            return;
        }

        const response = await api.post(`/decks/${deckId}/cards/import`, {
            cards: cardsToImport
        });

        if (response.status === 201) {
            const message = response.data.message || `${cardsToImport.length} cards importados com sucesso!`;
            showNotification(message, 'success');

            // Recarrega a lista de cards
            await loadCards();
        } else {
            throw new Error(response.data.error || 'Erro inesperado ao importar cards');
        }
    } catch (error) {
        console.error('Erro na importação de cards:', error);

        let errorMessage = 'Erro desconhecido ao importar cards';

        if (error.response?.status === 404) {
            errorMessage = 'Deck não encontrado ou você não tem permissão para acessá-lo';
        } else if (error.response?.status === 401) {
            errorMessage = 'Sessão expirada. Faça login novamente';
            // Redirecionar para login após um tempo
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else if (error.response?.status === 400) {
            errorMessage = error.response.data.error || 'Dados inválidos fornecidos';
        } else if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
        } else if (error.message) {
            errorMessage = error.message;
        }

        showNotification(`Erro ao importar: ${errorMessage}`, 'error');
        throw error; // Re-throw para ser capturado pelo handler principal
    }
};

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
    console.log('Verificando decks disponíveis:', { decks, isArray: Array.isArray(decks), length: decks?.length });
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
        document.getElementById('card-id').value = cardId;
        document.getElementById('card-id').value = cardId; // Preenche campo hidden
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
            document.getElementById('card-id').value = '';

            document.getElementById('card-id').value = ''; // Limpa campo hidden
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
    const form = document.getElementById('card-form');
    if (!form) {
        console.error('Form not found');
        return;
    }
    const cardId = document.getElementById('card-id').value;
    console.log('saveCard function called');
    const saveButton = form.querySelector('button[type="submit"]');
    let originalButtonText = '';
    if (saveButton) {
        originalButtonText = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    }
    const cardData = {
        question: form.elements['question'].value,
        response: form.elements['response'].value,
        deck_id: form.elements['deck_id'].value,
        difficulty: form.elements['difficulty'].value,
        question: form.elements['question'].value,
        response: form.elements['response'].value,
        deck_id: form.elements['deck_id'].value,
        difficulty: form.elements['difficulty'].value,
    };
    try {
        if (cardId) {
            // Edição: atualizar card existente
            await api.put(`/cards/${cardId}`, cardData);
            showNotification('Card atualizado com sucesso!', 'success');
        } else {
            // Criação: novo card
            await api.post(`/decks/${cardData.deck_id}/cards`, cardData);
            showNotification('Card criado com sucesso!', 'success');
        }
        closeModal(cardModal);
        loadCards();
    } catch (error) {
        console.error('Erro ao salvar o card:', error);
        const errorMessage = error.response?.data?.error || 'Erro ao salvar o card. Tente novamente.';
        showNotification(errorMessage, 'error');
    } finally {
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

// Importar estilos CSS
import '../css/main.css';
import '../css/dashboard.css';

// Importando funções de autenticação
import { protectRoute, getCurrentUser, logout } from './auth.js';

// Importando funções de tema
import { initTheme, toggleTheme } from './theme.js';

// Dashboard functionality
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
                case 'cards':
                    window.location.href = 'cards.html';
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

    // Set up calendar
    setupCalendar();

    // Handle card clicks
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', function () {
            const cardType = this.dataset.type;

            // Navigate to appropriate page based on card type
            switch (cardType) {
                case 'decks':
                    // Navigate to decks page
                    window.location.href = 'decks.html';
                    break;
                case 'flashcards':
                    // Navigate to cards page
                    window.location.href = 'cards.html';
                    break;
                case 'study':
                    // Navigate to study mode
                    console.log('Starting study mode');
                    break;
                case 'pomodoro':
                    // Navigate to pomodoro timer
                    console.log('Starting pomodoro timer');
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

    // Autenticação já verificada no início da função
});

// Funções de tema importadas do theme.js

// Variáveis globais para controlar o mês e ano atual do calendário
let currentViewMonth;
let currentViewYear;

function setupCalendar() {
    const calendarDays = document.querySelector('.calendar-days');
    if (!calendarDays) return;

    // Inicializar com o mês atual
    const today = new Date();
    currentViewMonth = today.getMonth();
    currentViewYear = today.getFullYear();

    // Renderizar o calendário com o mês/ano atual
    renderCalendar(calendarDays, currentViewMonth, currentViewYear);

    // Add event listeners to navigation buttons
    const prevBtn = document.querySelector('.calendar-btn:first-child');
    const nextBtn = document.querySelector('.calendar-btn:last-child');

    if (prevBtn) {
        prevBtn.addEventListener('click', function () {
            // Implementando navegação para o mês anterior
            currentViewMonth--;
            if (currentViewMonth < 0) {
                currentViewMonth = 11;
                currentViewYear--;
            }
            renderCalendar(calendarDays, currentViewMonth, currentViewYear);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            // Implementando navegação para o próximo mês
            currentViewMonth++;
            if (currentViewMonth > 11) {
                currentViewMonth = 0;
                currentViewYear++;
            }
            renderCalendar(calendarDays, currentViewMonth, currentViewYear);
        });
    }
}


// Função separada para renderizar o calendário
function renderCalendar(calendarDays, month, year) {
    // Atualizar título do calendário
    const calendarTitle = document.querySelector('.calendar-title');
    if (calendarTitle) {
        const date = new Date(year, month);
        const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
        calendarTitle.textContent = `Calendário de Estudos - ${monthName} ${year}`;
    }

    // Get first day of month and days in month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Clear calendar
    calendarDays.innerHTML = '';

    // Add day headers
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendarDays.appendChild(dayHeader);
    });

    // Add empty days before first day of month
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        emptyDay.innerHTML = '&nbsp;';
        calendarDays.appendChild(emptyDay);
    }

    // Define events (para demonstração - isso pode ser substituído por dados reais)
    const events = [8, 12, 15, 21, 28]; // Dias com eventos

    // Obter data atual para destacar o dia de hoje
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        day.textContent = i;

        // Mark today (somente se estivermos no mês e ano atual)
        if (i === currentDay && month === currentMonth && year === currentYear) {
            day.classList.add('today');
        }

        // Mark days with events
        if (events.includes(i)) {
            day.classList.add('has-events');
        }

        day.addEventListener('click', function () {
            // Deselect all days
            document.querySelectorAll('.calendar-day').forEach(d => {
                if (d !== day) d.classList.remove('selected');
            });

            // Toggle selected class
            this.classList.toggle('selected');

            // Here you can add functionality for selected dates
            console.log(`Selected date: ${i}/${month + 1}/${year}`);
        });

        calendarDays.appendChild(day);
    }
}

// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar o tema
    initTheme();
    // Get current user info from localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
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
        item.addEventListener('click', function() {
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Handle navigation actions if needed
            // For now, we'll just highlight the active item
        });
    });
    
    // Set up calendar
    setupCalendar();
    
    // Handle card clicks
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', function() {
            const cardType = this.dataset.type;
            
            // Navigate to appropriate page based on card type
            switch(cardType) {
                case 'decks':
                    // Navigate to decks page or show decks section
                    console.log('Navigating to decks');
                    break;
                case 'flashcards':
                    // Navigate to cards page or show cards section
                    console.log('Navigating to flashcards');
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
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });
    }
    
    // Theme toggle handler
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            toggleTheme();
        });
    }
    
    // Check if user is authenticated, redirect to login if not
    checkAuthentication();
});

function checkAuthentication() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
    }
}

// Funções de gerenciamento de tema
function initTheme() {
    // Verificar se há um tema salvo no localStorage
    const savedTheme = localStorage.getItem('theme');
    
    // Se o usuário já escolheu um tema antes, use-o
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        // Se o usuário preferir tema escuro no sistema e não tiver escolhido um tema manualmente
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            // Padrão: tema claro
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    }
}

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

function setupCalendar() {
    const calendarDays = document.querySelector('.calendar-days');
    if (!calendarDays) return;
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Update calendar title
    const calendarTitle = document.querySelector('.calendar-title');
    if (calendarTitle) {
        const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(today);
        calendarTitle.textContent = `Calendário de Estudos - ${monthName} ${currentYear}`;
    }
    
    // Get first day of month and days in month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
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
    
    // Define events (for demonstration - you can replace with actual data)
    const events = [8, 12, 15, 21, 28]; // Days with events
    
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        day.textContent = i;
        
        // Mark today
        if (i === today.getDate()) {
            day.classList.add('today');
        }
        
        // Mark days with events
        if (events.includes(i)) {
            day.classList.add('has-events');
        }
        
        day.addEventListener('click', function() {
            // Deselect all days
            document.querySelectorAll('.calendar-day').forEach(d => {
                if (d !== day) d.classList.remove('selected');
            });
            
            // Toggle selected class
            this.classList.toggle('selected');
            
            // Here you can add functionality for selected dates
            console.log(`Selected date: ${i}/${currentMonth + 1}/${currentYear}`);
        });
        
        calendarDays.appendChild(day);
    }
    
    // Add event listeners to navigation buttons
    const prevBtn = document.querySelector('.calendar-btn:first-child');
    const nextBtn = document.querySelector('.calendar-btn:last-child');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            // Here you would implement previous month view
            console.log('Previous month');
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            // Here you would implement next month view
            console.log('Next month');
        });
    }
}

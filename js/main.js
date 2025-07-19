/**
 * Arquivo JavaScript principal que importa e inicializa todos os módulos
 */
import { initTabs } from './tabs.js';
import { initForms } from './forms.js';
import '../css/main.css';

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initForms();
});

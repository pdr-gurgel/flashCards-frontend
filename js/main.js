/**
 * Arquivo JavaScript principal que importa e inicializa todos os módulos
 */
import { initTabs } from './tabs.js';
import { initForms } from './forms.js';

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initForms();
});

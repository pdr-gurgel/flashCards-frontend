/**
 * Sistema de notificações
 */
// Exportar diretamente a função
export function showNotification(message, type) {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Adicionar ao DOM
    document.body.appendChild(notification);

    // Adicionar classe para mostrar com animação
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Remover após 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

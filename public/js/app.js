// TandaPay Simple - JavaScript básico
console.log('📱 TandaPay Simple cargado');

// Funciones básicas para la página principal (redirigir a dashboard si ya está logueado)
document.addEventListener('DOMContentLoaded', function() {
    const userData = localStorage.getItem('user');
    if (userData && window.location.pathname === '/') {
        window.location.href = '/dashboard';
    }
});

// Función simple para manejar errores
function handleError(error) {
    console.error('Error:', error);
    alert('Hubo un error. Por favor intenta de nuevo.');
}

// Función para formatear números como moneda
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}
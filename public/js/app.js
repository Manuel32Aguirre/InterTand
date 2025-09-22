console.log('InterTand cargado');

document.addEventListener('DOMContentLoaded', function() {
    const userData = localStorage.getItem('user');
    if (userData && window.location.pathname === '/') {
        window.location.href = '/dashboard';
    }
});

function handleError(error) {
    console.error('Error:', error);
    alert('Hubo un error. Por favor intenta de nuevo.');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}
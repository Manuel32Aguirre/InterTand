// TandaPay - JavaScript Frontend Application
const API_BASE_URL = '/api';

// Estado global de la aplicación
let currentUser = null;
let tandas = [];

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 TandaPay inicializando...');
    verificarEstadoAPI();
    cargarTandas();
    actualizarEstadisticas();
});

// Verificar el estado de la API
async function verificarEstadoAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/status`);
        const data = await response.json();
        
        const statusElement = document.getElementById('apiStatus');
        if (response.ok) {
            statusElement.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-2"></i>Sistema Operativo';
            statusElement.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800';
        } else {
            throw new Error('API no disponible');
        }
    } catch (error) {
        console.error('Error verificando API:', error);
        const statusElement = document.getElementById('apiStatus');
        statusElement.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>Sistema Fuera de Línea';
        statusElement.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800';
    }
}

// Cargar todas las tandas disponibles
async function cargarTandas() {
    try {
        const response = await fetch(`${API_BASE_URL}/tandas`);
        const data = await response.json();
        tandas = data.tandas || [];
        mostrarTandas();
    } catch (error) {
        console.error('Error cargando tandas:', error);
        mostrarError('No se pudieron cargar las tandas');
    }
}

// Mostrar tandas en la interfaz
function mostrarTandas() {
    const container = document.getElementById('tandasContainer');
    
    if (tandas.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-coins text-gray-400 text-6xl mb-4"></i>
                <h3 class="text-lg font-medium text-gray-900 mb-2">No hay tandas disponibles</h3>
                <p class="text-gray-500">¡Sé el primero en crear una tanda!</p>
                <button onclick="crearTanda()" class="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
                    <i class="fas fa-plus mr-2"></i>Crear Primera Tanda
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = tandas.map(tanda => `
        <div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow">
            <div class="p-6">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-900">${tanda.name}</h3>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(tanda.status)}">
                        ${getStatusText(tanda.status)}
                    </span>
                </div>
                
                <div class="mt-4 space-y-2">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Monto Total:</span>
                        <span class="font-medium">$${tanda.totalAmount.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Participantes:</span>
                        <span class="font-medium">${tanda.participants}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Pago Mensual:</span>
                        <span class="font-medium">$${tanda.monthlyPayment.toLocaleString()}</span>
                    </div>
                    ${tanda.nextDraw ? `
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Próximo Sorteo:</span>
                        <span class="font-medium">${formatDate(tanda.nextDraw)}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="mt-6">
                    <button onclick="verDetalleTanda(${tanda.id})" class="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                        <i class="fas fa-eye mr-2"></i>Ver Detalles
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Actualizar estadísticas del dashboard
async function actualizarEstadisticas() {
    try {
        // Simulamos datos por ahora
        document.getElementById('tandasActivas').textContent = tandas.length || '0';
        document.getElementById('totalDistribuido').textContent = '$' + (tandas.length * 12000).toLocaleString();
        document.getElementById('proximoSorteo').textContent = '3 días';
    } catch (error) {
        console.error('Error actualizando estadísticas:', error);
    }
}

// Crear nueva tanda
async function crearTanda() {
    const modal = crearModalCrearTanda();
    document.body.appendChild(modal);
}

// Crear modal para nueva tanda
function crearModalCrearTanda() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Crear Nueva Tanda</h3>
                    <button onclick="cerrarModal(this)" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <form onsubmit="enviarFormularioTanda(event)">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Nombre de la Tanda</label>
                            <input type="text" name="name" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                   placeholder="Ej: Tanda Navideña 2025">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Número de Participantes</label>
                            <input type="number" name="participants" required min="3" max="24"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                   placeholder="12">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Pago Mensual ($)</label>
                            <input type="number" name="monthlyPayment" required min="100"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                   placeholder="1000">
                        </div>
                        
                        <div class="bg-gray-50 p-3 rounded-md">
                            <p class="text-sm text-gray-600">
                                <i class="fas fa-info-circle mr-1"></i>
                                El monto total se calculará automáticamente
                            </p>
                        </div>
                    </div>
                    
                    <div class="mt-6 flex space-x-3">
                        <button type="button" onclick="cerrarModal(this)" 
                                class="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" 
                                class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                            <i class="fas fa-plus mr-2"></i>Crear Tanda
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    return modal;
}

// Enviar formulario de nueva tanda
async function enviarFormularioTanda(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const participants = parseInt(formData.get('participants'));
    const monthlyPayment = parseInt(formData.get('monthlyPayment'));
    
    const tandaData = {
        name: formData.get('name'),
        participants,
        monthlyPayment,
        totalAmount: participants * monthlyPayment
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/tandas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tandaData)
        });
        
        if (response.ok) {
            const result = await response.json();
            mostrarExito('Tanda creada exitosamente');
            cerrarModal(event.target);
            cargarTandas(); // Recargar las tandas
        } else {
            throw new Error('Error al crear la tanda');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('No se pudo crear la tanda');
    }
}

// Ver detalles de una tanda
async function verDetalleTanda(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/tandas/${id}`);
        const data = await response.json();
        
        if (response.ok) {
            mostrarModalDetalleTanda(data.tanda);
        } else {
            throw new Error('Error al cargar los detalles');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('No se pudieron cargar los detalles de la tanda');
    }
}

// Mostrar modal con detalles de la tanda
function mostrarModalDetalleTanda(tanda) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">${tanda.name}</h3>
                    <button onclick="cerrarModal(this)" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-gray-50 p-3 rounded-md">
                            <p class="text-sm text-gray-500">Monto Total</p>
                            <p class="text-lg font-semibold">$${tanda.totalAmount.toLocaleString()}</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-md">
                            <p class="text-sm text-gray-500">Participantes</p>
                            <p class="text-lg font-semibold">${tanda.participants}</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-md">
                            <p class="text-sm text-gray-500">Pago Mensual</p>
                            <p class="text-lg font-semibold">$${tanda.monthlyPayment.toLocaleString()}</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-md">
                            <p class="text-sm text-gray-500">Estado</p>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(tanda.status)}">
                                ${getStatusText(tanda.status)}
                            </span>
                        </div>
                    </div>
                    
                    ${tanda.currentRound ? `
                    <div class="bg-blue-50 p-3 rounded-md">
                        <p class="text-sm text-blue-600">Ronda Actual: ${tanda.currentRound} de ${tanda.participants}</p>
                        ${tanda.nextDraw ? `<p class="text-sm text-blue-600">Próximo Sorteo: ${formatDate(tanda.nextDraw)}</p>` : ''}
                    </div>
                    ` : ''}
                    
                    <div class="bg-yellow-50 p-3 rounded-md">
                        <p class="text-sm text-yellow-800">
                            <i class="fas fa-info-circle mr-1"></i>
                            Los pagos se procesan automáticamente usando Interledger
                        </p>
                    </div>
                </div>
                
                <div class="mt-6 flex space-x-3">
                    <button onclick="cerrarModal(this)" 
                            class="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                        Cerrar
                    </button>
                    <button onclick="unirseATanda(${tanda.id})" 
                            class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                        <i class="fas fa-hand-paper mr-2"></i>Unirse a Tanda
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Explorar tandas disponibles
function explorarTandas() {
    document.getElementById('tandasContainer').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Unirse a una tanda
async function unirseATanda(tandaId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tandas/${tandaId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: 'demo-user' })
        });
        
        if (response.ok) {
            mostrarExito('¡Te has unido a la tanda exitosamente!');
            cargarTandas();
        } else {
            throw new Error('Error al unirse a la tanda');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('No se pudo unir a la tanda');
    }
}

// Funciones auxiliares
function getStatusBadgeClass(status) {
    const classes = {
        'active': 'bg-green-100 text-green-800',
        'recruiting': 'bg-yellow-100 text-yellow-800',
        'completed': 'bg-gray-100 text-gray-800',
        'paused': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
}

function getStatusText(status) {
    const texts = {
        'active': 'Activa',
        'recruiting': 'Reclutando',
        'completed': 'Completada',
        'paused': 'Pausada'
    };
    return texts[status] || 'Desconocido';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function cerrarModal(element) {
    const modal = element.closest('.fixed');
    if (modal) {
        modal.remove();
    }
}

function mostrarExito(mensaje) {
    mostrarNotificacion(mensaje, 'success');
}

function mostrarError(mensaje) {
    mostrarNotificacion(mensaje, 'error');
}

function mostrarNotificacion(mensaje, tipo) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        tipo === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'} mr-2"></i>
            <span>${mensaje}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

console.log('✅ TandaPay JavaScript cargado correctamente');
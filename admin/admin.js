// Placeholder for Supabase client initialization
// const { createClient } = supabase;
// const _supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

// --- Authentication ---

/**
 * Handles the login form submission.
 */
function login() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    const username = usernameInput.value;
    const password = passwordInput.value;

    // For now, use hard-coded credentials for demonstration.
    // In a real application, this would be a call to the backend/Supabase.
    if (username === 'admin' && password === 'password') {
        alert('Вход успешен!');
        // Store a session token or flag in localStorage
        localStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'dashboard.html';
    } else {
        alert('Неверное имя пользователя или пароль.');
    }
}

/**
 * Handles logout.
 */
function logout() {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
}

/**
 * Checks if the user is logged in. If not, redirects to the login page.
 * This should be called on all protected pages.
 */
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn !== 'true') {
        window.location.href = 'index.html';
    }
}


// --- Data Management ---

/**
 * Loads the list of products into the catalog table.
 */
async function loadProducts() {
    console.log('Загрузка товаров...');
    // In a real application, this would fetch data from Supabase.
    const products = [
        { id: 1, name: 'Береза повислая', type: 'лиственные', is_available: true },
        { id: 2, name: 'Липа мелколистная', type: 'лиственные', is_available: true },
        { id: 3, name: 'Клен остролистный', type: 'лиственные', is_available: false },
        { id: 4, name: 'Дуб черешчатый', type: 'лиственные', is_available: true },
        { id: 5, name: 'Ель обыкновенная', type: 'хвойные', is_available: true },
        { id: 6, name: 'Сосна обыкновенная', type: 'хвойные', is_available: true },
        { id: 7, name: 'Яблоня садовая', type: 'плодовые', is_available: false },
    ];

    const productTableBody = document.getElementById('product-list');
    if (productTableBody) {
        productTableBody.innerHTML = ''; // Clear existing rows
        products.forEach(product => {
            const row = `
                <tr class="bg-white border-b">
                    <td class="px-6 py-4 font-medium text-gray-900">${product.name}</td>
                    <td class="px-6 py-4">${product.type}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${product.is_available ? 'В наличии' : 'Под заказ'}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button class="text-blue-600 hover:text-blue-900">Редактировать</button>
                    </td>
                </tr>
            `;
            productTableBody.innerHTML += row;
        });
    }
}

/**
 * Loads the list of orders into the orders table.
 */
async function loadOrders() {
    console.log('Загрузка заявок...');
    // In a real application, this would fetch data from Supabase.
    const orders = [
        { id: 1, customer_name: 'Иван Петров', customer_phone: '+79991234567', product_name: 'Сосна обыкновенная', status: 'new' },
        { id: 2, customer_name: 'Анна Сидорова', customer_phone: '+79876543210', product_name: 'Береза повислая', status: 'in_progress' },
    ];

    const orderTableBody = document.getElementById('order-list');
    if (orderTableBody) {
        orderTableBody.innerHTML = ''; // Clear existing rows
        orders.forEach(order => {
            let statusClass = '';
            let statusText = '';
            switch (order.status) {
                case 'new':
                    statusClass = 'bg-green-100 text-green-800';
                    statusText = 'Новая';
                    break;
                case 'in_progress':
                    statusClass = 'bg-yellow-100 text-yellow-800';
                    statusText = 'В работе';
                    break;
                case 'completed':
                    statusClass = 'bg-blue-100 text-blue-800';
                    statusText = 'Завершена';
                    break;
                case 'cancelled':
                    statusClass = 'bg-red-100 text-red-800';
                    statusText = 'Отменена';
                    break;
            }

            const row = `
                <tr class="bg-white border-b">
                    <td class="px-6 py-4 font-medium text-gray-900">${order.customer_name}</td>
                    <td class="px-6 py-4">${order.customer_phone}</td>
                    <td class="px-6 py-4">${order.product_name}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button class="text-blue-600 hover:text-blue-900">Просмотр</button>
                    </td>
                </tr>
            `;
            orderTableBody.innerHTML += row;
        });
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // If we are on the login page
    const loginButton = document.querySelector('form button');
    if (loginButton && window.location.pathname.endsWith('index.html')) {
        loginButton.addEventListener('click', login);
    }

    // If we are on the dashboard page
    if (window.location.pathname.endsWith('dashboard.html')) {
        checkAuth();
        // loadProducts();
        // loadOrders();
    }
});

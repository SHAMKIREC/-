const { createClient } = supabase;
const supabaseUrl = 'https://hinicgpwkkrvexguffqo.supabase.co';
const supabaseKey = 'sb_publishable_0RkYackQ6dQUKGZuQjbyvA_Vx3LQFu5';
const _supabase = createClient(supabaseUrl, supabaseKey);

// --- Authentication ---

/**
 * Handles the login form submission.
 */
async function login() {
    const emailInput = document.getElementById('username'); // The ID is 'username', but it's used for email
    const passwordInput = document.getElementById('password');

    const email = emailInput.value;
    const password = passwordInput.value;

    const { data, error } = await _supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        alert('Ошибка входа: ' + error.message);
    } else {
        window.location.href = 'dashboard.html';
    }
}

/**
 * Handles logout.
 */
async function logout() {
    const { error } = await _supabase.auth.signOut();
    if (error) {
        console.error('Ошибка выхода:', error);
    } else {
        window.location.href = 'index.html';
    }
}

/**
 * Checks if the user is logged in. If not, redirects to the login page.
 * This should be called on all protected pages.
 */
async function checkAuth() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
    }
}


// --- Data Management ---

/**
 * Loads the list of products into the catalog table.
 */
async function loadProducts() {
    console.log('Загрузка товаров...');
    const { data: products, error } = await _supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Ошибка загрузки товаров:', error);
        return;
    }

    const productTableBody = document.getElementById('product-list');
    if (productTableBody) {
        productTableBody.innerHTML = ''; // Clear existing rows
        products.forEach(product => {
            // Stringify the product object to pass it to the onclick handler
            const productString = JSON.stringify(product).replace(/'/g, "\\'");
            const row = `
                <tr class="bg-white border-b">
                    <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">${product.name}</td>
                    <td class="px-6 py-4">${product.type}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${product.is_available ? 'В наличии' : 'Под заказ'}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button onclick='openEditProductModal(${productString})' class="font-medium text-blue-600 hover:underline">Редактировать</button>
                        <button onclick="deleteProduct(${product.id})" class="font-medium text-red-600 hover:underline ml-4">Удалить</button>
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
    const { data: orders, error } = await _supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Ошибка загрузки заявок:', error);
        return;
    }

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
                default:
                    statusClass = 'bg-gray-100 text-gray-800';
                    statusText = 'Неизвестен';
            }
            const orderString = JSON.stringify(order).replace(/'/g, "\\'");
            const row = `
                <tr class="bg-white border-b">
                    <td class="px-6 py-4">${new Date(order.created_at).toLocaleDateString('ru-RU')}</td>
                    <td class="px-6 py-4 font-medium text-gray-900">${order.customer_name}</td>
                    <td class="px-6 py-4">${order.customer_phone}</td>
                    <td class="px-6 py-4">${order.product_name}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button onclick='openOrderDetailsModal(${orderString})' class="font-medium text-blue-600 hover:underline">Просмотр</button>
                    </td>
                </tr>
            `;
            orderTableBody.innerHTML += row;
        });
    }
}

// --- Modal and Form Handling ---

function openAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function openEditProductModal(product) {
    if (!product) return;
    document.getElementById('edit-id').value = product.id;
    document.getElementById('edit-name').value = product.name;
    document.getElementById('edit-latin_name').value = product.latin_name || '';
    document.getElementById('edit-description').value = product.description || '';
    document.getElementById('edit-type').value = product.type;
    document.getElementById('edit-heights').value = product.heights ? product.heights.join(',') : '';
    document.getElementById('edit-diameter').value = product.diameter || '';
    document.getElementById('edit-root_ball').value = product.root_ball || '';
    document.getElementById('edit-image_url').value = product.image_url || '';
    document.getElementById('edit-is_available').checked = product.is_available;

    const modal = document.getElementById('editProductModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeEditProductModal() {
    const modal = document.getElementById('editProductModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function addProduct(event) {
    event.preventDefault();
    const form = document.getElementById('addProductForm');
    const formData = new FormData(form);

    const heights = formData.get('heights').split(',').map(h => h.trim()).filter(h => h);

    const newProduct = {
        name: formData.get('name'),
        latin_name: formData.get('latin_name'),
        description: formData.get('description'),
        type: formData.get('type'),
        heights: heights,
        diameter: formData.get('diameter'),
        root_ball: formData.get('root_ball'),
        is_available: formData.get('is_available') === 'on',
        image_url: formData.get('image_url')
    };

    const { data, error } = await _supabase.from('products').insert([newProduct]).select();

    if (error) {
        console.error('Ошибка добавления товара:', error);
        alert('Не удалось добавить товар: ' + error.message);
    } else {
        alert('Товар успешно добавлен!');
        form.reset();
        closeAddProductModal();
        loadProducts();
    }
}

async function updateProduct(event) {
    event.preventDefault();
    const form = document.getElementById('editProductForm');
    const formData = new FormData(form);
    const id = formData.get('id');

    const heights = formData.get('heights').split(',').map(h => h.trim()).filter(h => h);

    const updatedProduct = {
        name: formData.get('name'),
        latin_name: formData.get('latin_name'),
        description: formData.get('description'),
        type: formData.get('type'),
        heights: heights,
        diameter: formData.get('diameter'),
        root_ball: formData.get('root_ball'),
        is_available: formData.get('is_available') === 'on',
        image_url: formData.get('image_url')
    };

    const { data, error } = await _supabase.from('products').update(updatedProduct).eq('id', id).select();

    if (error) {
        console.error('Ошибка обновления товара:', error);
        alert('Не удалось обновить товар: ' + error.message);
    } else {
        alert('Товар успешно обновлен!');
        form.reset();
        closeEditProductModal();
        loadProducts();
    }
}

async function deleteProduct(id) {
    if (!confirm('Вы уверены, что хотите удалить этот товар? Это действие необратимо.')) {
        return;
    }

    const { error } = await _supabase.from('products').delete().eq('id', id);

    if (error) {
        console.error('Ошибка удаления товара:', error);
        alert('Не удалось удалить товар: ' + error.message);
    } else {
        alert('Товар успешно удален.');
        loadProducts();
    }
}


function openOrderDetailsModal(order) {
    if (!order) return;
    document.getElementById('order-id').value = order.id;
    document.getElementById('order-customer_name').textContent = order.customer_name || 'N/A';
    document.getElementById('order-customer_phone').textContent = order.customer_phone || 'N/A';
    document.getElementById('order-customer_email').textContent = order.customer_email || 'N/A';
    document.getElementById('order-delivery_address').textContent = order.delivery_address || 'N/A';
    document.getElementById('order-product_category').textContent = order.product_category || 'N/A';
    document.getElementById('order-product_name').textContent = order.product_name || 'N/A';
    document.getElementById('order-tree_height').textContent = order.tree_height || 'N/A';
    document.getElementById('order-quantity').textContent = order.quantity || 'N/A';
    document.getElementById('order-additional_info').textContent = order.additional_info || 'Нет';
    document.getElementById('order-status').value = order.status || 'new';

    document.getElementById('deleteOrderButton').onclick = () => deleteOrder(order.id);

    const modal = document.getElementById('orderDetailsModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeOrderDetailsModal() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function updateOrderStatus() {
    const orderId = document.getElementById('order-id').value;
    const newStatus = document.getElementById('order-status').value;

    const { data, error } = await _supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (error) {
        console.error('Ошибка обновления статуса:', error);
        alert('Не удалось обновить статус: ' + error.message);
    } else {
        alert('Статус заявки успешно обновлен.');
        closeOrderDetailsModal();
        loadOrders();
    }
}

async function deleteOrder(id) {
    if (!confirm('Вы уверены, что хотите удалить эту заявку? Это действие необратимо.')) {
        return;
    }

    const { error } = await _supabase.from('orders').delete().eq('id', id);

    if (error) {
        console.error('Ошибка удаления заявки:', error);
        alert('Не удалось удалить заявку: ' + error.message);
    } else {
        alert('Заявка успешно удалена.');
        closeOrderDetailsModal();
        loadOrders();
    }
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.endsWith('index.html') || path.endsWith('/admin/')) {
        const loginForm = document.querySelector('form');
        if(loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                login();
            });
        }
    } else if (path.endsWith('dashboard.html')) {
        checkAuth();
    } else if (path.endsWith('catalog.html')) {
        checkAuth();
        loadProducts();

        // Add Modal listeners
        document.querySelector('header button').addEventListener('click', openAddProductModal);
        document.getElementById('closeAddModalButton').addEventListener('click', closeAddProductModal);
        document.getElementById('addProductForm').addEventListener('submit', addProduct);

        // Edit Modal listeners
        document.getElementById('closeEditModalButton').addEventListener('click', closeEditProductModal);
        document.getElementById('editProductForm').addEventListener('submit', updateProduct);

    } else if (path.endsWith('orders.html')) {
        checkAuth();
        loadOrders();

        // Order Details Modal Listeners
        document.getElementById('closeOrderModalButton').addEventListener('click', closeOrderDetailsModal);
        document.getElementById('closeOrderModalButtonBottom').addEventListener('click', closeOrderDetailsModal);
        document.getElementById('saveOrderStatusButton').addEventListener('click', updateOrderStatus);
    }
});

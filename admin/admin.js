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


// --- Sidebar ---
function renderSidebar() {
    const path = window.location.pathname;
    const navContainer = document.getElementById('sidebar-nav');
    if (!navContainer) return;

    const navItems = [
        { href: 'dashboard.html', icon: '<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>', text: 'Дашборд' },
        { href: 'orders.html', icon: '<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>', text: 'Заявки' },
        { href: 'catalog.html', icon: '<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>', text: 'Каталог' },
        { href: 'site_management.html', icon: '<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>', text: 'Управление Сайтом' }
    ];

    let html = '';
    navItems.forEach(item => {
        const isActive = path.endsWith(item.href);
        const activeClass = isActive ? 'bg-gray-700 text-gray-100' : 'text-gray-300 hover:bg-gray-700';
        html += `<a href="${item.href}" class="flex items-center px-4 py-2 ${activeClass} rounded-md">${item.icon} ${item.text}</a>`;
    });
    navContainer.innerHTML = html;
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // Render sidebar on all admin pages except login
    if (!path.endsWith('index.html') && !path.endsWith('/admin/')) {
        renderSidebar();
    }

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
    } else if (path.endsWith('site_management.html')) {
        checkAuth();
        loadSiteContent();
        document.getElementById('save-all-content').addEventListener('click', saveSiteContent);
    }
});

// --- Site Content Management ---

async function loadSiteContent() {
    console.log("Загрузка контента сайта...");
    const { data, error } = await _supabase.from('site_content').select('*');

    if (error) {
        console.error('Ошибка загрузки контента сайта:', error);
        alert('Не удалось загрузить данные для редактирования.');
        return;
    }

    data.forEach(item => {
        const inputElement = document.getElementById(item.key);
        if (inputElement) {
            inputElement.value = item.value;
        }
    });
    console.log("Контент сайта успешно загружен в форму.");
}

async function saveSiteContent(event) {
    event.preventDefault();
    console.log("Сохранение контента сайта...");
    const form = document.getElementById('siteContentForm');
    const inputs = form.querySelectorAll('[data-key]');

    const dataToUpsert = [];
    inputs.forEach(input => {
        dataToUpsert.push({
            key: input.dataset.key,
            value: input.value
        });
    });

    if (dataToUpsert.length === 0) {
        alert("Нет данных для сохранения.");
        return;
    }

    const { error } = await _supabase.from('site_content').upsert(dataToUpsert, { onConflict: 'key' });

    if (error) {
        console.error('Ошибка сохранения контента:', error);
        alert('Ошибка при сохранении: ' + error.message);
    } else {
        alert('Контент сайта успешно обновлен!');
    }
}

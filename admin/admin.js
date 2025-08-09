const { createClient } = supabase;
const supabaseUrl = 'https://hinicgpwkkrvexguffqo.supabase.co';
const supabaseKey = 'sb_publishable_0RkYackQ6dQUKGZuQjbyvA_Vx3LQFu5';
const _supabase = createClient(supabaseUrl, supabaseKey);

// --- Authentication ---
async function login() {
    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Ошибка входа: ' + error.message);
    else window.location.href = 'dashboard.html';
}

async function logout() {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
}

async function checkAuth() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) window.location.href = 'index.html';
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
    navContainer.innerHTML = navItems.map(item => {
        const isActive = path.endsWith(item.href);
        return `<a href="${item.href}" class="flex items-center px-4 py-2 ${isActive ? 'bg-gray-700 text-gray-100' : 'text-gray-300 hover:bg-gray-700'} rounded-md">${item.icon} ${item.text}</a>`;
    }).join('');
}

// --- Data Loading ---
async function loadProducts() {
    const { data: products, error } = await _supabase.from('products').select('*').order('name', { ascending: true });
    if (error) return console.error('Ошибка загрузки товаров:', error);
    const tbody = document.getElementById('product-list');
    if (tbody) tbody.innerHTML = products.map(p => {
        const productString = JSON.stringify(p).replace(/'/g, "\\'");
        return `<tr class="bg-white border-b">
            <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">${p.name}</td>
            <td class="px-6 py-4">${p.type}</td>
            <td class="px-6 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${p.is_available ? 'В наличии' : 'Под заказ'}</span></td>
            <td class="px-6 py-4 text-right">
                <button onclick='openEditProductModal(${productString})' class="font-medium text-blue-600 hover:underline">Редактировать</button>
                <button onclick="deleteProduct(${p.id})" class="font-medium text-red-600 hover:underline ml-4">Удалить</button>
            </td>
        </tr>`;
    }).join('');
}

async function loadOrders() {
    const { data: orders, error } = await _supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return console.error('Ошибка загрузки заявок:', error);
    const tbody = document.getElementById('order-list');
    if(tbody) tbody.innerHTML = orders.map(o => {
        let sClass, sText;
        switch (o.status) {
            case 'new': sClass = 'bg-green-100 text-green-800'; sText = 'Новая'; break;
            case 'in_progress': sClass = 'bg-yellow-100 text-yellow-800'; sText = 'В работе'; break;
            case 'completed': sClass = 'bg-blue-100 text-blue-800'; sText = 'Завершена'; break;
            case 'cancelled': sClass = 'bg-red-100 text-red-800'; sText = 'Отменена'; break;
            default: sClass = 'bg-gray-100 text-gray-800'; sText = 'Неизвестен';
        }
        const orderString = JSON.stringify(o).replace(/'/g, "\\'");
        return `<tr class="bg-white border-b">
            <td class="px-6 py-4">${new Date(o.created_at).toLocaleDateString('ru-RU')}</td>
            <td class="px-6 py-4 font-medium text-gray-900">${o.customer_name}</td>
            <td class="px-6 py-4">${o.customer_phone}</td>
            <td class="px-6 py-4">${o.product_name}</td>
            <td class="px-6 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sClass}">${sText}</span></td>
            <td class="px-6 py-4 text-right"><button onclick='openOrderDetailsModal(${orderString})' class="font-medium text-blue-600 hover:underline">Просмотр</button></td>
        </tr>`;
    }).join('');
}

// --- Modals & Forms ---
function openAddProductModal() { document.getElementById('addProductModal')?.classList.remove('hidden'); }
function closeAddProductModal() { document.getElementById('addProductModal')?.classList.add('hidden'); }
function openEditProductModal(p) {
    if (!p) return;
    ['id', 'name', 'latin_name', 'description', 'type', 'diameter', 'root_ball', 'image_url'].forEach(key => {
        const el = document.getElementById(`edit-${key}`);
        if(el) el.value = p[key] || '';
    });
    document.getElementById('edit-heights').value = p.heights ? p.heights.join(',') : '';
    document.getElementById('edit-is_available').checked = p.is_available;
    document.getElementById('editProductModal')?.classList.remove('hidden');
}
function closeEditProductModal() { document.getElementById('editProductModal')?.classList.add('hidden'); }
function openOrderDetailsModal(o) {
    if (!o) return;
    document.getElementById('order-id').value = o.id;
    Object.keys(o).forEach(key => {
        const el = document.getElementById(`order-${key}`);
        if (el) el.textContent = o[key] || 'N/A';
    });
    document.getElementById('order-status').value = o.status || 'new';
    document.getElementById('deleteOrderButton').onclick = () => deleteOrder(o.id);
    document.getElementById('orderDetailsModal')?.classList.remove('hidden');
}
function closeOrderDetailsModal() { document.getElementById('orderDetailsModal')?.classList.add('hidden'); }

// --- CRUD Operations ---
async function addProduct(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const heights = form.get('heights').split(',').map(h => h.trim()).filter(h => h);
    const { error } = await _supabase.from('products').insert([{
        name: form.get('name'), latin_name: form.get('latin_name'), description: form.get('description'),
        type: form.get('type'), heights, diameter: form.get('diameter'), root_ball: form.get('root_ball'),
        is_available: form.get('is_available') === 'on', image_url: form.get('image_url')
    }]);
    if (error) alert('Ошибка: ' + error.message);
    else { alert('Товар успешно добавлен!'); closeAddProductModal(); loadProducts(); }
}

async function updateProduct(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const id = form.get('id');
    const heights = form.get('heights').split(',').map(h => h.trim()).filter(h => h);
    const { error } = await _supabase.from('products').update({
        name: form.get('name'), latin_name: form.get('latin_name'), description: form.get('description'),
        type: form.get('type'), heights, diameter: form.get('diameter'), root_ball: form.get('root_ball'),
        is_available: form.get('is_available') === 'on', image_url: form.get('image_url')
    }).eq('id', id);
    if (error) alert('Ошибка: ' + error.message);
    else { alert('Товар успешно обновлен!'); closeEditProductModal(); loadProducts(); }
}

async function deleteProduct(id) {
    if (confirm('Вы уверены, что хотите удалить этот товар?')) {
        const { error } = await _supabase.from('products').delete().eq('id', id);
        if (error) alert('Ошибка: ' + error.message);
        else { alert('Товар удален.'); loadProducts(); }
    }
}

async function updateOrderStatus() {
    const id = document.getElementById('order-id').value;
    const status = document.getElementById('order-status').value;
    const { error } = await _supabase.from('orders').update({ status }).eq('id', id);
    if (error) alert('Ошибка: ' + error.message);
    else { alert('Статус заявки обновлен.'); closeOrderDetailsModal(); loadOrders(); }
}

async function deleteOrder(id) {
    if (confirm('Вы уверены, что хотите удалить эту заявку?')) {
        const { error } = await _supabase.from('orders').delete().eq('id', id);
        if (error) alert('Ошибка: ' + error.message);
        else { alert('Заявка удалена.'); closeOrderDetailsModal(); loadOrders(); }
    }
}

// --- Site Content Management ---
async function loadSiteContent() {
    const { data, error } = await _supabase.from('site_content').select('key, value');
    if (error) return alert('Не удалось загрузить контент сайта.');
    data.forEach(item => {
        const el = document.getElementById(item.key);
        if (el) el.value = item.value;
    });
}

async function saveSiteContent(event) {
    event.preventDefault();
    const inputs = document.querySelectorAll('#siteContentForm [data-key]');
    const dataToUpsert = Array.from(inputs).map(input => ({
        key: input.dataset.key,
        value: input.value
    }));
    if (dataToUpsert.length === 0) return alert("Нет данных для сохранения.");
    const { error } = await _supabase.from('site_content').upsert(dataToUpsert, { onConflict: 'key' });
    if (error) alert('Ошибка сохранения: ' + error.message);
    else alert('Контент сайта успешно обновлен!');
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (!path.endsWith('index.html') && !path.endsWith('/admin/')) {
        checkAuth();
        renderSidebar();
    }

    if (path.endsWith('index.html') || path.endsWith('/admin/')) {
        document.querySelector('form')?.addEventListener('submit', e => { e.preventDefault(); login(); });
    } else if (path.endsWith('dashboard.html')) {
        // Dashboard specific logic can go here
    } else if (path.endsWith('catalog.html')) {
        loadProducts();
        document.querySelector('header button').addEventListener('click', openAddProductModal);
        document.getElementById('closeAddModalButton').addEventListener('click', closeAddProductModal);
        document.getElementById('addProductForm').addEventListener('submit', addProduct);
        document.getElementById('closeEditModalButton').addEventListener('click', closeEditProductModal);
        document.getElementById('editProductForm').addEventListener('submit', updateProduct);
    } else if (path.endsWith('orders.html')) {
        loadOrders();
        document.getElementById('closeOrderModalButton').addEventListener('click', closeOrderDetailsModal);
        document.getElementById('closeOrderModalButtonBottom').addEventListener('click', closeOrderDetailsModal);
        document.getElementById('saveOrderStatusButton').addEventListener('click', updateOrderStatus);
    } else if (path.endsWith('site_management.html')) {
        loadSiteContent();
        document.getElementById('save-all-content').addEventListener('click', saveSiteContent);
    }
});

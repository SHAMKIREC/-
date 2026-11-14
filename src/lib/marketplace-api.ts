import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://yvchkbpegunclzqweunj.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_XpsN4NmSl2vWEfrY4K6zdQ_-2on8pun';

if (!url || !key) {
  throw new Error('Supabase configuration is missing');
}

export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

export type AppRole = 'customer' | 'merchant' | 'courier' | 'dispatcher' | 'admin';

export async function signUp(email: string, password: string, displayName: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new Error('Введите корректный email');
  if (password.length < 10) throw new Error('Пароль должен содержать минимум 10 символов');
  if (displayName.trim().length < 2) throw new Error('Укажите имя');
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: { data: { display_name: displayName.trim() } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getRoles(): Promise<AppRole[]> {
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) return [];
  const { data, error } = await supabase.from('user_roles').select('role');
  if (error) throw error;
  return (data ?? []).map(row => row.role as AppRole);
}

export async function getMerchants() {
  const { data, error } = await supabase.from('merchants')
    .select('id,name,address,description,approved,active')
    .eq('approved', true)
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getProducts(merchantId: string) {
  const { data, error } = await supabase.from('products')
    .select('id,merchant_id,name,description,image_url,price_kopecks,available')
    .eq('merchant_id', merchantId)
    .eq('available', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function requestMerchant(name: string, address: string, description = '') {
  if (name.trim().length < 2 || address.trim().length < 5) {
    throw new Error('Заполните название и адрес заведения');
  }
  const { data, error } = await supabase.rpc('request_merchant', {
    p_name: name.trim(),
    p_address: address.trim(),
    p_description: description.trim(),
  });
  if (error) throw error;
  return data as string;
}

export async function placeOrder(
  merchantId: string,
  lines: Array<{ product_id: string; quantity: number }>,
  fulfillment: 'pickup' | 'delivery',
  address?: string,
) {
  if (!lines.length || lines.length > 30) throw new Error('Корзина пуста или слишком большая');
  if (lines.some(line => !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99)) {
    throw new Error('Некорректное количество товаров');
  }
  if (fulfillment === 'delivery' && (!address || address.trim().length < 8)) {
    throw new Error('Укажите адрес доставки');
  }
  const { data, error } = await supabase.rpc('place_order', {
    p_merchant: merchantId,
    p_lines: lines,
    p_fulfillment: fulfillment,
    p_address: fulfillment === 'delivery' ? address?.trim() : null,
  });
  if (error) throw error;
  return data as string;
}

export async function myOrders() {
  const { data, error } = await supabase.from('orders')
    .select('id,merchant_id,state,fulfillment,subtotal_kopecks,delivery_kopecks,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function transitionOrder(id: string, next: string) {
  const { error } = await supabase.rpc('transition_order', { p_order: id, p_next: next });
  if (error) throw error;
}

export async function assignCourier(orderId: string, courierId: string) {
  const { error } = await supabase.rpc('assign_courier', { p_order: orderId, p_courier: courierId });
  if (error) throw error;
}

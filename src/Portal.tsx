import { useEffect, useState } from 'react';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { ArrowRight, Bike, LockKeyhole, LogOut, Package, Store, ShieldCheck, CreditCard, ReceiptText, Wallet } from 'lucide-react';

type Role = 'customer' | 'merchant' | 'courier' | 'dispatcher' | 'admin';
type Merchant = { id: string; name: string; address: string; approved: boolean; active: boolean };
type Order = { id: string; merchant_id: string; state: string; fulfillment: string; subtotal_kopecks: number; delivery_kopecks: number; created_at: string };
const url = import.meta.env.VITE_SUPABASE_URL || 'https://yvchkbpegunclzqweunj.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_XpsN4NmSl2vWEfrY4K6zdQ_-2on8pun';
const db: SupabaseClient | null = url && key ? createClient(url, key, {auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}}) : null;
const SITE_URL = 'https://app-5dq9by.v2.appdeploy.ai/';
const rub = (v: number) => (v / 100).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' });
const labels: Record<string,string> = { new:'Новый', accepted:'Принят', preparing:'Готовится', ready:'Готов к выдаче', assigned:'Назначен курьер', picked_up:'В пути', delivered:'Выполнен', cancelled:'Отменён' };

export default function Portal({ section }: { section: 'account' | 'partner' | 'courier' | 'admin' }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [register, setRegister] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const [resetMode,setResetMode]=useState(false);
  const role: Role | null = section === 'partner' ? 'merchant' : section === 'courier' ? 'courier' : section === 'admin' ? 'admin' : 'customer';
  const allowed = section === 'account' || roles.includes(role!) || (section === 'admin' && roles.includes('dispatcher'));

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    let active = true;
    db.auth.getUser().then(({ data }) => { if (active) { setUser(data.user); setLoading(false); } });
    const { data: listener } = db.auth.onAuthStateChange((_event, session) => { if (active) setUser(session?.user ?? null); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!db || !user) { setRoles([]); setOrders([]); setMerchants([]); return; }
    let active = true;
    const load = async () => {
      const [r, o, m] = await Promise.all([
        db!.from('user_roles').select('role'),
        db!.from('orders').select('id,merchant_id,state,fulfillment,subtotal_kopecks,delivery_kopecks,created_at').order('created_at', { ascending:false }).limit(50),
        db!.from('merchants').select('id,name,address,approved,active').order('created_at', { ascending:false }),
      ]);
      if (!active) return;
      if (r.error || o.error || m.error) setNotice('Не удалось загрузить данные кабинета');
      setRoles((r.data ?? []).map(v => v.role as Role));
      setOrders(o.data ?? []);
      setMerchants(m.data ?? []);
    };
    void load();
    return () => { active = false; };
  }, [user]);

  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    if (!db || busy) return;
    setBusy(true); setNotice('');
    try {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error('Проверьте адрес электронной почты');
      if (password.length < (register ? 10 : 1)) throw new Error('Пароль должен содержать минимум 10 символов');
      const result = register
        ? await db.auth.signUp({ email: email.trim().toLowerCase(), password, options: { emailRedirectTo: SITE_URL, data: { display_name: name.trim() } } })
        : await db.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (result.error) throw result.error;
      if (register && !result.data.session) setNotice('Проверьте почту и подтвердите регистрацию');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Не удалось войти'); }
    finally { setBusy(false); }
  }
  async function resetPassword(e: React.FormEvent) {e.preventDefault();if(!db||busy)return;setBusy(true);setNotice('');const {error}=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:SITE_URL});setNotice(error?error.message:'Если адрес зарегистрирован, на него отправлена ссылка восстановления.');setBusy(false);}
  async function applyMerchant(e: React.FormEvent) {
    e.preventDefault();
    if (!db || !user || busy) return;
    setBusy(true); setNotice('');
    const { error } = await db.rpc('request_merchant', { p_name:name.trim(), p_address:address.trim(), p_description:'' });
    setNotice(error ? error.message : 'Заявка отправлена. Публикация после проверки администратора.');
    if (!error) {
      const { data } = await db.from('merchants').select('id,name,address,approved,active').order('created_at', { ascending:false });
      setMerchants(data ?? []);
    }
    setBusy(false);
  }
  async function changeStatus(order: Order, next: string) {
    if (!db || busy) return;
    setBusy(true); setNotice('');
    const { error } = await db.rpc('transition_order', { p_order:order.id, p_next:next });
    if (error) setNotice(error.message);
    else setOrders(old => old.map(v => v.id === order.id ? { ...v, state:next } : v));
    setBusy(false);
  }
  return <section className="inner portal">
    <div className="portal-title"><span className="eyebrow">{section === 'admin' ? 'АДМИНИСТРИРОВАНИЕ' : section === 'courier' ? 'ДОСТАВКА' : section === 'partner' ? 'ДЛЯ ЗАВЕДЕНИЙ' : 'ЛИЧНЫЙ КАБИНЕТ'}</span>
      <h1>{section === 'admin' ? 'Управление платформой' : section === 'courier' ? 'Кабинет курьера' : section === 'partner' ? 'Кабинет заведения' : 'Ваш профиль'}</h1>
</div>
    {!db ? <div className="panel portal-message"><LockKeyhole size={30}/><h3>Подключение сервера завершается</h3><p>Вход будет доступен после настройки защищённого подключения к базе данных. Временный вход без проверки прав отключён.</p></div>
    : loading ? <div className="panel">Загружаем профиль…</div>
    : !user ? <div className="panel portal-auth"><h3>{resetMode ? 'Восстановить пароль' : register ? 'Создать аккаунт' : 'Войти в кабинет'}</h3>
        <form onSubmit={resetMode ? resetPassword : authenticate}>
          {register && !resetMode && <label className="field">Имя<input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>}
          <label className="field">Электронная почта<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
          {!resetMode && <label className="field">Пароль<div className="password-row"><input required type={showPassword?'text':'password'} minLength={register ? 10 : 1} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={register ? 'new-password' : 'current-password'}/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Скрыть пароль':'Показать пароль'}>{showPassword?'Скрыть':'Показать'}</button></div></label>}
          <button className="main-button stretch" disabled={busy} type="submit">{resetMode ? 'Отправить ссылку' : register ? 'Зарегистрироваться' : 'Войти'} <ArrowRight size={16}/></button>
        </form>
        <div className="portal-links"><button className="portal-link" onClick={()=>{setRegister(!register);setResetMode(false);setNotice('');}}>{register || resetMode ? 'Войти' : 'Создать аккаунт'}</button>{!register && <button className="portal-link" onClick={()=>{setResetMode(!resetMode);setNotice('');}}>{resetMode?'Назад':'Забыли пароль?'}</button>}</div>
      </div>
    : <div className="portal-content">
        <div className="panel portal-profile"><div><ShieldCheck size={22}/><span>{user.email}<small>{roles.map(r=>({customer:'Покупатель',merchant:'Владелец',courier:'Курьер',dispatcher:'Диспетчер',admin:'Администратор'}[r])).join(' · ')}</small></span></div><button className="outline-button" onClick={()=>void db.auth.signOut()}><LogOut size={16}/> Выйти</button></div>
        {!allowed && section === 'partner' ? <div className="panel portal-auth"><h3>Подключить заведение</h3><p>Заявка создаёт вашу точку, но не публикует её без проверки.</p><form onSubmit={applyMerchant}><label className="field">Название<input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><label className="field">Адрес<input required minLength={5} maxLength={300} value={address} onChange={e=>setAddress(e.target.value)}/></label><button className="main-button stretch" disabled={busy}>Отправить заявку</button></form></div>
        : !allowed ? <div className="panel portal-message"><LockKeyhole size={28}/><h3>Нет доступа к разделу</h3><p>{section === 'courier' ? 'Доступ курьера выдаёт администратор после проверки.' : 'Эта панель доступна только сотрудникам с соответствующей ролью.'}</p></div>
        : <>
          {section === 'partner' && <div className="panel"><h3>Мои заведения</h3>{merchants.length ? merchants.map(m=><div className="portal-list" key={m.id}><Store size={20}/><div><b>{m.name}</b><small>{m.address} · {m.approved && m.active ? 'Опубликовано' : 'Ожидает проверки'}</small></div></div>) : <p>Заведений пока нет.</p>}</div>}
          {section === 'partner' && <div className="panel payment-settings">
            <div className="payment-heading"><Wallet size={23}/><div><h3>Оплата и реквизиты</h3><p>Выручка за товары принадлежит вашему заведению.</p></div></div>
            <div className="payment-options">
              <div><CreditCard size={20}/><b>Онлайн-оплата</b><p>Подключается через платёжного провайдера по договору с вашим бизнесом. Деньги за товары поступают продавцу.</p><span>Подключение после проверки реквизитов</span></div>
              <div><ReceiptText size={20}/><b>Чеки и возвраты</b><p>Чеки за товары и возвраты оформляет продавец через свою кассу либо согласованного платёжного партнёра.</p><span>Настраивается для каждого заведения</span></div>
              <div><Bike size={20}/><b>Доставка</b><p>Стоимость доставки показывается покупателю отдельно. Расчёты с курьерами и платформой учитываются раздельно.</p><span>По условиям сотрудничества</span></div>
            </div>
            <div className="payment-notice"><LockKeyhole size={18}/><span>Реквизиты и платёжные ключи нельзя вводить в открытые формы. Редактирование станет доступно после подключения защищённого хранения и проверки владельца.</span></div>
          </div>}
          <div className="panel"><h3>{section === 'courier' ? 'Мои доставки' : section === 'partner' ? 'Заказы заведения' : section === 'admin' ? 'Заказы платформы' : 'Мои заказы'}</h3>
            {!orders.length ? <div className="empty"><Package size={32}/><p>Пока нет заказов</p></div> : orders.map(o=><div className="portal-order" key={o.id}><div><b>Заказ №{o.id.slice(0,8)}</b><small>{labels[o.state] ?? o.state} · {o.fulfillment === 'pickup' ? 'Самовывоз' : 'Доставка'} · {rub(o.subtotal_kopecks+o.delivery_kopecks)}</small></div><div className="portal-actions">
              {section === 'partner' && o.state === 'new' && <button disabled={busy} onClick={()=>void changeStatus(o,'accepted')}>Принять</button>}
              {section === 'partner' && o.state === 'accepted' && <button disabled={busy} onClick={()=>void changeStatus(o,'preparing')}>Готовится</button>}
              {section === 'partner' && o.state === 'preparing' && <button disabled={busy} onClick={()=>void changeStatus(o,'ready')}>Готово</button>}
              {section === 'courier' && o.state === 'assigned' && <button disabled={busy} onClick={()=>void changeStatus(o,'picked_up')}><Bike size={15}/> Забрал</button>}
              {section === 'courier' && o.state === 'picked_up' && <button disabled={busy} onClick={()=>void changeStatus(o,'delivered')}>Доставил</button>}
            </div></div>)}
          </div>
        </>}
      </div>}
    {notice && <p className="portal-notice" role="status">{notice}</p>}
  </section>;
}

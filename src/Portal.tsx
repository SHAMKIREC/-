import { useEffect, useState } from 'react';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { ArrowRight, Bike, LockKeyhole, LogOut, Package, Store, ShieldCheck, CreditCard, ReceiptText, Wallet } from 'lucide-react';

type Role = 'customer' | 'merchant' | 'courier' | 'dispatcher' | 'admin';
type Merchant = { id: string; name: string; address: string; approved: boolean; active: boolean };
type Order = { id: string; merchant_id: string; state: string; fulfillment: string; subtotal_kopecks: number; delivery_kopecks: number; created_at: string };
const url = import.meta.env.VITE_SUPABASE_URL || 'https://yvchkbpegunclzqweunj.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_XpsN4NmSl2vWEfrY4K6zdQ_-2on8pun';
const db: SupabaseClient | null = url && key ? createClient(url, key, {auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}}) : null;
const SITE_URL = new URL(import.meta.env.BASE_URL, window.location.origin).href;
const rub = (v: number) => (v / 100).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' });
type DemoOrder = {id:number;merchantId:number;items:string;sum:number;delivery:number;mode:'delivery'|'pickup';status:string;address:string;distance:number};
const DEMO_ORDERS_KEY='ryadom_demo_orders_2026';
const demoMerchantNames:Record<number,string>={1:'Комбинат',2:'Шашлычная',3:'Пекарня «Сладости»'};
function readDemoOrders():DemoOrder[]{try{const value=JSON.parse(localStorage.getItem(DEMO_ORDERS_KEY)||'[]');return Array.isArray(value)?value.filter((o):o is DemoOrder=>typeof o?.id==='number'&&typeof o?.merchantId==='number'&&typeof o?.status==='string'):[];}catch{return [];}}
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
  const [passwordRecovery,setPasswordRecovery]=useState(false);
  const [demoPreview,setDemoPreview]=useState(false);
  const [demoOrders,setDemoOrders]=useState<DemoOrder[]>(readDemoOrders);
  const role: Role | null = section === 'partner' ? 'merchant' : section === 'courier' ? 'courier' : section === 'admin' ? 'admin' : 'customer';
  const allowed = section === 'account' || roles.includes(role!) || (section === 'admin' && roles.includes('dispatcher'));

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    let active = true;
    db.auth.getUser().then(({ data }) => { if (active) { setUser(data.user); setLoading(false); } });
    const { data: listener } = db.auth.onAuthStateChange((event, session) => { if (active) { setUser(session?.user ?? null); if(event === 'PASSWORD_RECOVERY') { setPasswordRecovery(true); setNotice('Укажите новый пароль для восстановления доступа.'); } } });
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
  async function updatePassword(e: React.FormEvent) {
    e.preventDefault(); if (!db || busy) return;
    if(password.length < 10){setNotice('Новый пароль должен содержать минимум 10 символов');return;}
    setBusy(true);const {error}=await db.auth.updateUser({password});
    setNotice(error ? error.message : 'Пароль изменён. Теперь можно пользоваться кабинетом.');
    if(!error){setPasswordRecovery(false);setPassword('');}
    setBusy(false);
  }
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
  function advanceDemoOrder(id:number){
    const transitions:Record<string,string>={'Новый':'Принят','Принят':'Готовится','Готовится':'Готово','Готово':'Назначен курьер','Назначен курьер':'В пути','В пути':'Доставлен'};
    const latest=readDemoOrders();
    const updated=latest.map(o=>o.id===id&&transitions[o.status]?{...o,status:transitions[o.status]}:o);
    localStorage.setItem(DEMO_ORDERS_KEY,JSON.stringify(updated));
    setDemoOrders(updated);
    window.dispatchEvent(new Event('ryadom-demo-orders-changed'));
  }
  return <section className="inner portal">
    <div className="portal-title"><span className="eyebrow">{section === 'admin' ? 'АДМИНИСТРИРОВАНИЕ' : section === 'courier' ? 'ДОСТАВКА' : section === 'partner' ? 'ДЛЯ ЗАВЕДЕНИЙ' : 'ЛИЧНЫЙ КАБИНЕТ'}</span>
      <h1>{section === 'admin' ? 'Управление платформой' : section === 'courier' ? 'Кабинет курьера' : section === 'partner' ? 'Кабинет заведения' : 'Ваш профиль'}</h1>
</div>
    <div className="panel demo-role-panel"><div><b>Тестовый просмотр кабинета</b><p>Можно проверить интерфейс без регистрации. Это демонстрация: доступ к настоящим заказам, базе и правам пользователей не предоставляется.</p></div><button type="button" className="secondary-button" onClick={()=>setDemoPreview(v=>!v)}>{demoPreview?'Закрыть демо':'Открыть демо'}</button></div>
    {demoPreview && <div className="panel demo-role-panel"><h3>{section==='admin'?'Демо администратора':section==='courier'?'Демо курьера':section==='partner'?'Демо заведения':'Демо покупателя'}</h3><p>{section==='admin'?'Администратор проверяет заявки заведений и курьеров, управляет заказами и правами доступа.':section==='courier'?'Курьер видит назначенные доставки, адрес получения и статусы выполнения.':section==='partner'?'Заведение управляет своим меню, ценами, наличием и входящими заказами.':'Покупатель выбирает блюда, меняет количество и оформляет заказ.'}</p><div className="portal-list"><Package size={20}/><div><b>Тестовый сценарий</b><small>{section==='admin'?'Проверка заявки → одобрение → назначение курьера':section==='courier'?'Назначен → забрал → доставил':section==='partner'?'Новый заказ → принят → готовится → готово':'Корзина → самовывоз или доставка → отслеживание'}</small></div></div><h3>Тестовые заказы в этом браузере</h3>{demoOrders.length===0?<p>Пока нет заказов. Выберите товар на витрине и оформите тестовый заказ, чтобы увидеть его здесь.</p>:demoOrders.map(o=><div className="portal-order" key={o.id}><div><b>№{String(o.id).slice(-6)} · {demoMerchantNames[o.merchantId]||'Заведение'}</b><small>{o.items} · {rub((o.sum+o.delivery)*100)} · {o.status}</small></div>{((section==='partner'&&['Новый','Принят','Готовится'].includes(o.status))||(section==='admin'&&o.status==='Готово')||(section==='courier'&&o.mode==='delivery'&&['Назначен курьер','В пути'].includes(o.status)))&&<button type="button" className="secondary-button" onClick={()=>advanceDemoOrder(o.id)}>{section==='admin'?'Назначить курьера':section==='courier'?(o.status==='В пути'?'Доставлено':'Забрал заказ'):'Следующий статус'}</button>}</div>)}<p>Все действия происходят только в демонстрационных данных этого браузера. Настоящие аккаунты, права и заказы Supabase не затрагиваются.</p></div>}
    {!db ? <div className="panel portal-message"><LockKeyhole size={30}/><h3>Подключение сервера завершается</h3><p>Вход будет доступен после настройки защищённого подключения к базе данных. Временный вход без проверки прав отключён.</p></div>
    : loading ? <div className="panel">Загружаем профиль…</div>
    : passwordRecovery ? <div className="panel portal-auth"><h3>Новый пароль</h3><p>Придумайте новый пароль длиной не менее 10 символов.</p><form onSubmit={updatePassword}><label className="field">Новый пароль<input required type="password" minLength={10} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/></label><button className="main-button stretch" disabled={busy}>Сохранить пароль</button></form></div>
    : !user ? <div className="panel portal-auth"><h3>{resetMode ? 'Восстановить пароль' : register ? 'Создать аккаунт' : 'Войти в кабинет'}</h3><p>{section === 'partner' ? 'Сначала создайте обычный аккаунт, затем отправьте заявку на подключение заведения. После проверки откроется кабинет владельца.' : section === 'courier' ? 'Сначала зарегистрируйтесь. Доступ к доставкам появится после проверки и назначения роли курьера администратором.' : section === 'admin' ? 'Для сотрудников платформы. Самостоятельно получить права администратора через регистрацию нельзя.' : 'Один аккаунт для покупок и отслеживания заказов.'}</p>
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

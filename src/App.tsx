import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Bike, Check, ChevronDown, Clock3, Compass, Heart, LayoutDashboard, MapPin, Menu, Minus, Package, Plus, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Store, Truck, X } from 'lucide-react';
import './index.css';
import Portal from './Portal';
import { createClient } from '@supabase/supabase-js';
const authClient = createClient('https://yvchkbpegunclzqweunj.supabase.co','sb_publishable_XpsN4NmSl2vWEfrY4K6zdQ_-2on8pun');

type Merchant = { id:number; name:string; category:string; address:string; cover:string; logo:string; description:string; location:string; preparation:number; };
type Product = { id:number; merchantId:number; name:string; category:string; price:number; description:string; image:string; };
type Order = {id:number; merchantId:number; items:string; sum:number; delivery:number; mode:'delivery'|'pickup';status:string; address:string; distance:number;};
const merchants: Merchant[] = [
  {id:1,name:'Комбинат',category:'Стритфуд',address:'ТРЦ «Тау Галерея», 3-й этаж, Саратов',cover:'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=1100&q=82',logo:'К',description:'Шаурма и блюда быстрого питания',location:'3-я Дачная',preparation:20},
  {id:2,name:'Шашлычная',category:'Мангал',address:'ул. Лунная, 43/3, Саратов',cover:'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1100&q=82',logo:'Ш',description:'Шашлык, люля и горячие блюда',location:'Лунная',preparation:30},
  {id:3,name:'Пекарня «Сладости»',category:'Пекарня',address:'проспект 50 лет Октября, 116В, Саратов',cover:'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1100&q=82',logo:'С',description:'Выпечка, десерты и кофе с собой',location:'50 лет Октября',preparation:15},
];
const products: Product[] = [
  {id:101,merchantId:1,name:'Шаурма с курицей',category:'Шаурма',price:290,description:'Курица, свежие овощи, соус',image:'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=700&q=82'},
  {id:102,merchantId:1,name:'Донер с говядиной',category:'Шаурма',price:370,description:'Говядина, зелень, овощи',image:'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=700&q=82'},
  {id:103,merchantId:1,name:'Картофель фри',category:'Закуски',price:170,description:'Хрустящий картофель и соль',image:'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=700&q=82'},
  {id:201,merchantId:2,name:'Шаурма на мангале',category:'Шаурма',price:340,description:'Мясо с мангала, овощи, лаваш',image:'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=700&q=82'},
  {id:202,merchantId:2,name:'Шашлык из курицы',category:'Мангал',price:460,description:'Куриное мясо и овощи',image:'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=82'},
  {id:203,merchantId:2,name:'Люля-кебаб',category:'Мангал',price:420,description:'Мясо на углях, зелень',image:'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=700&q=82'},
  {id:301,merchantId:3,name:'Круассан',category:'Выпечка',price:160,description:'Слоёная выпечка',image:'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=700&q=82'},
  {id:302,merchantId:3,name:'Сдобная булочка',category:'Выпечка',price:130,description:'Мягкая свежая булочка',image:'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=700&q=82'},
  {id:303,merchantId:3,name:'Капучино',category:'Напитки',price:190,description:'Кофе с молоком',image:'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=700&q=82'},
];
const money=(value:number)=>value.toLocaleString('ru-RU')+' ₽';
const STORE_KEY='ryadom_demo_orders_2026';
function readOrders():Order[]{try {const saved=localStorage.getItem(STORE_KEY);const parsed=saved?JSON.parse(saved):[];return Array.isArray(parsed)?parsed:[];}catch{return [];}}
export default function App(){
  const [page,setPage]=useState('home');
  const [isStaff,setIsStaff]=useState(false);
  useEffect(()=>{let mounted=true;async function sync(){const {data:{user}}=await authClient.auth.getUser();if(!user){if(mounted)setIsStaff(false);return;}const {data}=await authClient.from('user_roles').select('role').in('role',['admin','dispatcher']);if(mounted)setIsStaff(Boolean(data?.length));}void sync();const {data:sub}=authClient.auth.onAuthStateChange(()=>{void sync();});return()=>{mounted=false;sub.subscription.unsubscribe()};},[]);
  const [selected,setSelected]=useState<number|null>(null);
  const [activeProduct,setActiveProduct]=useState<number|null>(null);
  const [detailQuantity,setDetailQuantity]=useState(1);
  const [filter,setFilter]=useState('Все');
  const [category,setCategory]=useState('Все');
  const [query,setQuery]=useState('');
  const [cart,setCart]=useState<Record<number,number>>({});
  const [cartMerchant,setCartMerchant]=useState<number|null>(null);
  const [confirmMerchant,setConfirmMerchant]=useState<number|null>(null);
  const [orders,setOrders]=useState<Order[]>(readOrders);
  const [mode,setMode]=useState<'delivery'|'pickup'>('delivery');
  const [address,setAddress]=useState('');
  const [distance,setDistance]=useState(3);
  const [peak,setPeak]=useState(false);
  const [message,setMessage]=useState('');
  const [navOpen,setNavOpen]=useState(false);
  const [adminMerchant,setAdminMerchant]=useState(1);
  const [merchantLead,setMerchantLead]=useState({name:'',contact:''});
  const [leads,setLeads]=useState<string[]>([]);
  const [deleteConfirm,setDeleteConfirm]=useState(false);
  const [searchMode,setSearchMode]=useState<'shops'|'dishes'>('shops');
  const count=Object.values(cart).reduce((a,b)=>a+b,0);
  const sum=products.reduce((a,p)=>a+(cart[p.id]||0)*p.price,0);
  const delivery=mode==='pickup'?0:119+Math.max(0,Math.ceil(distance-2))*25+(peak?40:0);
  const current=merchants.find(m=>m.id===selected);
  const basketShop=merchants.find(m=>m.id===cartMerchant);
  const merchantProducts=products.filter(p=>p.merchantId===selected&&(category==='Все'||p.category===category));
  const visibleMerchants=merchants.filter(m=>(filter==='Все'||m.category===filter)&&(m.name+' '+m.description+' '+m.location).toLowerCase().includes(query.toLowerCase()));
  const matchingProducts=products.filter(p=>(p.name+' '+p.description).toLowerCase().includes(query.toLowerCase()));
  useEffect(()=>{localStorage.setItem(STORE_KEY,JSON.stringify(orders));},[orders]);
  useEffect(()=>{const refresh=()=>setOrders(readOrders());window.addEventListener('ryadom-demo-orders-changed',refresh);return()=>window.removeEventListener('ryadom-demo-orders-changed',refresh);},[]);
  function inform(text:string){setMessage(text);}
  function openProduct(id:number){setDetailQuantity(1);setActiveProduct(id);}
  function openMerchant(id:number){if(cartMerchant!==null&&cartMerchant!==id&&count>0){setConfirmMerchant(id);return;}setSelected(id);setCategory('Все');setPage('merchant');window.scrollTo({top:0,behavior:'smooth'});}
  function addProduct(id:number,delta:number){const p=products.find(item=>item.id===id);if(!p)return;if(cartMerchant!==null&&cartMerchant!==p.merchantId&&count>0){setConfirmMerchant(p.merchantId);return;}setCartMerchant(p.merchantId);setCart(old=>({...old,[id]:Math.min(99,Math.max(0,(old[id]||0)+delta))}));}
  function switchMerchant(){if(confirmMerchant===null)return;setCart({});setCartMerchant(null);const next=confirmMerchant;setConfirmMerchant(null);setSelected(next);setCategory('Все');setPage('merchant');window.scrollTo({top:0,behavior:'smooth'});}
  function createOrder(){if(count===0){inform('Добавьте товары в корзину');return;}if(mode==='delivery'&&!address.trim()){inform('Укажите адрес доставки');return;}if(cartMerchant===null)return;const record:Order={id:Date.now(),merchantId:cartMerchant,items:products.filter(p=>(cart[p.id]||0)>0).map(p=>p.name+' × '+cart[p.id]).join(', '),sum,delivery,mode,status:'Новый',address:mode==='pickup'?'Самовывоз':address,distance};setOrders(old=>[record,...old]);setCart({});setCartMerchant(null);setPage('orders');inform('Тестовый заказ создан. Оплата не списана.');}
  function updateOrder(id:number,status:string){setOrders(old=>old.map(o=>o.id===id?{...o,status}:o));inform('Статус тестового заказа обновлён');}
  function navigate(destination:string){setPage(destination);setNavOpen(false);window.scrollTo({top:0,behavior:'smooth'});}
  const nav=[{id:'home',label:'Заведения'},{id:'orders',label:'Мои заказы'},{id:'partner',label:'Для бизнеса'},{id:'courier',label:'Курьерам'},{id:'account',label:'Личный кабинет'},...(isStaff?[{id:'admin',label:'Управление'}]:[])];
  const merchantCategories=['Все','Стритфуд','Мангал','Пекарня'];
  const filteredProducts=useMemo(()=>merchantProducts,[selected,category]);
  return <div className="app">
    
    <header className="header"><div className="wrap header-inner">
      <button className="brand" onClick={()=>navigate('home')} aria-label="Рядом, на главную"><span className="brand-mark"><MapPin size={24} strokeWidth={3}/><span className="brand-mark-dot"/></span><span>рядом<span className="brand-period">.</span></span></button>
      <div className="header-location"><MapPin size={18}/><div>Саратов <small>3-я Дачная · пилотный район</small></div></div>
      <nav className="desktop-navigation">{nav.map(item=><button key={item.id} className={page===item.id?'on':''} onClick={()=>navigate(item.id)}>{item.label}</button>)}</nav>
      <button className="header-cart" onClick={()=>navigate('cart')}><ShoppingBag size={19}/><span>Корзина</span>{count>0&&<b>{count}</b>}</button>
      <button className="mobile-toggle" aria-label="Меню" onClick={()=>setNavOpen(!navOpen)}>{navOpen?<X/>:<Menu/>}</button>
    </div></header>
    {navOpen&&<div className="mobile-navigation">{nav.map(item=><button key={item.id} onClick={()=>navigate(item.id)}>{item.label}</button>)}</div>}
    <main className="wrap">
    {page==='home'&&<>
      <section className="hero"><div className="hero-copy"><div className="pill-hero"><span/> САРАТОВ · 3-Я ДАЧНАЯ</div><h1>Всё нужное.<br/><em>Совсем рядом.</em></h1><p>Выбирайте знакомые заведения поблизости. Смотрите меню каждой точки отдельно и заказывайте самовывоз или доставку.</p><div className="hero-actions"><button className="main-button" onClick={()=>document.getElementById('places')?.scrollIntoView({behavior:'smooth'})}>Найти заведение <ArrowRight size={18}/></button><button className="hero-link" onClick={()=>navigate('partner')}>Для владельцев точек</button></div><div className="hero-metrics"><div><b>0 ₽</b><span>подключение заведений</span></div><div><b>0%</b><span>за самовывоз</span></div><div><b>1 район</b><span>начинаем с малого</span></div></div></div><div className="hero-photo" role="img" aria-label="Фотография еды"><div className="hero-picture-label">Открывайте любимые точки рядом с домом</div></div></section>
      <section className="market-sectors"><button className="sector active"><Store size={19}/> Еда и напитки <Check size={15}/></button><button className="sector" disabled>Продукты <span>Позже</span></button><button className="sector" disabled>Цветы <span>Позже</span></button><button className="sector" disabled>Товары для дома <span>Позже</span></button></section>
      <section className="shop-section" id="places"><div className="section-heading"><div><span className="eyebrow">ВЫБЕРИТЕ МЕСТО</span><h2>Заведения поблизости</h2><p>У каждой точки — своя витрина, блюда и цены</p></div><div className="search-bar"><Search size={18}/><input aria-label="Поиск заведения или блюда" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Найти заведение или еду..."/></div></div>
      <div className="filter-bar">{merchantCategories.map(c=><button key={c} className={filter===c?'chosen':''} onClick={()=>{setFilter(c);setSearchMode('shops');}}>{c}</button>)}</div>
      <div className="merchant-grid">{visibleMerchants.map(m=><button className="merchant-card" key={m.id} onClick={()=>openMerchant(m.id)}><div className="merchant-cover"><img src={m.cover} alt={'Иллюстративная фотография еды: '+m.category} loading="lazy"/></div><div className="merchant-card-content"><div className="merchant-category">{m.category} · {m.location}</div><div className="merchant-name"><h3>{m.name}</h3><ArrowRight size={20}/></div><p>{m.description}</p><div className="merchant-address"><MapPin size={14}/>{m.address}</div><div className="merchant-footer"><span><Clock3 size={15}/> ~{m.preparation} мин*</span><span>Смотреть меню <ArrowRight size={15}/></span></div></div></button>)}</div>
      {visibleMerchants.length===0&&<div className="empty">По запросу не найдено заведений</div>}
      {query.trim()&&matchingProducts.length>0&&<section className="search-results"><h3>Блюда по запросу</h3><div className="dish-search-list">{matchingProducts.map(p=><button key={p.id} onClick={()=>openMerchant(p.merchantId)}><img src={p.image} alt={p.name}/><span><b>{p.name}</b><small>{merchants.find(m=>m.id===p.merchantId)?.name} · {money(p.price)}</small></span><ArrowRight size={16}/></button>)}</div></section>}
      <p className="photo-disclaimer">Витрины пока представлены как примеры. Цены и ассортимент уточняются при подключении заведений.</p></section>
      <section className="why"><div><Truck size={22}/><b>Самовывоз или доставка</b><p>Вы сами решаете, как получать заказ.</p></div><div><MapPin size={22}/><b>Знакомые места</b><p>Витрина конкретного заведения, а не общий список блюд.</p></div><div><Heart size={22}/><b>Локальный бизнес</b><p>Для заведений вход и самовывоз бесплатны.</p></div></section>
      
    </>}
    {page==='merchant'&&current&&<>
      <section className="merchant-view"><button className="back" onClick={()=>navigate('home')}><ArrowLeft size={17}/> Все заведения</button><div className="merchant-hero"><img src={current.cover} alt={'Иллюстрация кухни заведения '+current.name}/><div className="merchant-hero-info"><h1>{current.name}</h1><p>{current.description}</p><div><MapPin size={16}/>{current.address}</div></div></div><div className="merchant-note">Это пример витрины. Заведение пока не принимает заказы через «Рядом».</div><div className="section-heading menu-heading"><div><span className="eyebrow">МЕНЮ ЗАВЕДЕНИЯ</span><h2>Выберите, что нравится</h2></div><button className="outline-button" onClick={()=>navigate('cart')}><ShoppingBag size={17}/> Корзина · {count}</button></div><div className="filter-bar">{['Все',...Array.from(new Set(products.filter(p=>p.merchantId===current.id).map(p=>p.category)))].map(c=><button className={category===c?'chosen':''} key={c} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="product-grid compact-menu">{filteredProducts.map(p=><button type="button" className="product compact-product" key={p.id} onClick={()=>openProduct(p.id)} aria-label={'Подробнее: '+p.name}><img src={p.image} loading="lazy" alt={'Фото блюда: '+p.name}/><div className="compact-product-caption"><h3>{p.name}</h3><div className="product-price-row"><b>{money(p.price)}</b><span>Подробнее <ArrowRight size={15}/></span></div></div></button>)}</div></section>
    </>}
    {page==='cart'&&<section className="inner"><button className="back" onClick={()=>navigate(selected?'merchant':'home')}><ArrowLeft size={17}/> Назад</button><span className="eyebrow">ОФОРМЛЕНИЕ</span><h1>Корзина</h1><div className="two-columns"><div className="panel"><h3>{basketShop?'Заказ из '+basketShop.name:'Ваш заказ'}</h3>{count===0?<div className="empty"><ShoppingBag size={35}/><p>В корзине пока пусто</p><button className="main-button" onClick={()=>navigate('home')}>Перейти к заведениям</button></div>:products.filter(p=>cart[p.id]>0).map(p=><div className="cart-line" key={p.id}><img src={p.image} alt={p.name}/><div className="flex-grow"><b>{p.name}</b><small>{money(p.price)} за шт.</small></div><div className="quantity"><button onClick={()=>addProduct(p.id,-1)} aria-label={'Убрать '+p.name}><Minus size={14}/></button><b>{cart[p.id]}</b><button onClick={()=>addProduct(p.id,1)} aria-label={'Добавить '+p.name}><Plus size={14}/></button></div><b>{money(p.price*cart[p.id])}</b></div>)}</div><div className="panel"><h3>Как получить заказ?</h3><div className="methods"><button className={mode==='delivery'?'method active':'method'} onClick={()=>setMode('delivery')}><Bike size={21}/> Доставка</button><button className={mode==='pickup'?'method active':'method'} onClick={()=>setMode('pickup')}><Store size={21}/> Самовывоз</button></div>{mode==='delivery'&&<><label className="field">Адрес доставки<input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Улица, дом, квартира"/></label><label className="field">Тестовое расстояние: {distance} км<input type="range" min="1" max="10" step="0.5" value={distance} onChange={e=>setDistance(Number(e.target.value))}/></label><label className="check-label"><input type="checkbox" checked={peak} onChange={e=>setPeak(e.target.checked)}/> Повышенный спрос (+40 ₽)</label></>}{mode==='pickup'&&<div className="pick-up-location"><MapPin size={17}/>{basketShop?.address}</div>}<div className="price-line"><span>Товары</span><b>{money(sum)}</b></div><div className="price-line"><span>{mode==='pickup'?'Самовывоз':'Доставка'}</span><b>{mode==='pickup'?'Бесплатно':money(delivery)}</b></div><div className="price-line total"><span>Итого</span><b>{money(sum+delivery)}</b></div><button className="main-button stretch" disabled={count===0} onClick={createOrder}>Создать тестовый заказ <ArrowRight size={17}/></button><p className="micro">Реального заказа и списания денег не будет. Данные хранятся только в этом браузере.</p></div></div></section>}
    {page==='orders'&&<section className="inner"><span className="eyebrow">МОИ ЗАКАЗЫ</span><h1>История заказов</h1>{orders.length===0?<div className="panel empty"><Package size={38}/><h3>Заказов пока нет</h3><button className="main-button" onClick={()=>navigate('home')}>Выбрать заведение</button></div>:orders.map(o=><article className="order-card" key={o.id}><div><small>Тестовый заказ №{String(o.id).slice(-6)}</small><h3>{merchants.find(m=>m.id===o.merchantId)?.name}</h3><p>{o.items}</p><div className="order-meta">{o.mode==='pickup'?'Самовывоз':'Доставка'} · {money(o.sum+o.delivery)}</div></div><span className="status">{o.status}</span></article>)}</section>}
    {page==='orders'&&<Portal section="account"/>}
    {page==='partner'&&<Portal section="partner"/>}
    {page==='courier'&&<Portal section="courier"/>}
    {page==='admin'&&<Portal section="admin"/>}
    {page==='account'&&<Portal section="account"/>}
    </main>
    <footer><div className="wrap footer-grid"><div><div className="footer-brand">рядом<span>.</span></div><p>Покупайте у местных.<br/>Создано NRV.</p></div><div><b>Разделы</b><button onClick={()=>navigate('home')}>Заведения</button><button onClick={()=>navigate('account')}>Личный кабинет</button></div><div><b>Сотрудничество</b><button onClick={()=>navigate('partner')}>Для заведений</button><button onClick={()=>navigate('courier')}>Курьерам</button></div></div></footer>
    {count>0&&page==='merchant'&&<button className="sticky-cart" onClick={()=>navigate('cart')}><ShoppingBag size={19}/> Корзина · {count}<strong>{money(sum)}</strong></button>}
    {activeProduct!==null&&(()=>{const p=products.find(item=>item.id===activeProduct);const shop=merchants.find(m=>m.id===p?.merchantId);return p&&shop?<div className="modal-layer" onClick={()=>setActiveProduct(null)}><div className="modal product-detail" role="dialog" aria-modal="true" aria-label={p.name} onClick={e=>e.stopPropagation()}><button className="detail-close" onClick={()=>setActiveProduct(null)} aria-label="Закрыть"><X size={21}/></button><img className="detail-image" src={p.image} alt={p.name}/><div className="detail-content"><span className="eyebrow">{shop.name} · {p.category}</span><h2>{p.name}</h2><p>{p.description}</p><p className="detail-merchant">Цена и состав относятся только к заведению «{shop.name}». Тестовое меню.</p><div className="detail-bottom"><div className="detail-purchase"><strong>{money(p.price*detailQuantity)}</strong><small>{money(p.price)} за шт.</small><div className="quantity detail-quantity"><button type="button" disabled={detailQuantity<=1} onClick={()=>setDetailQuantity(q=>Math.max(1,q-1))} aria-label="Уменьшить количество"><Minus size={18}/></button><b aria-live="polite">{detailQuantity}</b><button type="button" disabled={detailQuantity>=99} onClick={()=>setDetailQuantity(q=>Math.min(99,q+1))} aria-label="Увеличить количество"><Plus size={18}/></button></div></div><button className="main-button" onClick={()=>{if(cartMerchant!==null&&cartMerchant!==p.merchantId&&count>0){setActiveProduct(null);setConfirmMerchant(p.merchantId);return;}addProduct(p.id,detailQuantity);setActiveProduct(null);}}>В корзину · {detailQuantity} <Plus size={18}/></button></div></div></div></div>:null;})()}
    {confirmMerchant!==null&&<div className="modal-layer"><div className="modal"><h3>В корзине товары другого заведения</h3><p>В тестовой версии один заказ оформляется из одного заведения. Очистить корзину и перейти к другой точке?</p><div><button className="secondary-button" onClick={()=>setConfirmMerchant(null)}>Остаться</button><button className="main-button" onClick={switchMerchant}>Очистить и перейти</button></div></div></div>}
    {message&&<div className="toast" role="alert">{message}<button onClick={()=>setMessage('')} aria-label="Закрыть"><X size={17}/></button></div>}
  </div>;
}
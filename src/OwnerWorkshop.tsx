import {useEffect,useState} from 'react';
import {ArrowLeft, Bike, CheckCircle2, ClipboardList, MessageCircle, PackageCheck, ShieldCheck, Store, Truck} from 'lucide-react';
type Order={id:number;merchantId:number;items:string;sum:number;delivery:number;mode:'delivery'|'pickup';status:string;address:string;distance:number};
type Message={id:number;orderId:number;from:string;text:string;created:number};
const KEY='ryadom_demo_orders_2026';
const CHAT='ryadom_workshop_messages_v1';
const shops:Record<number,string>={1:'Комбинат',2:'Шашлычная',3:'Пекарня «Сладости»'};
const flow=['Новый','Принят','Готовится','Готово','Назначен курьер','В пути','Доставлен'];
function read<T>(key:string):T[]{try{const data=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(data)?data:[]}catch{return []}}
export default function OwnerWorkshop({onNavigate}:{onNavigate:(page:string)=>void}){
 const [orders,setOrders]=useState<Order[]>(()=>read<Order>(KEY));
 const [messages,setMessages]=useState<Message[]>(()=>read<Message>(CHAT));
 const [role,setRole]=useState<'owner'|'merchant'|'courier'|'customer'>('owner');
 const [selected,setSelected]=useState<number|null>(null);
 const [draft,setDraft]=useState('');
 const [merchant,setMerchant]=useState(0);
 const [notice,setNotice]=useState('');
 useEffect(()=>{const sync=()=>setOrders(read<Order>(KEY));window.addEventListener('storage',sync);window.addEventListener('ryadom-demo-orders-changed',sync);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('ryadom-demo-orders-changed',sync)}},[]);
 function update(id:number,next:string){const data=read<Order>(KEY).map(o=>o.id===id?{...o,status:next}:o);localStorage.setItem(KEY,JSON.stringify(data));setOrders(data);window.dispatchEvent(new Event('ryadom-demo-orders-changed'));setNotice('Статус заказа обновлён');}
 function send(){if(!selected||!draft.trim())return;const next=[...messages,{id:Date.now(),orderId:selected,from:role,text:draft.trim().slice(0,1000),created:Date.now()}];setMessages(next);localStorage.setItem(CHAT,JSON.stringify(next));setDraft('');}
 const active=orders.filter(o=>role!=='merchant'||merchant===0||o.merchantId===merchant);
 const open=orders.filter(o=>!['Доставлен','Отменён'].includes(o.status));
 const names={owner:'Владелец',merchant:'Заведение',courier:'Курьер',customer:'Покупатель'};
 const canAdvance=(o:Order)=>role==='owner'||role==='merchant'&&['Новый','Принят','Готовится'].includes(o.status)||role==='courier'&&['Назначен курьер','В пути'].includes(o.status);
 function next(o:Order){if(o.status==='Готово'&&o.mode==='pickup')return 'Доставлен';const idx=flow.indexOf(o.status);return idx>=0&&idx<flow.length-1?flow[idx+1]:null;}
 return <section className="inner owner-workshop">
  <button className="back" onClick={()=>onNavigate('home')}><ArrowLeft size={17}/> К заведениям</button>
  <div className="workshop-header"><div><span className="eyebrow">РАБОЧАЯ СРЕДА</span><h1>Центр управления</h1><p>Проверьте весь путь заказа: покупка, приём заведением, назначение курьера и доставка.</p></div><ShieldCheck size={38}/></div>
  <div className="workshop-note"><b>Изолированная проверка</b><span>Данные сохраняются только в этом браузере. Это не доступ к настоящей базе, не реальные заказы и не GPS курьеров. Права администратора Supabase здесь не выдаются.</span></div>
  <div className="workshop-tabs" role="group" aria-label="Роль в проверке">{([{id:'owner',label:'Владелец',icon:ShieldCheck},{id:'merchant',label:'Заведение',icon:Store},{id:'courier',label:'Курьер',icon:Bike},{id:'customer',label:'Покупатель',icon:PackageCheck}] as const).map(r=><button key={r.id} className={role===r.id?'active':''} onClick={()=>setRole(r.id)}><r.icon size={18}/>{r.label}</button>)}</div>
  {role==='owner'&&<div className="workshop-stats"><div><small>Всего заказов</small><strong>{orders.length}</strong></div><div><small>В обработке</small><strong>{open.length}</strong></div><div><small>Завершено</small><strong>{orders.filter(o=>o.status==='Доставлен').length}</strong></div><div><small>Сумма товаров</small><strong>{orders.reduce((a,o)=>a+o.sum,0).toLocaleString('ru-RU')} ₽</strong></div></div>}
  {role==='merchant'&&<label className="field">Заведение<select value={merchant} onChange={e=>setMerchant(Number(e.target.value))}><option value={0}>Все заведения</option>{Object.entries(shops).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>}
  <div className="workshop-toolbar"><h2>{role==='owner'?'Заказы платформы':role==='merchant'?'Входящие заказы':role==='courier'?'Доставки':'Мои заказы'}</h2><button className="outline-button" onClick={()=>onNavigate('home')}>Выбрать товары</button></div>
  {active.length===0?<div className="panel workshop-empty"><ClipboardList size={32}/><h3>Заказов пока нет</h3><p>Откройте заведение, добавьте блюдо в корзину и проверьте оформление. Заказ появится здесь автоматически.</p><button className="main-button" onClick={()=>onNavigate('home')}>К каталогу</button></div>:<div className="workshop-orders">{active.map(o=>{const nextState=next(o);const actionable=canAdvance(o)&&nextState;return <article className="panel workshop-order" key={o.id}><div className="workshop-order-top"><div><small>Заказ №{String(o.id).slice(-6)}</small><h3>{shops[o.merchantId]||'Заведение'}</h3></div><span className="status">{o.status}</span></div><p>{o.items}</p><div className="workshop-order-meta"><span>{o.mode==='pickup'?'Самовывоз':'Доставка'}</span><span>{o.sum.toLocaleString('ru-RU')} ₽ за товары</span></div>{o.mode==='delivery'&&<p className="workshop-address">Адрес: {o.address}</p>}<div className="workshop-order-actions">{actionable&&<button className="main-button" onClick={()=>update(o.id,nextState)}>{o.status==='Готово'&&o.mode==='delivery'?'Назначить курьера':nextState==='Доставлен'?'Завершить доставку':'Далее: '+nextState}</button>}{role==='owner'&&o.status!=='Отменён'&&o.status!=='Доставлен'&&<button className="outline-button" onClick={()=>update(o.id,'Отменён')}>Отменить</button>}<button className="outline-button" onClick={()=>setSelected(selected===o.id?null:o.id)}><MessageCircle size={17}/> Переписка</button></div>{selected===o.id&&<div className="workshop-chat"><h4>Сообщения по заказу</h4><div className="workshop-chat-feed">{messages.filter(m=>m.orderId===o.id).length?messages.filter(m=>m.orderId===o.id).map(m=><p key={m.id}><b>{names[m.from as keyof typeof names]||m.from}:</b> {m.text}</p>):<p>Сообщений пока нет</p>}</div><form onSubmit={e=>{e.preventDefault();send()}}><input value={draft} maxLength={1000} onChange={e=>setDraft(e.target.value)} placeholder="Написать сообщение"/><button className="main-button" disabled={!draft.trim()}>Отправить</button></form><small>Переписка доступна только для проверки в этом браузере.</small></div>}</article>})}</div>}
  {notice&&<p role="status" className="workshop-notice"><CheckCircle2 size={16}/>{notice}</p>}
  <div className="workshop-bottom"><Truck size={20}/><p>GPS, SMS, оплата и передача заказов реальным участникам будут подключены отдельно. Эта среда позволяет проверить последовательность действий без выдачи публичного доступа к административным данным.</p></div>
 </section>
}

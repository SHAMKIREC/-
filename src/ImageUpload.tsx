import {useState} from 'react';
import {supabase as db} from './lib/marketplace-api';
export default function ImageUpload({merchantId,onUpload}:{merchantId:string;onUpload:(url:string)=>void}){
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 async function upload(file:File){setBusy(true);setNotice('');try{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5242880)throw Error('Выберите JPEG, PNG или WebP до 5 МБ');
  const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>40000000){bitmap.close();throw Error('Изображение слишком большое')}
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d');if(!ctx)throw Error('Не удалось обработать фото');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Не удалось обработать фото')),'image/jpeg',.85));const path=merchantId+'/'+crypto.randomUUID()+'.jpg';const {error}=await db.storage.from('merchant-media').upload(path,blob,{contentType:'image/jpeg',upsert:false});if(error)throw error;onUpload(db.storage.from('merchant-media').getPublicUrl(path).data.publicUrl);setNotice('Фото загружено. Сохраните изменения.');
 }catch(e){setNotice(e instanceof Error?e.message:'Не удалось загрузить изображение')}finally{setBusy(false)}}
 return <label className="field">Фото<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file)}}/><small role="status">{busy?'Загружаем…':notice||'JPEG, PNG, WebP · до 5 МБ'}</small></label>
}

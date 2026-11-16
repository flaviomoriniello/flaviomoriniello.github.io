const DB='glyph-studio',STORE='archive';
let opening;
function db(){return opening??=new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function transaction(mode,action){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(STORE,mode),store=tx.objectStore(STORE);let result;try{result=action(store);}catch(e){reject(e);return;}tx.oncomplete=()=>resolve(result?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Archivio non disponibile'));});}
export const allEntries=async()=>((await transaction('readonly',s=>s.getAll()))||[]).sort((a,b)=>b.date-a.date);
export async function saveEntry(entry){await transaction('readwrite',s=>s.put(entry));const entries=await allEntries();const same=entries.filter(e=>e.type===entry.type);for(const old of same.slice(entry.type==='image'?8:20))await transaction('readwrite',s=>s.delete(old.id));}
export const deleteEntry=id=>transaction('readwrite',s=>s.delete(id));
export const clearEntries=()=>transaction('readwrite',s=>s.clear());
export function loadPreferences(){try{return JSON.parse(localStorage.getItem('glyph-settings')||'null');}catch{return null;}}
export function savePreferences(settings){try{localStorage.setItem('glyph-settings',JSON.stringify(settings));}catch{/* Private browsing may disallow persistent preferences. */}}

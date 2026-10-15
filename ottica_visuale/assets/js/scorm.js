(() => {
  'use strict';
  const KEY='ottica_visuale_16_multilivello_v9';
  const ids=Array.from({length:16},(_,i)=>String(i+1).padStart(2,'0'));
  const page=document.body.dataset.pageId;
  const started=Date.now();
  let api=null,initialized=false,finished=false;
  function find(start){let w=start;for(let i=0;i<30&&w;i++){try{if(w.API)return w.API;if(w.parent===w)break;w=w.parent;}catch{return null;}}return null;}
  api=find(window);if(!api){try{api=find(window.opener);}catch{}}
  function call(name,...args){try{return api?api[name](...args):'';}catch{return '';}}
  if(api)initialized=String(call('LMSInitialize',''))==='true';
  let state={completed:[],location:'01'};
  const parse=s=>{try{const d=JSON.parse(s);if(d&&Array.isArray(d.completed))return {completed:d.completed.filter(x=>ids.includes(x)),location:ids.includes(d.location)?d.location:'01'};}catch{}return null;};
  if(initialized){state=parse(call('LMSGetValue','cmi.suspend_data'))||state;const loc=call('LMSGetValue','cmi.core.lesson_location');if(ids.includes(loc))state.location=loc;}
  else {try{state=parse(localStorage.getItem(KEY))||state;}catch{}}
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}if(initialized&&!finished){call('LMSSetValue','cmi.core.lesson_location',state.location);call('LMSSetValue','cmi.suspend_data',JSON.stringify(state));call('LMSSetValue','cmi.core.lesson_status',state.completed.length===ids.length?'completed':'incomplete');call('LMSSetValue','cmi.core.exit',state.completed.length===ids.length?'':'suspend');call('LMSCommit','');}};
  function finish(){if(finished)return;persist();if(initialized){const seconds=Math.floor((Date.now()-started)/1000);const h=String(Math.floor(seconds/3600)).padStart(4,'0');const m=String(Math.floor(seconds/60)%60).padStart(2,'0');const s=String(seconds%60).padStart(2,'0');call('LMSSetValue','cmi.core.session_time',`${h}:${m}:${s}`);call('LMSCommit','');call('LMSFinish','');}finished=true;}
  if(!page){const target=`lezione-${state.location}.html`;finish();location.replace(target);return;}
  state.location=page;
  function draw(){for(const a of document.querySelectorAll('[data-page-id]'))a.classList.toggle('completed',state.completed.includes(a.dataset.pageId));const n=Math.round(state.completed.length/ids.length*100);document.querySelector('[data-progress]').value=n;document.querySelector('[data-progress-label]').textContent=n+'%';const b=document.querySelector('[data-complete-session]');b.classList.toggle('done',state.completed.includes(page));b.textContent=state.completed.includes(page)?'Lezione completata ✓':'Segna come completata';}
  document.querySelector('[data-complete-session]').addEventListener('click',()=>{if(!state.completed.includes(page))state.completed.push(page);persist();draw();});
  const menu=document.querySelector('.menu-toggle'),sidebar=document.querySelector('.sidebar'),scrim=document.querySelector('.scrim');
  function close(){sidebar.classList.remove('open');scrim.classList.remove('open');menu.setAttribute('aria-expanded','false');}
  menu.addEventListener('click',()=>{const on=sidebar.classList.toggle('open');scrim.classList.toggle('open',on);menu.setAttribute('aria-expanded',String(on));});
  scrim.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persist();});
  addEventListener('pagehide',finish);addEventListener('beforeunload',finish);persist();draw();
})();

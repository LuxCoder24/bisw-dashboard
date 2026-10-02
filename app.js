import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, setPersistence, browserSessionPersistence, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { esc, dcDate, dateLabel, timeLabel, upcoming, activeView } from './helpers.js';

export async function start(config) {
  const app=initializeApp(config), db=getFirestore(app);
  const admin=document.body.dataset.page==='admin';
  const $=s=>document.querySelector(s);
  const state={events:[],deadlines:[],notices:[],feature:null,alert:null,display:null};
  const health=new Map();
  let approved=false, editingId=null, stops=[], stopRole=null, auth=null;
  const status=message=>{$('#status').textContent=message;};
  function connection(){
    $('#connection').textContent=!navigator.onLine?'Offline · information may be out of date':
      [...health.values()].includes('error')?'Connection error · reload to retry':
      health.size<6||[...health.values()].some(v=>v!=='live')?'Connecting · information may be out of date':'Connected';
  }
  function message(error){
    console.error(error);
    if(error.code==='permission-denied')return 'Access denied. Check your staff approval and published Firestore rules.';
    if(error.code==='auth/too-many-requests')return 'Too many attempts. Please wait before trying again.';
    if(error.code?.startsWith('auth/'))return 'Sign-in failed. Check your email, password, and Email/Password settings in Firebase.';
    return 'The change could not be confirmed. Check your connection before trying again.';
  }
  async function write(button, task, success='Saved. Connected displays will update automatically.'){
    if(!approved){status('Staff approval is required.');return false;}
    if(!navigator.onLine){status('You are offline. Reconnect before saving.');return false;}
    button.disabled=true;status('Saving…');
    try {await task();status(success);return true;}catch(e){status(message(e));return false;}finally{button.disabled=false;}
  }
  function watch(ref,key,isList=false){
    health.set(key,'connecting');
    stops.push(onSnapshot(ref,{includeMetadataChanges:true},snapshot=>{
      // Do not present unconfirmed local writes as published content.
      if(snapshot.metadata.hasPendingWrites)return;
      state[key]=isList?snapshot.docs.map(d=>({...d.data(),id:d.id})):(snapshot.exists()?snapshot.data():null);
      health.set(key,snapshot.metadata.fromCache?'cache':'live');connection();
      if(admin){renderLists();fillSettings(key);}else renderDisplay();
    },error=>{health.set(key,'error');connection();status(message(error));}));
  }
  function beginListeners(){
    endListeners();
    for(const name of ['events','deadlines','notices'])watch(collection(db,name),name,true);
    for(const name of ['feature','alert','display'])watch(doc(db,'settings',name),name);
  }
  function endListeners(){stops.forEach(stop=>stop());stops=[];health.clear();}
  function clock(){const now=new Date();$('#date').textContent=now.toLocaleDateString('en-US',{timeZone:'America/New_York',weekday:'long',month:'long',day:'numeric'});$('#clock').textContent=now.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'});}
  function renderDisplay(){
    const events=upcoming(state.events), deadlines=upcoming(state.deadlines);
    $('#events').innerHTML=events.slice(0,4).map(e=>`<article class="event-row"><div class="event-time">${esc(timeLabel(e.time).split(' ')[0])}<span>${esc(timeLabel(e.time).split(' ')[1])} · ${esc(dateLabel(e.date))}</span></div><div><h3>${esc(e.title)}</h3><p>${esc(e.location)}</p><span class="small-tag">${esc(e.audience)}</span></div></article>`).join('')||'<p class="empty-state">No upcoming events.</p>';
    $('.agenda-note').textContent='Times shown in Washington, DC time.';
    $('#deadlines').innerHTML=deadlines.slice(0,2).map(e=>`<div class="deadline-row"><span class="date-block"><strong>${esc(e.date.slice(8))}</strong>${esc(dateLabel(e.date).split(' ')[0].toUpperCase())}</span><div><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p></div></div>`).join('')||'<p class="empty-state">No upcoming deadlines.</p>';
    const feature=state.feature?.date>=dcDate()?state.feature:null;
    $('#feature-title').textContent=feature?.title||'No featured event';
    $('#feature-description').textContent=feature?.description||'';
    $('#feature-date').textContent=feature?dateLabel(feature.date):'';
    $('#feature-location').textContent=feature?.location||'';
    const view=activeView(state.display,state.feature,state.alert);
    $('#dashboard').hidden=view!=='dashboard';$('#special-view').hidden=view==='dashboard';
    if(view!=='dashboard'){
      const x=view==='event'?state.feature:state.alert;
      $('#special-view').className=view==='alert'?'alert-mode':'';
      $('#special-view').innerHTML=`<p class="eyebrow">${view==='alert'?'ANNOUNCEMENT':'FEATURED EVENT'}</p><h1>${esc(x.title)}</h1><p class="special-copy">${esc(x.description)}</p><div class="special-meta">${view==='event'?`${esc(dateLabel(x.date))} · ${esc(x.location)}`:esc(x.detail)}</div>`;
    }
  }
  function renderLists(){
    for(const kind of ['events','deadlines','notices']){
      const items=[...state[kind]].sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
      $(`#admin-${kind}`).innerHTML=items.map(e=>`<div class="admin-event"><div><h3>${esc(e.title)}</h3><p>${esc(dateLabel(e.date))}${e.time?' · '+esc(timeLabel(e.time)):''}${e.date<dcDate()?' · Past':''}</p></div><div>${kind==='events'?`<button data-edit="${esc(e.id)}">Edit</button>`:''}<button data-delete="${esc(e.id)}" data-kind="${kind}" aria-label="Remove ${esc(e.title)}">Remove</button></div></div>`).join('')||'<p class="empty-state">No items published.</p>';
    }
    $('#event-count').textContent=`${state.events.length} events`;
    const view=activeView(state.display,state.feature,state.alert);
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  }
  function fillSettings(key){
    if(!['feature','alert'].includes(key)||!state[key])return;
    const form=$(`#${key}-form`);
    // Preserve unsaved work when another staff member updates this document.
    if(form.dataset.dirty==='true')return;
    for(const [prop,value] of Object.entries(state[key])){const input=form.elements.namedItem(`${key}-${prop}`);if(input)input.value=value;}
  }
  if(!admin){
    clock();beginListeners();renderDisplay();
    setInterval(()=>{clock();renderDisplay();connection();},15000);
    $('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else status('Full screen is not supported in this browser.');}catch{status('Full screen is unavailable in this browser.');}});
    document.addEventListener('fullscreenchange',()=>{$('#fullscreen').textContent=document.fullscreenElement?'Exit full screen':'Full screen';});
    const {startWeather}=await import('./weather.js');startWeather();
    const {startTransit}=await import('./transit.js');startTransit();
  }else{
    auth=getAuth(app);await setPersistence(auth,browserSessionPersistence);
    $('#sign-in').disabled=false;$('#reset-password').disabled=false;
    $('#login-form').addEventListener('submit',async e=>{e.preventDefault();const button=$('#sign-in');button.disabled=true;status('Signing in…');try{await signInWithEmailAndPassword(auth,$('#email').value.trim(),$('#password').value);$('#password').value='';}catch(error){status(message(error));}finally{button.disabled=false;}});
    $('#reset-password').addEventListener('click',async()=>{if(!$('#email').value||!$('#email').checkValidity()){status('Enter your account email address first.');return;}$('#reset-password').disabled=true;try{await sendPasswordResetEmail(auth,$('#email').value.trim());status('If this account is registered, a password reset email will be sent.');}catch(e){status(message(e));}finally{$('#reset-password').disabled=false;}});
    $('#sign-out').addEventListener('click',()=>signOut(auth).catch(e=>status(message(e))));
    onAuthStateChanged(auth,user=>{
      approved=false;endListeners();if(stopRole)stopRole();stopRole=null;
      $('#editor').hidden=true;$('#login-preview').hidden=false;
      if(!user){$('#connection').textContent='Signed out';status('');return;}
      $('#connection').textContent='Checking staff access…';
      stopRole=onSnapshot(doc(db,'staff',user.uid),{includeMetadataChanges:true},snap=>{
        const allowed=!snap.metadata.fromCache&&snap.exists()&&snap.data().enabled===true;
        if(allowed&&!approved){approved=true;$('#login-preview').hidden=true;$('#editor').hidden=false;status('');beginListeners();}
        else if(!allowed){approved=false;endListeners();$('#editor').hidden=true;$('#login-preview').hidden=false;$('#connection').textContent='Staff access required';status(snap.metadata.fromCache?'Checking staff access…':'This account is not approved. Ask the project owner to enable staff access.');}
      },e=>{approved=false;endListeners();$('#editor').hidden=true;$('#login-preview').hidden=false;status(message(e));});
    });
    $('#event-form').addEventListener('submit',async e=>{
      e.preventDefault();const form=e.target,f=new FormData(form),item={};
      for(const key of ['title','date','time','location','audience'])item[key]=String(f.get(key)).trim();
      const ref=editingId?doc(db,'events',editingId):doc(collection(db,'events'));
      if(await write(form.querySelector('[type=submit]'),()=>setDoc(ref,item))){form.reset();editingId=null;$('#cancel-edit').hidden=true;}
    });
    $('#cancel-edit').addEventListener('click',()=>{editingId=null;$('#event-form').reset();$('#cancel-edit').hidden=true;});
    $('#editor').addEventListener('click',async e=>{
      const edit=e.target.closest('[data-edit]');
      if(edit){const item=state.events.find(x=>x.id===edit.dataset.edit);if(!item)return;editingId=item.id;for(const key of ['title','date','time','location','audience'])$('#event-form').elements.namedItem(key).value=item[key];$('#cancel-edit').hidden=false;$('#title').focus();}
      const remove=e.target.closest('[data-delete]');
      if(remove&&confirm('Remove this item from the public dashboard?'))await write(remove,()=>deleteDoc(doc(db,remove.dataset.kind,remove.dataset.delete)),'Item removed.');
    });
    for(const kind of ['deadline','notice'])$(`#${kind}-form`).addEventListener('submit',async e=>{e.preventDefault();const form=e.target,f=new FormData(form),item={};for(const key of ['title','date','description'])item[key]=String(f.get(key)).trim();if(await write(form.querySelector('button'),()=>setDoc(doc(collection(db,`${kind}s`)),item)))form.reset();});
    for(const key of ['feature','alert']){
      const form=$(`#${key}-form`);form.addEventListener('input',()=>{form.dataset.dirty='true';});
      form.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(form),item={};for(const prop of key==='feature'?['title','description','date','location']:['title','description','detail'])item[prop]=String(f.get(`${key}-${prop}`)).trim();if(await write(form.querySelector('[type=submit]'),()=>setDoc(doc(db,'settings',key),item)))form.dataset.dirty='false';});
    }
    document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',async()=>{
      const view=button.dataset.view;
      if(view==='event'&&(!state.feature||state.feature.date<dcDate())){status('Save a featured event with a current or future date first.');return;}
      if(view==='alert'&&!state.alert){status('Save an announcement first.');return;}
      const expiresAt=view==='dashboard'?0:Date.now()+Number($('#takeover-hours').value)*3600000;
      await write(button,()=>setDoc(doc(db,'settings','display'),{view,expiresAt}),'Display view updated.');
    }));
  }
  window.addEventListener('online',connection);window.addEventListener('offline',connection);
}

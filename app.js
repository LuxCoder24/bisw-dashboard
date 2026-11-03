import './community.js?v=20261103-2';
import { featuredEvent, isFeatured } from './event-feature.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, setPersistence, browserSessionPersistence, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { esc, dcDate, dateLabel, timeLabel, upcoming, activeView, hasContent, isCurrent, contentOrder } from './helpers.js?v=20261020-2';
import { attachImageEditor, imageMarkup } from './images.js';
import { createEventCarousel } from './event-carousel.js';

export async function start(config) {
  const app=initializeApp(config), db=getFirestore(app);
  const admin=document.body.dataset.page==='admin';
  const $=s=>document.querySelector(s);
  const state={events:[],deadlines:[],notices:[],feature:null,alert:null,display:null};
  const health=new Map();
  const imageEditors=new Map();
  const carousel=admin?null:createEventCarousel($('.agenda'));
  if(admin)for(const id of ['event','deadline','notice','feature','alert']){
    const form=$(`#${id}-form`);imageEditors.set(form,attachImageEditor(form));
    if(id==='event')form.querySelector('#event-extras').append(form.querySelector('.image-editor'));
    const feedback=document.createElement('p');feedback.className='form-status';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');form.append(feedback);
    form.addEventListener('invalid',event=>{feedback.textContent=event.target.type==='date'?'Check the year in this date, or leave the date blank.':event.target.validationMessage;},true);
  }
  let approved=false, editing={events:null,deadlines:null,notices:null}, stops=[], stopRole=null, auth=null;
  const status=message=>{$('#status').textContent=message;};
  function connection(){
    $('#connection').textContent=!navigator.onLine?'Offline · information may be out of date':
      [...health.values()].includes('error')?'Connection error · reload to retry':
      health.size<6||[...health.values()].some(v=>v!=='live')?'Connecting · information may be out of date':'Connected';
  }
  function message(error){
    console.error(error);
    if(error.code?.startsWith('image/')||error.code==='content/empty')return error.message;
    if(error.code==='permission-denied')return 'Access denied. Check staff approval and publish the latest Firestore rules, including picture support.';
    if(error.code==='auth/too-many-requests')return 'Too many attempts. Please wait before trying again.';
    if(error.code?.startsWith('auth/'))return 'Sign-in failed. Check your email, password, and Email/Password settings in Firebase.';
    return 'The change could not be confirmed. Check your connection before trying again.';
  }
  async function write(button, task, success='Saved. Connected displays will update automatically.'){
    const feedback=button.closest('form')?.querySelector('.form-status');
    const report=text=>{status(text);if(feedback)feedback.textContent=text;};
    if(!approved){report('Staff approval is required.');return false;}
    if(!navigator.onLine){report('You are offline. Reconnect before saving.');return false;}
    button.disabled=true;report('Saving…');
    try {await task();report(success);return true;}catch(e){report(message(e));return false;}finally{button.disabled=false;}
  }
  function contentToSave(form,item){
    const content={...item,...imageEditors.get(form).fields()};
    if(!hasContent(content)){const error=new Error('Add a picture, title, or message before saving.');error.code='content/empty';throw error;}
    return content;
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
    const view=activeView(state.display,state.feature,state.alert);
    carousel.update(events,view==='dashboard');
    $('.agenda-note').textContent='Times shown in Washington, DC time.';
    $('#deadlines').innerHTML=deadlines.slice(0,2).map(e=>`<div class="deadline-row">${e.date?`<span class="date-block"><strong>${esc(e.date.slice(8))}</strong>${esc(dateLabel(e.date).split(' ')[0].toUpperCase())}</span>`:''}${imageMarkup(e,'deadline-image')}<div>${e.title?`<h3>${esc(e.title)}</h3>`:''}${e.description?`<p>${esc(e.description)}</p>`:''}</div></div>`).join('')||'<p class="empty-state">No upcoming deadlines.</p>';
    window.BISWCommunity.update(state.notices,dcDate());
    const notices=upcoming(state.notices.filter(item=>!window.BISWCommunity.kind(item)));
    $('#notice-board').hidden=!notices.length;
    $('#notices').innerHTML=notices.map(e=>`<article class="notice">${imageMarkup(e,'notice-image')}<div>${e.title?`<h3>${esc(e.title)}</h3>`:''}${e.description?`<p>${esc(e.description)}</p>`:''}</div></article>`).join('');
    const feature=hasContent(state.feature)&&isCurrent(state.feature)?state.feature:null;
    $('#feature-title').textContent=feature?(feature.title||''):'No featured event';
    $('#feature-title').hidden=!!feature&&!feature.title;
    $('#feature-description').textContent=feature?.description||'';
    $('#feature-description').hidden=!feature?.description;
    $('#feature-date').textContent=feature?.date?dateLabel(feature.date):'';
    $('#feature-date').hidden=!feature?.date;
    $('#feature-location').textContent=feature?[timeLabel(feature.time),feature.location].filter(Boolean).join(' · '):'';
    $('#feature-location').hidden=!(feature?.location||feature?.time);
    $('.feature-bottom').hidden=!(feature?.date||feature?.location||feature?.time);
    const picture=$('#feature-image');
    const markup=imageMarkup(feature,'feature-image');
    if(picture.dataset.image!==(feature?.image||'')){picture.innerHTML=markup;picture.dataset.image=feature?.image||'';}
    const featurePicture=picture.querySelector('img');if(featurePicture)featurePicture.alt=feature.imageAlt||feature.title||'Featured event picture';
    picture.hidden=!markup;$('.feature-card').classList.toggle('has-image',!!markup);
    $('.feature-card').classList.toggle('image-only',!!markup&&!feature?.title&&!feature?.description);
    $('#dashboard').hidden=view!=='dashboard';$('#special-view').hidden=view==='dashboard';
    if(view!=='dashboard'){
      const x=view==='event'?state.feature:state.alert;
      const image=imageMarkup(x,'special-image'),meta=view==='event'?[dateLabel(x.date),timeLabel(x.time),x.location].filter(Boolean).join(' · '):(x.detail||'');
      $('#special-view').className=`${view==='alert'?'alert-mode ':''}${image?'has-image ':''}${image&&!x.title&&!x.description&&!meta?'image-only':''}`;
      $('#special-view').innerHTML=`<div class="special-text"><p class="eyebrow">${view==='alert'?'ANNOUNCEMENT':'FEATURED EVENT'}</p>${x.title?`<h1>${esc(x.title)}</h1>`:''}${x.description?`<p class="special-copy">${esc(x.description)}</p>`:''}${meta?`<div class="special-meta">${esc(meta)}</div>`:''}</div>${image}`;
    }
  }
  function renderLists(){
    for(const kind of ['events','deadlines','notices']){
      const items=state[kind].filter(item=>kind!=='notices'||!window.BISWCommunity.kind(item)).sort((a,b)=>kind==='events'?(Number(isCurrent(b))-Number(isCurrent(a))||contentOrder(a,b)):contentOrder(a,b));
      $(`#admin-${kind}`).innerHTML=items.map(e=>{const label=e.title||e.description?.slice(0,65)||'Picture only';return `<div class="admin-event ${kind==='events'&&isFeatured(e,state.feature)?'is-featured':''}">${imageMarkup(e,'admin-thumbnail')}<div class="admin-item-copy"><h3>${esc(label)}${kind==='events'&&isFeatured(e,state.feature)?' <span class="featured-badge">Featured</span>':''}</h3><p>${esc([e.date?dateLabel(e.date):'No date set',timeLabel(e.time),e.date&&e.date<dcDate()?'Past':''].filter(Boolean).join(' · '))}</p></div><div>${kind==='events'?`<button data-feature="${esc(e.id)}" ${!isCurrent(e)?'disabled title="Past events cannot be featured"':''}>${isFeatured(e,state.feature)?'Feature again':'Make featured'}</button>`:''}<button data-edit="${esc(e.id)}" data-kind="${kind}">Edit</button><button data-delete="${esc(e.id)}" data-kind="${kind}" aria-label="Remove ${esc(label)}">Remove</button></div></div>`;}).join('')||'<p class="empty-state">No items published.</p>';
    }
    $('#featured-event-summary').textContent=hasContent(state.feature)?`Currently featured: ${state.feature.title||'Untitled event'}${isCurrent(state.feature)?'':' (past event · hidden)'}`:'No featured event selected.';
    renderCommunityLists();
    $('#event-count').textContent=`${state.events.length} events`;
    const view=activeView(state.display,state.feature,state.alert);
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  }
  // Community records use the existing staff-only public notice collection. A stable ID
  // prefix distinguishes them; their fields stay compatible with the live notice rules.
  const communityEditing={birthday:null,offer:null};
  function renderCommunityLists(){
    if(!$('#workspace-community'))return;
    for(const type of ['birthday','offer']){
      const items=state.notices.filter(item=>window.BISWCommunity.kind(item)===type).sort((a,b)=>(type==='birthday'?a.date.slice(5).localeCompare(b.date.slice(5)):b.date.localeCompare(a.date))||a.title.localeCompare(b.title));
      $(`#admin-${type==='birthday'?'birthdays':'offers'}`).innerHTML=items.map(item=>`<div class="admin-event"><div class="admin-item-copy"><h3>${esc(item.title)}</h3><p>${esc(type==='birthday'?`${dateLabel(item.date)} · every year`:`${item.description.replace(/\n/g,' · ')} · ${item.date<dcDate()?'Expired':'Until'} ${dateLabel(item.date)}`)}</p></div><div><button type="button" data-community-edit="${esc(item.id)}">Edit</button><button type="button" data-community-remove="${esc(item.id)}" aria-label="Remove ${esc(item.title)}">Remove</button></div></div>`).join('')||`<p class="empty-state">No ${type==='birthday'?'birthdays':'university offers'} saved yet.</p>`;
    }
  }
  function setupCommunityEditor(){
    if(!$('#workspace-community'))return;
    const labels={birthday:'birthday',offer:'university offer'};
    function reset(type){
      const form=$(`#${type}-form`);communityEditing[type]=null;form.reset();for(const input of form.querySelectorAll('input'))input.setCustomValidity('');
      $(`#cancel-${type}`).hidden=true;$(`#${type}-form-heading`).textContent=`Add a ${labels[type]}`;
      form.querySelector('[type=submit]').textContent=`Save ${labels[type]}`;form.querySelector('.form-status').textContent='';
      if(type==='offer')form.elements.date.value=new Date(Date.parse(dcDate()+'T12:00:00Z')+30*86400000).toISOString().slice(0,10);
      else form.elements.month.value=dcDate().slice(5,7);
    }
    for(const type of ['birthday','offer']){
      const form=$(`#${type}-form`);reset(type);
      form.addEventListener('input',()=>{for(const input of form.querySelectorAll('input'))input.setCustomValidity('');});
      form.addEventListener('change',()=>{for(const input of form.querySelectorAll('input'))input.setCustomValidity('');});
      form.addEventListener('submit',async event=>{
        event.preventDefault();const fields=new FormData(form),title=String(fields.get('title')||'').trim();
        if(!title){form.elements.title.setCustomValidity('Enter a display name.');form.elements.title.reportValidity();return;}
        let item;
        if(type==='birthday'){
          const month=String(fields.get('month')),day=Number(fields.get('day')),test=new Date(Date.UTC(2000,Number(month)-1,day));
          if(test.getUTCMonth()!==Number(month)-1||test.getUTCDate()!==day){form.elements.day.setCustomValidity('Choose a valid day for this month.');form.elements.day.reportValidity();return;}
          item={title,date:`2000-${month}-${String(day).padStart(2,'0')}`,description:String(fields.get('description')||'').trim()||'Happy birthday!'};
        }else{
          const university=String(fields.get('university')||'').trim(),course=String(fields.get('course')||'').trim(),date=String(fields.get('date'));
          if(!university){form.elements.university.setCustomValidity('Enter the university name.');form.elements.university.reportValidity();return;}
          if(date<dcDate()){form.elements.date.setCustomValidity('Choose today or a future display date.');form.elements.date.reportValidity();return;}
          item={title,date,description:[university,course].filter(Boolean).join('\n')};
        }
        const id=communityEditing[type]||`community-${type}-${doc(collection(db,'notices')).id}`;
        if(await write(form.querySelector('[type=submit]'),()=>setDoc(doc(db,'notices',id),item),`${type==='birthday'?'Birthday':'University offer'} saved. The community rotation updates automatically.`)){
          reset(type);form.querySelector('.form-status').textContent='Saved. The community rotation updates automatically.';
        }
      });
      $(`#cancel-${type}`).addEventListener('click',()=>{if(!form.querySelector('[type=submit]').disabled)reset(type);});
    }
    $('#workspace-community').addEventListener('click',async event=>{
      const edit=event.target.closest('[data-community-edit]'),remove=event.target.closest('[data-community-remove]');
      if(edit){
        const item=state.notices.find(x=>x.id===edit.dataset.communityEdit);if(!item)return;
        const type=window.BISWCommunity.kind(item),form=$(`#${type}-form`);if(form.querySelector('[type=submit]').disabled)return;
        reset(type);communityEditing[type]=item.id;form.elements.title.value=item.title;
        if(type==='birthday'){form.elements.month.value=item.date.slice(5,7);form.elements.day.value=Number(item.date.slice(8));form.elements.description.value=item.description||'';}
        else{const [university,...course]=item.description.split('\n');form.elements.university.value=university;form.elements.course.value=course.join('\n');form.elements.date.value=item.date;}
        $(`#${type}-form-heading`).textContent=`Edit ${labels[type]}`;form.querySelector('[type=submit]').textContent='Save changes';$(`#cancel-${type}`).hidden=false;form.elements.title.focus();
      }
      if(remove&&confirm('Remove this item from the community rotation?')){
        const id=remove.dataset.communityRemove,item=state.notices.find(x=>x.id===id);if(!item)return;const type=window.BISWCommunity.kind(item);
        if(await write(remove,()=>deleteDoc(doc(db,'notices',id)),'Community item removed.')&&communityEditing[type]===id)reset(type);
      }
    });
  }
  function fillSettings(key){
    if(!['feature','alert'].includes(key)||!state[key])return;
    const form=$(`#${key}-form`);
    // Preserve unsaved work when another staff member updates this document.
    if(form.dataset.dirty==='true')return;
    for(const prop of key==='feature'?['title','description','date','location']:['title','description','detail'])form.elements.namedItem(`${key}-${prop}`).value=state[key][prop]||'';
    imageEditors.get(form).set(state[key]);
  }
  if(!admin){
    clock();beginListeners();renderDisplay();
    setInterval(()=>{clock();renderDisplay();connection();},15000);
    $('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else status('Full screen is not supported in this browser.');}catch{status('Full screen is unavailable in this browser.');}});
    document.addEventListener('fullscreenchange',()=>{$('#fullscreen').textContent=document.fullscreenElement?'Exit full screen':'Full screen';});
    const {startWeather}=await import('./weather.js');startWeather();
    const {startTransit}=await import('./transit.js?v=20261103-2');startTransit();
  }else{
    setupCommunityEditor();
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
    for(const kind of ['event','deadline','notice']){
      const form=$(`#${kind}-form`),list=`${kind}s`;
      const clear=()=>{editing[list]=null;form.reset();if(kind!=='event')$(`#cancel-${kind}-edit`).hidden=true;};
      form.addEventListener('submit',async e=>{
        e.preventDefault();const f=new FormData(form),item={};
        for(const key of kind==='event'?['title','description','date','time','location','audience']:['title','date','description']){const value=String(f.get(key)||'').trim();if(value)item[key]=value;}
        const ref=editing[list]?doc(db,list,editing[list]):doc(collection(db,list));
        const old=state[list].find(x=>x.id===editing[list]);
        if(await write(form.querySelector('[type=submit]'),()=>{
          const content=contentToSave(form,item);
          if(kind==='event'&&old&&isFeatured(old,state.feature)){const batch=writeBatch(db);batch.set(ref,content);batch.set(doc(db,'settings','feature'),featuredEvent(content));return batch.commit();}
          return setDoc(ref,content);
        }))clear();
      });
      $(`#cancel-${kind}-edit`).addEventListener('click',clear);
    }
    $('#editor').addEventListener('click',async e=>{
      const feature=e.target.closest('[data-feature]');
      if(feature){
        const item=state.events.find(x=>x.id===feature.dataset.feature);
        if(!item||!isCurrent(item)){status('Choose a current or upcoming event to feature.');return;}
        await write(feature,()=>setDoc(doc(db,'settings','feature'),featuredEvent(item)),'Featured event updated. The dashboard featured card now uses this event.');
        return;
      }
      const edit=e.target.closest('[data-edit]');
      if(edit){
        const list=edit.dataset.kind,item=state[list].find(x=>x.id===edit.dataset.edit);if(!item)return;
        const kind=list.slice(0,-1),form=$(`#${kind}-form`);editing[list]=item.id;form.reset();
        for(const key of kind==='event'?['title','date','time','location','audience','description']:['title','date','description'])form.elements.namedItem(key).value=item[key]||'';
        imageEditors.get(form).set(item);$(`#cancel-${kind}-edit`).hidden=false;
        form.dispatchEvent(new Event('staff:edit'));
        form.querySelector('input').focus();
      }
      const remove=e.target.closest('[data-delete]');
      if(remove&&confirm('Remove this item from the public dashboard?')){
        if(await write(remove,()=>{const item=state.events.find(x=>x.id===remove.dataset.delete);if(remove.dataset.kind==='events'&&item&&isFeatured(item,state.feature)){const batch=writeBatch(db);batch.delete(doc(db,'events',item.id));batch.delete(doc(db,'settings','feature'));return batch.commit();}return deleteDoc(doc(db,remove.dataset.kind,remove.dataset.delete));},'Item removed.')&&editing[remove.dataset.kind]===remove.dataset.delete){
          const kind=remove.dataset.kind.slice(0,-1);editing[remove.dataset.kind]=null;$(`#${kind}-form`).reset();$(`#cancel-${kind}-edit`).hidden=true;
        }
      }
    });
    for(const key of ['feature','alert']){
      const form=$(`#${key}-form`);form.addEventListener('input',()=>{form.dataset.dirty='true';});
      form.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(form),item={};for(const prop of key==='feature'?['title','description','date','location']:['title','description','detail']){const value=String(f.get(`${key}-${prop}`)||'').trim();if(value)item[prop]=value;}if(await write(form.querySelector('[type=submit]'),()=>setDoc(doc(db,'settings',key),contentToSave(form,item))))form.dataset.dirty='false';});
    }
    document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',async()=>{
      const view=button.dataset.view;
      if(view==='event'&&(!hasContent(state.feature)||!isCurrent(state.feature))){status('Save a featured event first. Leave its date blank, or use a current or future date.');return;}
      if(view==='alert'&&!hasContent(state.alert)){status('Save an announcement first.');return;}
      const expiresAt=view==='dashboard'?0:Date.now()+Number($('#takeover-hours').value)*3600000;
      await write(button,()=>setDoc(doc(db,'settings','display'),{view,expiresAt}),'Display view updated.');
    }));
  }
  window.addEventListener('online',connection);window.addEventListener('offline',connection);
}

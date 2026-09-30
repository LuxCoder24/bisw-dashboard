(() => {
  'use strict';
  const key = 'bisw-prototype-v1';
  const defaults = {
    events: [
      {id:'a',title:'University application drop-in',date:'2026-09-30',time:'12:30',location:'College counseling office',audience:'IB YEAR 2'},
      {id:'b',title:'Student-led study group',date:'2026-09-30',time:'15:30',location:'IB common room',audience:'IB YEAR 1 & 2'},
      {id:'c',title:'University discovery fair',date:'2026-10-01',time:'12:30',location:'IB common room',audience:'IB YEAR 1 & 2'},
      {id:'d',title:'Community volunteering',date:'2026-10-02',time:'15:30',location:'Meet at reception',audience:'CAS OPPORTUNITY'}
    ],
    feature:{title:'University discovery fair',description:'Meet university representatives and discuss courses and applications.',date:'THURSDAY · OCT 1',location:'12:30 PM · IB common room'},
    alert:{title:'University visit: room change',description:'Sample announcement: the university visit has moved to the library. The start time is unchanged.',detail:'Contact the college counselor for further information.'},
    view:'dashboard'
  };
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = () => JSON.parse(JSON.stringify(defaults));
  function read(){try{const x=JSON.parse(localStorage.getItem(key));return x&&Array.isArray(x.events)&&x.feature&&x.alert&&['dashboard','event','alert'].includes(x.view)?x:clone();}catch{return clone();}}
  function migrateContent(x){
    x.events=x.events.map(e=>({...e,location:String(e.location).replace(/sixth form/gi,'IB')}));
    x.feature.location=String(x.feature.location).replace(/sixth form/gi,'IB');
    if(x.feature.title==='Find your next direction.')x.feature.title=defaults.feature.title;
    if(x.feature.description==='Explore your options at our sample university fair. Bring your questions. Leave with possibilities.')x.feature.description=defaults.feature.description;
    if(x.alert.title==='A change to today’s plans.')x.alert.title=defaults.alert.title;
    if(x.alert.detail==='Check with the college counselor if you have questions.')x.alert.detail=defaults.alert.detail;
    return x;
  }
  let data=migrateContent(read());
  function status(message){$('#status').textContent=message;}
  function save(){try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{status('Browser storage is unavailable. Changes only last until this page closes.');return false;}}
  const formatTime = t => {const [h,m]=t.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;};
  const formatDate = d => new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const sorted = () => [...data.events].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const admin = document.body.dataset.page==='admin';
  function renderDisplay(){
    if(admin)return;
    const list=sorted();
    $('#events').innerHTML=list.length?list.slice(0,4).map(e=>`<article class="event-row"><div class="event-time">${esc(formatTime(e.time).split(' ')[0])}<span>${esc(formatTime(e.time).split(' ')[1])} · ${esc(formatDate(e.date))}</span></div><div><h3>${esc(e.title)}</h3><p>${esc(e.location)}</p><span class="small-tag">${esc(e.audience)}</span></div></article>`).join(''):'<p class="empty-state">Nothing on the board yet.<br>Check back for upcoming events.</p>';
    $('.agenda-note').textContent=list.length>4?`${list.length-4} more example event${list.length-4===1?'':'s'} in the staff preview. Showing the first four.`:'Times shown in Washington, DC time.';
    $('#feature-title').textContent=data.feature.title;
    $('#feature-description').textContent=data.feature.description;
    $('#feature-date').textContent=data.feature.date;
    $('#feature-location').textContent=data.feature.location;
    setView(data.view,false);
  }
  function setView(view,persist=true){
    if(!['dashboard','event','alert'].includes(view))return;
    data.view=view;
    if(persist)save();
    if(admin){document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));return;}
    $('#dashboard').hidden=view!=='dashboard';$('#special-view').hidden=view==='dashboard';
    if(view!=='dashboard'){
      const x=view==='event'?data.feature:data.alert;
      $('#special-view').className=view==='alert'?'alert-mode':'';
      $('#special-view').innerHTML=`<p class="eyebrow">${view==='alert'?'COMMUNITY ANNOUNCEMENT':'COLLEGE & CAREERS · FEATURED EVENT'}</p><h1>${esc(x.title)}</h1><p class="special-copy">${esc(x.description)}</p><div class="special-meta">${view==='event'?`${esc(x.date)} &nbsp; / &nbsp; ${esc(x.location)}`:esc(x.detail)}</div><p class="special-demo">${view==='alert'?'DEMO ALERT · NOT A REAL SCHOOL NOTICE':'CONCEPT · SAMPLE EVENT'}</p>`;
    }
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{setView(b.dataset.view);if(admin)status('Display view updated in this browser. Open the dashboard to see it.');}));
  if(!admin){
    function clock(){const now=new Date();$('#date').textContent=now.toLocaleDateString('en-US',{timeZone:'America/New_York',weekday:'long',month:'long',day:'numeric'});$('#clock').textContent=now.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'});}
    clock();setInterval(clock,15000);renderDisplay();
    $('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();}else if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();}else{status('Full screen is unavailable in this browser. Hide the browser toolbar on your iPad for a larger view.');}}catch{status('This browser could not enter full screen. You can still use the dashboard in this window.');}});
    document.addEventListener('fullscreenchange',()=>{$('#fullscreen').textContent=document.fullscreenElement?'Exit full screen':'Full screen';});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')setView('dashboard');});
  } else {
    function renderAdmin(){
      $('#admin-events').innerHTML=sorted().map(e=>`<div class="admin-event"><div><h3>${esc(e.title)}</h3><p>${esc(formatDate(e.date))} · ${esc(formatTime(e.time))} · ${esc(e.location)}</p><span class="small-tag">${esc(e.audience)}</span></div><button type="button" data-delete="${esc(e.id)}" aria-label="Remove ${esc(e.title)}">Remove</button></div>`).join('')||'<p class="empty-state">No events yet. Add one using the form.</p>';
      $('#event-count').textContent=`${data.events.length} sample events`;
      for(const prop of ['title','description','date','location'])$(`[name="feature-${prop}"]`).value=data.feature[prop];
      for(const prop of ['title','description','detail'])$(`[name="alert-${prop}"]`).value=data.alert[prop];
      setView(data.view,false);
    }
    $('#open-demo').addEventListener('click',()=>{$('#login-preview').hidden=true;$('#editor').hidden=false;renderAdmin();$('#editor-title').focus();});
    $('#leave-demo').addEventListener('click',()=>{$('#editor').hidden=true;$('#login-preview').hidden=false;$('#open-demo').focus();status('');});
    $('#event-form').addEventListener('submit',e=>{
      e.preventDefault();const f=new FormData(e.target);
      const event={id:Date.now().toString(36),title:f.get('title').trim(),date:f.get('date'),time:f.get('time'),location:f.get('location').trim(),audience:f.get('audience')};
      if(!event.title||!event.location){status('Add an event title and location.');return;}
      data.events.push(event);const saved=save();renderAdmin();e.target.reset();if(saved)status('Sample event added. The dashboard updates in other tabs in this browser.');
    });
    $('#admin-events').addEventListener('click',e=>{const b=e.target.closest('[data-delete]');if(!b)return;data.events=data.events.filter(x=>x.id!==b.dataset.delete);const saved=save();renderAdmin();if(saved)status('Sample event removed.');});
    for(const section of ['feature','alert'])$(`#${section}-form`).addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);for(const prop of Object.keys(data[section]))data[section][prop]=String(f.get(`${section}-${prop}`)||'').trim();const saved=save();if(saved)status(`${section==='feature'?'Featured event':'Demo alert'} saved in this browser.`);});
    $('#reset').addEventListener('click',()=>{if(!window.confirm('Reset this prototype to its original sample events and display settings?'))return;data=clone();const saved=save();renderAdmin();if(saved)status('Original sample content restored.');});
  }
  window.addEventListener('storage',e=>{if(e.key===key){data=migrateContent(read());if(!admin)renderDisplay();}});
})();

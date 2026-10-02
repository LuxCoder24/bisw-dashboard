import {esc} from './helpers.js';
import {transitConfig} from './transit-config.js';

export const BUS_STOPS = [
  {id:'1001637',street:'34th St NW',direction:'Northbound'},
  {id:'1001645',street:'34th St NW',direction:'Southbound'},
  {id:'1001706',street:'35th St NW',direction:'Northbound'},
  {id:'1001699',street:'35th St NW',direction:'Southbound'},
];
const MAX_AGE=90000;

function routeRows(predictions){
  const routes=new Map();
  for(const prediction of [...predictions].sort((a,b)=>a.minutes-b.minutes)){
    if(typeof prediction.route!=='string'||!Number.isInteger(prediction.minutes)||prediction.minutes<0)continue;
    const destination=String(prediction.destination||'').replace(/^(North|South) to\s+/i,'');
    const key=prediction.route+'|'+destination;
    if(!routes.has(key))routes.set(key,{route:prediction.route,destination,times:[]});
    const group=routes.get(key);if(group.times.length<2)group.times.push(prediction.minutes);
  }
  return [...routes.values()].slice(0,2).map(group=>`<div class="bus-route"><strong class="bus-route-label">${esc(group.route)}</strong><span class="bus-destination">${esc(group.destination)}</span><p>${group.times.map(minutes=>`<span>${minutes===0?'Due':`${minutes}<small> min</small>`}</span>`).join('')}</p></div>`).join('');
}

export function busMarkup(data,now=Date.now()){
  const stops=Array.isArray(data?.stops)?data.stops:[];
  return ['34th St NW','35th St NW'].map(street=>`<section class="bus-location"><h3>Wisconsin Ave NW &amp; ${street}</h3><div class="bus-directions">${BUS_STOPS.filter(stop=>stop.street===street).map(stop=>{
    const result=stops.find(item=>item.id===stop.id);
    const fresh=result?.ok===true&&Number.isFinite(result.updatedAt)&&result.updatedAt<=now+5000&&now-result.updatedAt<=MAX_AGE;
    const rows=fresh&&Array.isArray(result.predictions)?routeRows(result.predictions):'';
    const message=!fresh?'Live arrivals unavailable.':rows?'':'No live arrivals listed.';
    return `<div class="bus-direction" data-stop="${stop.id}"><h4><span class="bus-direction-arrow" aria-hidden="true">${stop.direction==='Northbound'?'↑':'↓'}</span>${stop.direction}</h4>${rows||`<p class="bus-empty">${message}</p>`}</div>`;
  }).join('')}</div></section>`).join('');
}

export function startTransit(){
  const target=document.getElementById('bus-arrivals'),status=document.getElementById('bus-status'),badge=document.getElementById('bus-live');
  function liveBadge(label,live=false){if(badge){badge.textContent=label;badge.dataset.live=String(live);}}
  if(!target||!status)return;
  let endpoint;
  try{
    endpoint=new URL(transitConfig.endpoint);
    if(endpoint.protocol!=='https:')throw new Error('HTTPS required');
  }catch{
    target.innerHTML=busMarkup(null);
    status.textContent='Live feed not connected';liveBadge('Not connected');return;
  }
  let lastData=null,busy=false;
  function render(){
    const now=Date.now();target.innerHTML=busMarkup(lastData,now);
    const fresh=lastData?.stops?.filter(stop=>stop.ok===true&&Number.isFinite(stop.updatedAt)&&stop.updatedAt<=now+5000&&now-stop.updatedAt<=MAX_AGE)||[];
    liveBadge(fresh.length===BUS_STOPS.length?'Live':fresh.length?'Live · partial':'Unavailable',fresh.length>0);
  }
  async function update(){
    if(busy||document.hidden)return;
    busy=true;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(endpoint.href,{signal:controller.signal,cache:'no-store',credentials:'omit'});
      if(!response.ok)throw new Error('Feed unavailable');
      const data=await response.json();
      if(!Array.isArray(data.stops))throw new Error('Invalid feed');
      lastData=data;render();
      const current=data.stops.filter(stop=>stop.ok===true&&Number.isFinite(stop.updatedAt)&&Date.now()-stop.updatedAt<=MAX_AGE);
      const time=current.length?new Date(Math.min(...current.map(stop=>stop.updatedAt))).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'}):'';
      status.textContent=current.length===BUS_STOPS.length?`WMATA estimates · updated ${time}`:current.length?`Some arrivals unavailable · ${time}`:'Live arrivals unavailable';
    }catch{render();status.textContent='Feed unavailable · retrying';}
    finally{clearTimeout(timer);busy=false;}
  }
  render();liveBadge('Connecting');status.textContent='Connecting…';update();
  setInterval(update,30000);
  // Clear old predictions even when the feed or network stops responding.
  setInterval(render,5000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
  window.addEventListener('online',update);
}

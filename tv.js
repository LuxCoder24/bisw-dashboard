/* Read-only TV runtime. ES5 syntax, ordinary scripts and XHR; no module loader. */
(function () {
  'use strict';
  var root = 'https://firestore.googleapis.com/v1/projects/bisw-ib-dashboard/databases/(default)/documents/';
  var state = {events:[],deadlines:[],notices:[],feature:null,alert:null,display:null};
  var slide = 0, pages = [], health = {}, busy = false, transit = null;
  function el(id) { return document.getElementById(id); }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function text(id,value) { if(el(id)) el(id).textContent = value || ''; }
  function pad(n) { return n < 10 ? '0'+n : String(n); }
  function request(url,done) {
    var xhr = new XMLHttpRequest(), finished = false;
    function finish(error,data) { if(finished)return;finished=true;done(error,data); }
    xhr.open('GET',url,true);xhr.timeout=15000;
    xhr.onload=function(){if(xhr.status===404){finish(null,null);return;}if(xhr.status<200||xhr.status>=300){finish(new Error('HTTP '+xhr.status));return;}try{finish(null,JSON.parse(xhr.responseText));}catch(e){finish(e);}};
    xhr.onerror=xhr.ontimeout=function(){finish(new Error('Connection unavailable'));};
    try{xhr.send();}catch(e){finish(e);}
  }
  function value(v) {
    if('stringValue' in v)return v.stringValue;
    if('integerValue' in v)return Number(v.integerValue);
    if('doubleValue' in v)return v.doubleValue;
    if('booleanValue' in v)return v.booleanValue;
    return null;
  }
  function record(doc) {
    if(!doc)return null;
    var item={},key,fields=doc.fields||{};
    for(key in fields)if(Object.prototype.hasOwnProperty.call(fields,key))item[key]=value(fields[key]);
    item.id=doc.name.substring(doc.name.lastIndexOf('/')+1);return item;
  }
  function dcNow() {
    // US Eastern daylight saving starts the second Sunday in March and ends the first Sunday in November.
    var now=new Date(),year=now.getUTCFullYear();
    var march=new Date(Date.UTC(year,2,1)),november=new Date(Date.UTC(year,10,1));
    var start=Date.UTC(year,2,1+(7-march.getUTCDay())%7+7,7);
    var end=Date.UTC(year,10,1+(7-november.getUTCDay())%7,6);
    return new Date(now.getTime()+(now.getTime()>=start&&now.getTime()<end?-4:-5)*3600000);
  }
  function today() { var d=dcNow();return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate()); }
  function clock() {
    var d=dcNow(),days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months=['January','February','March','April','May','June','July','August','September','October','November','December'];
    text('date',days[d.getUTCDay()]+', '+months[d.getUTCMonth()]+' '+d.getUTCDate());
    text('clock',(d.getUTCHours()%12||12)+':'+pad(d.getUTCMinutes())+' '+(d.getUTCHours()<12?'AM':'PM'));
  }
  function dateLabel(date) { if(!date)return '';var p=date.split('-');return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(p[1])-1]+' '+Number(p[2]); }
  function timeLabel(time) { if(!time)return '';var p=time.split(':'),h=Number(p[0]);return (h%12||12)+':'+p[1]+' '+(h<12?'AM':'PM'); }
  function current(item) { return item&&(!item.date||item.date>=today()); }
  function picture(item,klass) { return item&&typeof item.image==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(item.image)?'<img class="'+klass+'" src="'+item.image+'" alt="'+esc(item.imageAlt||item.title||'Event picture')+'">':''; }
  function content(item) { return item&&(item.title||item.description||item.detail||picture(item,'')); }
  function upcoming(items) { return items.filter(function(x){return current(x)&&content(x);}).sort(function(a,b){var x=(a.date||'9999')+(a.time||''),y=(b.date||'9999')+(b.time||'');return x<y?-1:x>y?1:0;}); }
  function summary(item) { return [dateLabel(item.date),timeLabel(item.time),item.location].filter(Boolean).join(' · '); }
  function eventPages(events) {
    var result=[];
    events.forEach(function(event,index){var remaining=event.description||'',parts=[],limit=picture(event,'')?180:280;
      while(remaining.length>limit){var cut=remaining.lastIndexOf(' ',limit);if(cut<limit/2)cut=limit;parts.push(remaining.substring(0,cut));remaining=remaining.substring(cut).replace(/^\s+/,'');}
      parts.push(remaining);parts.forEach(function(description,page){result.push({event:event,index:index,description:description,page:page,total:parts.length});});
    });return result;
  }
  function paintEvents() {
    var p=pages.length?pages[slide%pages.length]:null,e=p&&p.event;
    el('events').innerHTML=p?'<article class="event-slide'+(picture(e,'')?' has-image':'')+'"><div class="event-text"><div class="event-meta">'+esc([dateLabel(e.date),timeLabel(e.time)].filter(Boolean).join(' · '))+'</div><h3>'+esc(e.title)+'</h3><p class="event-location">'+esc(e.location)+'</p><p class="event-description">'+esc(p.description)+'</p><span class="small-tag">'+esc(e.audience)+'</span></div>'+picture(e,'event-image')+'</article>':'<p class="empty-state">No upcoming events.</p>';
    text('event-position',p?(p.index+1)+' / '+upcoming(state.events).length+(p.total>1?' · Details '+(p.page+1)+' / '+p.total:''):'');
    el('event-position').hidden=pages.length<2;
  }
  function render() {
    var feature=current(state.feature)&&content(state.feature)?state.feature:null;
    text('feature-title',feature&&feature.title||'No featured event');
    var description=feature&&feature.description||'';
    text('feature-description',description.length>280?description.substring(0,277)+'…':description);
    text('feature-date',feature?dateLabel(feature.date):'');text('feature-location',feature?[timeLabel(feature.time),feature.location].filter(Boolean).join(' · '):'');
    var markup=picture(feature,'feature-image');el('feature-image').innerHTML=markup;el('feature-image').hidden=!markup;
    var card=document.querySelector('.feature-card');card.className='feature-card'+(markup?' has-image':'');
    var nextPages=eventPages(upcoming(state.events));if(JSON.stringify(nextPages)!==JSON.stringify(pages)){pages=nextPages;slide=0;}paintEvents();
    el('deadlines').innerHTML=upcoming(state.deadlines).map(function(item){return '<div class="deadline-row">'+picture(item,'deadline-image')+'<div><h3>'+esc(item.title)+'</h3><p>'+esc([dateLabel(item.date),item.description].filter(Boolean).join(' · '))+'</p></div></div>';}).join('')||'<p class="empty-state">No upcoming deadlines.</p>';
    var notices=upcoming(state.notices);el('notice-board').hidden=!notices.length;
    el('notices').innerHTML=notices.map(function(item){return '<article class="notice">'+picture(item,'notice-image')+'<h3>'+esc(item.title)+'</h3><p>'+esc(item.description)+'</p></article>';}).join('');
    var view=state.display&&state.display.expiresAt>Date.now()?state.display.view:'dashboard';
    if(view==='event'&&!feature)view='dashboard';if(view==='alert'&&!content(state.alert))view='dashboard';
    var special=view==='event'?feature:state.alert;
    el('dashboard').hidden=view!=='dashboard';el('special-view').hidden=view==='dashboard';
    if(view!=='dashboard'){el('special-view').className=(view==='alert'?'alert-mode ':'')+(picture(special,'')?'has-image':'');el('special-view').innerHTML='<div class="special-text"><p class="eyebrow">'+(view==='alert'?'ANNOUNCEMENT':'FEATURED EVENT')+'</p><h1>'+esc(special.title)+'</h1><p class="special-copy">'+esc(special.description)+'</p><div class="special-meta">'+esc(view==='event'?summary(special):special.detail)+'</div></div>'+picture(special,'special-image');}
  }
  function connection() {
    var errors=false,count=0,k;for(k in health){count++;if(!health[k])errors=true;}
    text('connection',navigator.onLine===false?'Offline · reconnect to update':errors?'Connection problem · retrying':count<6?'Connecting…':'Connected · TV mode');
  }
  function refresh() {
    if(busy)return;busy=true;var pending=6;
    function finish(key,error,data){health[key]=!error;if(!error)state[key]=data;pending--;render();connection();if(!pending)busy=false;}
    ['events','deadlines','notices'].forEach(function(key){var items=[];
      function page(token){request(root+key+'?pageSize=100'+(token?'&pageToken='+encodeURIComponent(token):''),function(error,data){if(error){finish(key,error);return;}(data&&data.documents||[]).forEach(function(d){items.push(record(d));});if(data&&data.nextPageToken){page(data.nextPageToken);return;}finish(key,null,items);});}page('');
    });
    ['feature','alert','display'].forEach(function(key){request(root+'settings/'+key,function(error,data){finish(key,error,record(data));});});
  }
  function weather() {
    request('https://api.weather.gov/points/38.9072,-77.0369',function(error,point){
      if(error||!point||!point.properties){text('weather-data','Weather unavailable · retrying');return;}
      request(point.properties.forecastHourly,function(err,data){var periods=data&&data.properties&&data.properties.periods||[],now=Date.now(),p=null;
        periods.forEach(function(x){if(!p&&Date.parse(x.startTime)<=now&&Date.parse(x.endTime)>now)p=x;});
        if(err||!p){text('weather-data','Weather unavailable · retrying');return;}
        var c=p.temperatureUnit==='F'?(p.temperature-32)*5/9:p.temperature;
        el('weather-data').innerHTML='<div class="weather-main"><strong class="weather-temperature">'+Math.round(c)+'<span class="weather-unit">°C</span></strong><div>'+esc(p.shortForecast)+'<br><span>Wind '+esc(p.windSpeed)+' '+esc(p.windDirection)+'</span></div></div><p class="weather-summary">Forecast · Washington, DC</p><div id="tv-weather-days"></div>';
        request(point.properties.forecast,function(dailyError,daily){if(dailyError||!el('tv-weather-days'))return;var days=daily&&daily.properties&&daily.properties.periods||[];el('tv-weather-days').innerHTML='<div class="weather-days">'+days.filter(function(x){return x.isDaytime&&Date.parse(x.endTime)>now;}).slice(0,5).map(function(x){var t=x.temperatureUnit==='F'?(x.temperature-32)*5/9:x.temperature;return '<p class="tv-weather-day"><span>'+esc(x.name)+'</span><strong>'+Math.round(t)+'°C</strong></p>';}).join('')+'</div>';});
      });
    });
  }
  function paintTransit() {
    var now=Date.now(),stops=transit&&transit.stops||[],live=0;
    el('bus-arrivals').innerHTML=['34th St NW','35th St NW'].map(function(street,index){return '<section class="bus-location"><h3>Wisconsin Ave NW &amp; '+street+'</h3><div class="bus-directions">'+[0,1].map(function(direction){var ids=['1001637','1001645','1001706','1001699'],stop=null;stops.forEach(function(s){if(s.id===ids[index*2+direction])stop=s;});var fresh=stop&&stop.ok&&typeof stop.updatedAt==='number'&&stop.updatedAt<=now+5000&&now-stop.updatedAt<=90000;
      if(fresh)live++;var groups=[],byKey={};if(fresh)(stop.predictions||[]).slice().sort(function(a,b){return a.minutes-b.minutes;}).forEach(function(p){if(typeof p.route!=='string'||typeof p.minutes!=='number'||p.minutes<0||p.minutes%1)return;var key=p.route+'|'+p.destination,g=byKey[key];if(!g){g={route:p.route,destination:p.destination,times:[]};byKey[key]=g;groups.push(g);}if(g.times.length<2)g.times.push(p.minutes);});
      return '<div class="bus-direction"><h4>'+(direction?'↓ Southbound':'↑ Northbound')+'</h4>'+(groups.slice(0,2).map(function(g){return '<div class="bus-route"><strong class="bus-route-label">'+esc(g.route)+'</strong><span class="bus-destination">'+esc(g.destination)+'</span><p>'+g.times.map(function(t){return '<span>'+(t===0?'Due':t+'<small> min</small>')+'</span>';}).join('')+'</p></div>';}).join('')||'<p class="bus-empty">'+(fresh?'No live arrivals listed.':'Live arrivals unavailable.')+'</p>')+'</div>';
    }).join('')+'</div></section>';}).join('');
    text('bus-live',live===4?'Live':live?'Live · partial':'Unavailable');el('bus-live').setAttribute('data-live',String(live>0));text('bus-status',live?'WMATA estimates':'Feed unavailable · retrying');
  }
  function buses() {request('https://bisw-bus-arrivals.nathan-d-berndt.workers.dev/arrivals',function(error,data){if(!error)transit=data;paintTransit();});}
  el('fullscreen').onclick=function(){var d=document.documentElement,fn=d.requestFullscreen||d.webkitRequestFullscreen;if(fn)try{fn.call(d);}catch(e){text('status','Use your TV browser’s full-screen option.');}};
  clock();render();paintTransit();refresh();weather();buses();
  setInterval(clock,1000);setInterval(function(){slide++;paintEvents();render();},12000);
  setInterval(refresh,30000);setInterval(weather,900000);setInterval(buses,30000);setInterval(paintTransit,5000);
}());

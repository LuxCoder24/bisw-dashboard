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
  // Scale with both dimensions so 720p, 1080p and 4K keep the same proportions.
  function fitDisplay() {
    var width=document.documentElement.clientWidth||1280,height=window.innerHeight||720;
    var size=Math.max(10,Math.min(42,16*Math.min(width/1280,height/800))),shell=document.querySelector('.display-shell'),i,needed;
    document.documentElement.style.fontSize=size+'px';
    // Content can grow after feeds load. Fit the complete board, including its footer.
    for(i=0;shell&&i<3;i++) {
      needed=shell.getBoundingClientRect().height;
      if(needed<=height+1)break;
      size=Math.max(10,size*(height-8)/needed);document.documentElement.style.fontSize=size+'px';
    }
  }
  fitDisplay();window.addEventListener('resize',fitDisplay);
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
    text('feature-title',feature?(feature.title||''):'No featured event');
    var description=feature&&feature.description||'';
    text('feature-description',description.length>280?description.substring(0,277)+'…':description);
    text('feature-date',feature?dateLabel(feature.date):'');text('feature-location',feature?[timeLabel(feature.time),feature.location].filter(Boolean).join(' · '):'');
    document.querySelector('.feature-bottom').hidden=!feature||(!feature.date&&!feature.time&&!feature.location);
    var markup=picture(feature,'feature-image');el('feature-image').innerHTML=markup;el('feature-image').hidden=!markup;
    var card=document.querySelector('.feature-card');card.className='feature-card'+(markup?' has-image':'')+(markup&& !feature.title&&!feature.description?' image-only':'');
    var nextPages=eventPages(upcoming(state.events));if(JSON.stringify(nextPages)!==JSON.stringify(pages)){pages=nextPages;slide=0;}paintEvents();
    el('deadlines').innerHTML=upcoming(state.deadlines).map(function(item){return '<div class="deadline-row">'+picture(item,'deadline-image')+'<div><h3>'+esc(item.title)+'</h3><p>'+esc([dateLabel(item.date),item.description].filter(Boolean).join(' · '))+'</p></div></div>';}).join('')||'<p class="empty-state">No upcoming deadlines.</p>';
    var notices=upcoming(state.notices);el('notice-board').hidden=!notices.length;
    el('notices').innerHTML=notices.map(function(item){return '<article class="notice">'+picture(item,'notice-image')+'<h3>'+esc(item.title)+'</h3><p>'+esc(item.description)+'</p></article>';}).join('');
    var view=state.display&&state.display.expiresAt>Date.now()?state.display.view:'dashboard';
    if(view==='event'&&!feature)view='dashboard';if(view==='alert'&&!content(state.alert))view='dashboard';
    var special=view==='event'?feature:state.alert;
    el('dashboard').hidden=view!=='dashboard';el('special-view').hidden=view==='dashboard';
    if(view!=='dashboard'){el('special-view').className=(view==='alert'?'alert-mode ':'')+(picture(special,'')?'has-image':'');el('special-view').innerHTML='<div class="special-text"><p class="eyebrow">'+(view==='alert'?'ANNOUNCEMENT':'FEATURED EVENT')+'</p><h1>'+esc(special.title)+'</h1><p class="special-copy">'+esc(special.description)+'</p><div class="special-meta">'+esc(view==='event'?summary(special):special.detail)+'</div></div>'+picture(special,'special-image');}
    fitDisplay();
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
  // Same locally drawn artwork and forecast presentation as the desktop board.
var cloud = '<path d="M17 39h30a10 10 0 0 0 0-20h-1a14 14 0 0 0-27-3 12 12 0 0 0-2 23Z"/>';
var sun = '<circle cx="32" cy="32" r="11"/><path d="M32 5v7m0 40v7M5 32h7m40 0h7M13 13l5 5m28 28 5 5M13 51l5-5m28-28 5-5"/>';
var moon = '<path d="M46 43A23 23 0 0 1 24 8a23 23 0 1 0 22 35Z"/>';
var symbols = {
  sun:sun, moon:moon,
  cloud:cloud,
  'partly-cloudy': '<circle cx="21" cy="20" r="9"/><path d="M21 3v4M4 20h4M9 8l3 3m22-3-3 3"/><path fill="#0b405f" d="M18 45h30a10 10 0 0 0 0-20h-1a14 14 0 0 0-27-3 12 12 0 0 0-2 23Z"/>',
  'partly-cloudy-night': '<path d="M30 22A15 15 0 0 1 19 4a16 16 0 0 0-9 29"/><path fill="#0b405f" d="M18 45h30a10 10 0 0 0 0-20h-1a14 14 0 0 0-27-3 12 12 0 0 0-2 23Z"/>',
  rain: cloud + '<path d="m23 46-3 8m14-8-3 8m14-8-3 8"/>',
  snow: cloud + '<path d="M21 47v10m-4-8 8 6m-8 0 8-6m17-2v10m-4-8 8 6m-8 0 8-6"/>',
  sleet: cloud + '<path d="m23 46-3 7m23-7-3 7"/><circle cx="30" cy="55" r="1"/>',
  storm: cloud + '<path d="m34 43-8 10h8l-5 9m16-17-3 8"/>',
  fog: cloud + '<path d="M12 47h40M17 55h30"/>',
  wind: '<path d="M7 23h34a8 8 0 1 0-8-8M7 33h43a7 7 0 1 1-7 7M7 43h18a7 7 0 1 1-7 7"/>',
};


  function weatherIcon(period) {
    var forecast=String(period.shortForecast||'').toLowerCase(),codes=[],name,night=period.isDaytime===false;
    if(typeof period.icon==='string')codes=period.icon.replace(/^https?:\/\/[^/]+/,'').split('/').slice(4).map(function(part){return part.split(',')[0];});
    function has(names){return codes.some(function(code){return names.indexOf(code)!==-1;});}
    if(/thunder|tornado|hurricane|tropical storm/.test(forecast)||has(['tsra','tsra_sct','tsra_hi','tornado','hurricane','tropical_storm']))name='storm';
    else if(/sleet|freezing rain|ice pellets|wintry|rain.*snow|snow.*rain/.test(forecast)||has(['rain_snow','rain_sleet','snow_sleet','fzra','rain_fzra','snow_fzra','sleet']))name='sleet';
    else if(/snow|flurr/.test(forecast)||has(['snow','blizzard']))name='snow';
    else if(/rain|shower|drizzle/.test(forecast)||has(['rain','rain_showers','rain_showers_hi']))name='rain';
    else if(/fog|mist|haze|smoke/.test(forecast)||has(['fog','haze','smoke','dust']))name='fog';
    else if(/windy|breezy/.test(forecast)||codes.some(function(code){return code.indexOf('wind_')===0;}))name='wind';
    else if(/partly|mostly sunny|mostly clear/.test(forecast)||has(['few','sct']))name=night?'partly-cloudy-night':'partly-cloudy';
    else if(/cloud|overcast/.test(forecast)||has(['bkn','ovc']))name='cloud';
    else if(/sunny|clear|fair/.test(forecast)||has(['skc','hot','cold']))name=night?'moon':'sun';
    else name='cloud';
    return '<svg class="weather-symbol" data-weather="'+name+'" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+symbols[name]+'</svg>';
  }
  function temperatureC(period) {
    if(typeof period.temperature!=='number'||!isFinite(period.temperature))return null;
    return period.temperatureUnit==='C'?period.temperature:period.temperatureUnit==='F'?(period.temperature-32)*5/9:null;
  }
  function forecastRange(periods,now) {
    var until=now+86400000,covered=now,temperatures=[],valid=true;
    periods.filter(function(p){return Date.parse(p.endTime)>now&&Date.parse(p.startTime)<until;}).sort(function(a,b){return Date.parse(a.startTime)-Date.parse(b.startTime);}).forEach(function(p){
      var start=Date.parse(p.startTime),end=Date.parse(p.endTime),c=temperatureC(p);
      if(start>covered||end<=start||c===null)valid=false;
      if(c!==null)temperatures.push(c);covered=Math.max(covered,end);
    });
    return valid&&covered>=until&&temperatures.length?{high:Math.round(Math.max.apply(null,temperatures)),low:Math.round(Math.min.apply(null,temperatures))}:null;
  }
  function dailyForecast(periods) {
    var ordered=periods.slice().filter(function(p){return isFinite(Date.parse(p.startTime))&&Date.parse(p.endTime)>Date.parse(p.startTime);}).sort(function(a,b){return Date.parse(a.startTime)-Date.parse(b.startTime);});
    var days=[],seen={},labels=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    ordered.forEach(function(day,index){
      var night=ordered[index+1],date=day.startTime.substring(0,10),high=temperatureC(day),low=night?temperatureC(night):null;
      // NWS times carry the local Eastern offset. Pair each daytime high with its following overnight low.
      if(days.length>=5||day.isDaytime!==true||date<=today()||seen[date]||!night||night.isDaytime!==false||Date.parse(night.startTime)!==Date.parse(day.endTime)||high===null||low===null)return;
      days.push({label:labels[new Date(date+'T12:00:00Z').getUTCDay()],high:Math.round(high),low:Math.round(low),period:day});seen[date]=true;
    });return days;
  }
  function dailyMarkup(days) {
    if(!days.length)return '<p class="weather-days-unavailable">Upcoming forecast temporarily unavailable.</p>';
    var temperatures=[];days.forEach(function(day){temperatures.push(day.low,day.high);});
    var minimum=Math.min.apply(null,temperatures),maximum=Math.max.apply(null,temperatures),span=maximum-minimum;
    return '<div class="weather-days-heading">Next '+days.length+' days <span>°C</span></div><ol class="weather-day-list" aria-label="Upcoming daytime highs and overnight lows">'+days.map(function(day){
      var left=span?(Math.min(day.low,day.high)-minimum)/span*100:0,width=span?Math.abs(day.high-day.low)/span*100:100;
      return '<li class="weather-day"><span class="weather-day-name">'+day.label+'</span><span class="weather-day-condition" role="img" aria-label="'+esc(day.period.shortForecast||'Forecast')+'">'+weatherIcon(day.period)+'</span><span class="weather-day-low" aria-label="Overnight low '+day.low+' degrees Celsius">'+day.low+'°</span><span class="weather-day-bar"><span class="weather-day-track" aria-hidden="true"><span style="left:'+left+'%;width:'+width+'%"></span></span></span><strong class="weather-day-high" aria-label="Daytime high '+day.high+' degrees Celsius">'+day.high+'°</strong></li>';
    }).join('')+'</ol>';
  }
  function weather() {
    request('https://api.weather.gov/points/38.9072,-77.0369',function(error,point){
      if(error||!point||!point.properties){text('weather-data','Weather unavailable · retrying');fitDisplay();return;}
      var hourly=point.properties.forecastHourly,daily=point.properties.forecast;
      if(!/^https:\/\/api\.weather\.gov\//.test(hourly)||!/^https:\/\/api\.weather\.gov\//.test(daily)){text('weather-data','Weather unavailable · retrying');fitDisplay();return;}
      request(hourly,function(err,data){var periods=data&&data.properties&&data.properties.periods||[],now=Date.now(),p=null;
        periods.forEach(function(x){if(!p&&Date.parse(x.startTime)<=now&&Date.parse(x.endTime)>now)p=x;});
        var c=p?temperatureC(p):null;
        if(err||!p||c===null){text('weather-data','Weather unavailable · retrying');fitDisplay();return;}
        var range=forecastRange(periods,now),rangeMarkup=range?'<div class="weather-range"><p>Next 24 hours</p><dl><div><dt>High</dt><dd>'+range.high+'°C</dd></div><div><dt>Low</dt><dd>'+range.low+'°C</dd></div></dl></div>':'';
        el('weather-data').innerHTML='<div class="weather-overview"><div class="weather-current"><div class="weather-main">'+weatherIcon(p)+'<strong class="weather-temperature">'+Math.round(c)+'<span class="weather-unit">°C</span></strong><div>'+esc(p.shortForecast)+'<br><span>Wind '+esc(p.windSpeed)+' '+esc(p.windDirection)+'</span></div></div><p class="weather-summary">'+Math.round(c*9/5+32)+'°F · Forecast</p></div>'+rangeMarkup+'</div><div id="tv-weather-days" class="weather-days"><p class="weather-days-unavailable">Loading upcoming forecast…</p></div>';
        request(daily,function(dailyError,data){if(el('tv-weather-days'))el('tv-weather-days').innerHTML=dailyMarkup(dailyForecast(dailyError?[]:data&&data.properties&&data.properties.periods||[]));fitDisplay();});
      });
    });
  }
  function paintTransit() {
    var now=Date.now(),stops=transit&&transit.stops||[],live=0;
    el('bus-arrivals').innerHTML=['34th St NW','35th St NW'].map(function(street,index){return '<section class="bus-location"><h3>Wisconsin Ave NW &amp; '+street+'</h3><div class="bus-directions">'+[0,1].map(function(direction){var ids=['1001637','1001645','1001706','1001699'],stop=null;stops.forEach(function(s){if(s.id===ids[index*2+direction])stop=s;});var fresh=stop&&stop.ok&&typeof stop.updatedAt==='number'&&stop.updatedAt<=now+5000&&now-stop.updatedAt<=90000;
      if(fresh)live++;var groups=[],byKey={};if(fresh)(stop.predictions||[]).slice().sort(function(a,b){return a.minutes-b.minutes;}).forEach(function(p){if(typeof p.route!=='string'||typeof p.minutes!=='number'||p.minutes<0||p.minutes%1)return;var key=p.route+'|'+p.destination,g=byKey[key];if(!g){g={route:p.route,destination:p.destination,times:[]};byKey[key]=g;groups.push(g);}if(g.times.length<2)g.times.push(p.minutes);});
      return '<div class="bus-direction"><h4>'+(direction?'↓ Southbound':'↑ Northbound')+'</h4>'+(groups.slice(0,2).map(function(g){return '<div class="bus-route"><strong class="bus-route-label">'+esc(g.route)+'</strong><span class="bus-destination">'+esc(g.destination)+'</span><p>'+g.times.map(function(t){return '<span>'+(t===0?'Due':t+'<small> min</small>')+'</span>';}).join('')+'</p></div>';}).join('')||'<p class="bus-empty">'+(fresh?'No live arrivals listed.':'Live arrivals unavailable.')+'</p>')+'</div>';
    }).join('')+'</div></section>';}).join('');
    text('bus-live',live===4?'Live':live?'Live · partial':'Unavailable');el('bus-live').setAttribute('data-live',String(live>0));text('bus-status',live?'WMATA estimates':'Feed unavailable · retrying');fitDisplay();
  }
  function buses() {request('https://bisw-bus-arrivals.nathan-d-berndt.workers.dev/arrivals',function(error,data){if(!error)transit=data;paintTransit();});}
  el('fullscreen').onclick=function(){var d=document.documentElement,fn=d.requestFullscreen||d.webkitRequestFullscreen;if(fn)try{fn.call(d);}catch(e){text('status','Use your TV browser’s full-screen option.');}};
  clock();render();paintTransit();refresh();weather();buses();
  setInterval(clock,1000);setInterval(function(){slide++;paintEvents();render();},12000);
  setInterval(refresh,30000);setInterval(weather,900000);setInterval(buses,30000);setInterval(paintTransit,5000);
}());

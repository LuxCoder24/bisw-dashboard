import {esc,dcDate} from './helpers.js';

// Drawn locally so the icons do not depend on another image service.
const cloud = '<path d="M17 39h30a10 10 0 0 0 0-20h-1a14 14 0 0 0-27-3 12 12 0 0 0-2 23Z"/>';
const sun = '<circle cx="32" cy="32" r="11"/><path d="M32 5v7m0 40v7M5 32h7m40 0h7M13 13l5 5m28 28 5 5M13 51l5-5m28-28 5-5"/>';
const moon = '<path d="M46 43A23 23 0 0 1 24 8a23 23 0 1 0 22 35Z"/>';
const symbols = {
  sun, moon,
  cloud,
  'partly-cloudy': '<circle cx="21" cy="20" r="9"/><path d="M21 3v4M4 20h4M9 8l3 3m22-3-3 3"/><path fill="var(--panel)" d="M18 45h30a10 10 0 0 0 0-20h-1a14 14 0 0 0-27-3 12 12 0 0 0-2 23Z"/>',
  'partly-cloudy-night': '<path d="M30 22A15 15 0 0 1 19 4a16 16 0 0 0-9 29"/><path fill="var(--panel)" d="M18 45h30a10 10 0 0 0 0-20h-1a14 14 0 0 0-27-3 12 12 0 0 0-2 23Z"/>',
  rain: cloud + '<path d="m23 46-3 8m14-8-3 8m14-8-3 8"/>',
  snow: cloud + '<path d="M21 47v10m-4-8 8 6m-8 0 8-6m17-2v10m-4-8 8 6m-8 0 8-6"/>',
  sleet: cloud + '<path d="m23 46-3 7m23-7-3 7"/><circle cx="30" cy="55" r="1"/>',
  storm: cloud + '<path d="m34 43-8 10h8l-5 9m16-17-3 8"/>',
  fog: cloud + '<path d="M12 47h40M17 55h30"/>',
  wind: '<path d="M7 23h34a8 8 0 1 0-8-8M7 33h43a7 7 0 1 1-7 7M7 43h18a7 7 0 1 1-7 7"/>',
};

export function weatherIcon(period){
  const forecast = String(period.shortForecast || '').toLowerCase();
  // NWS icon names also identify weather when its description includes qualifiers.
  let codes = [];
  try { codes = new URL(period.icon).pathname.split('/').slice(4).map(part => part.split(',')[0]); } catch {}
  const has = (...names) => codes.some(code => names.includes(code));
  const night = period.isDaytime === false;
  let name;
  if (/thunder|tornado|hurricane|tropical storm/.test(forecast) || has('tsra','tsra_sct','tsra_hi','tornado','hurricane','tropical_storm')) name='storm';
  else if (/sleet|freezing rain|ice pellets|wintry|rain.*snow|snow.*rain/.test(forecast) || has('rain_snow','rain_sleet','snow_sleet','fzra','rain_fzra','snow_fzra','sleet')) name='sleet';
  else if (/snow|flurr/.test(forecast) || has('snow','blizzard')) name='snow';
  else if (/rain|shower|drizzle/.test(forecast) || has('rain','rain_showers','rain_showers_hi')) name='rain';
  else if (/fog|mist|haze|smoke/.test(forecast) || has('fog','haze','smoke','dust')) name='fog';
  else if (/windy|breezy/.test(forecast) || codes.some(code=>code.startsWith('wind_'))) name='wind';
  else if (/partly|mostly sunny|mostly clear/.test(forecast) || has('few','sct')) name=night?'partly-cloudy-night':'partly-cloudy';
  else if (/cloud|overcast/.test(forecast) || has('bkn','ovc')) name='cloud';
  else if (/sunny|clear|fair/.test(forecast) || has('skc','hot','cold')) name=night?'moon':'sun';
  else name='cloud';
  return `<svg class="weather-symbol" data-weather="${name}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${symbols[name]}</svg>`;
}

function temperatureC(period){
  if(!Number.isFinite(period.temperature))return null;
  if(period.temperatureUnit==='C')return period.temperature;
  if(period.temperatureUnit==='F')return (period.temperature-32)*5/9;
  return null;
}

export function forecastRange(periods,now=Date.now()){
  const until=now+24*60*60*1000;
  const hours=periods.map(period=>({start:Date.parse(period.startTime),end:Date.parse(period.endTime),c:temperatureC(period)}))
    .filter(hour=>hour.end>now&&hour.start<until&&hour.end>hour.start)
    .sort((a,b)=>a.start-b.start);
  let coveredUntil=now;
  const temperatures=[];
  for(const hour of hours){
    // Do not describe a partial or missing forecast as a full 24-hour range.
    if(hour.start>coveredUntil||hour.c===null)return null;
    temperatures.push(hour.c);
    coveredUntil=Math.max(coveredUntil,hour.end);
  }
  if(coveredUntil<until||!temperatures.length)return null;
  return {high:Math.round(Math.max(...temperatures)),low:Math.round(Math.min(...temperatures))};
}

export function dailyForecast(periods,now=Date.now()){
  if(!Array.isArray(periods))return [];
  const today=dcDate(new Date(now));
  const ordered=[...periods].filter(p=>Number.isFinite(Date.parse(p.startTime))&&Date.parse(p.endTime)>Date.parse(p.startTime)).sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime));
  const days=[],seen=new Set();
  for(let i=0;i<ordered.length;i++){
    const day=ordered[i],night=ordered[i+1],date=dcDate(new Date(day.startTime));
    if(day.isDaytime!==true||date<=today||seen.has(date))continue;
    // NWS supplies daytime highs and the following overnight lows as separate periods.
    if(night?.isDaytime!==false||Date.parse(night.startTime)!==Date.parse(day.endTime))continue;
    const high=temperatureC(day),low=temperatureC(night);
    if(high===null||low===null)continue;
    days.push({date,label:new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short'}).format(new Date(day.startTime)),high:Math.round(high),low:Math.round(low),condition:String(day.shortForecast||'Forecast'),period:day});
    seen.add(date);if(days.length===5)break;
  }
  return days;
}

export function dailyForecastMarkup(days){
  if(!days.length)return '<p class="weather-days-unavailable">Upcoming forecast temporarily unavailable.</p>';
  const minimum=Math.min(...days.flatMap(day=>[day.low,day.high])),maximum=Math.max(...days.flatMap(day=>[day.low,day.high]));
  const span=maximum-minimum;
  return `<div class="weather-days-heading">Next ${days.length} ${days.length===1?'day':'days'} <span>°C</span></div><ol class="weather-day-list" aria-label="Upcoming daytime highs and overnight lows">${days.map(day=>{
    const left=span?(Math.min(day.low,day.high)-minimum)/span*100:0;
    const width=span?Math.abs(day.high-day.low)/span*100:100;
    return `<li class="weather-day"><span class="weather-day-name">${esc(day.label)}</span><span class="weather-day-condition" role="img" aria-label="${esc(day.condition)}" title="${esc(day.condition)}">${weatherIcon(day.period)}</span><span class="weather-day-low" aria-label="Overnight low ${day.low} degrees Celsius">${day.low}°</span><span class="weather-day-track" aria-hidden="true"><span style="left:${left}%;width:${width}%"></span></span><strong class="weather-day-high" aria-label="Daytime high ${day.high} degrees Celsius">${day.high}°</strong></li>`;
  }).join('')}</ol>`;
}

export function startWeather(){
  const target=document.getElementById('weather-data');
  async function update(){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      async function get(url){
        if(new URL(url).origin!=='https://api.weather.gov')throw new Error('Unexpected weather host');
        const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/geo+json'}});
        if(!response.ok)throw new Error('Weather unavailable');return response.json();
      }
      // The browser supplies its User-Agent. Resolve the grid afresh each refresh.
      const point=await get('https://api.weather.gov/points/38.9072,-77.0369');
      // Start both requests together; a failed daily forecast must not erase current weather.
      const dailyRequest=get(point.properties.forecast).then(data=>({data}),()=>({data:null}));
      const forecast=await get(point.properties.forecastHourly);
      const periods=forecast.properties.periods;
      const now=Date.now();
      const period=periods.find(p=>Date.parse(p.startTime)<=now&&Date.parse(p.endTime)>now);
      if(!period)throw new Error('Weather unavailable');
      const c=temperatureC(period);
      if(c===null)throw new Error('Weather unavailable');
      const f=c*9/5+32;
      const range=forecastRange(periods,now);
      const rangeMarkup=range?`<div class="weather-range"><p>Next 24 hours</p><dl><div><dt>High</dt><dd>${range.high}°C</dd></div><div><dt>Low</dt><dd>${range.low}°C</dd></div></dl></div>`:'';
      target.innerHTML=`<div class="weather-overview"><div class="weather-current"><div class="weather-main">${weatherIcon(period)}<strong class="weather-temperature">${Math.round(c)}<span class="weather-unit">°C</span></strong><div>${esc(period.shortForecast)}<br><span>Wind ${esc(period.windSpeed)} ${esc(period.windDirection)}</span></div></div><p class="weather-summary">${Math.round(f)}°F · Forecast</p></div>${rangeMarkup}</div><div class="weather-days"><p class="weather-days-unavailable">Loading upcoming forecast…</p></div>`;
      const daily=await dailyRequest;
      target.querySelector('.weather-days').innerHTML=dailyForecastMarkup(dailyForecast(daily.data?.properties?.periods,Date.now()));
    }catch{target.innerHTML='<p class="empty-state">Weather temporarily unavailable.</p>';}finally{clearTimeout(timer);controller.abort();}
  }
  update();setInterval(update,15*60*1000);
}

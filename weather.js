import {esc} from './helpers.js';
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
      const forecast=await get(point.properties.forecastHourly);
      const period=forecast.properties.periods.find(p=>new Date(p.endTime).getTime()>Date.now());
      if(!period||!Number.isFinite(period.temperature))throw new Error('Weather unavailable');
      const f=period.temperatureUnit==='F'?period.temperature:period.temperature*9/5+32;
      const c=(f-32)*5/9;
      target.innerHTML=`<div class="weather-main"><strong>${Math.round(c)}°<span>C</span></strong><div>${esc(period.shortForecast)}<br><span>Wind ${esc(period.windSpeed)} ${esc(period.windDirection)}</span></div></div><p style="font-size:.7rem;color:var(--muted)">${Math.round(f)}°F · Hourly forecast</p>`;
    }catch{target.innerHTML='<p class="empty-state">Weather temporarily unavailable.</p>';}finally{clearTimeout(timer);}
  }
  update();setInterval(update,15*60*1000);
}

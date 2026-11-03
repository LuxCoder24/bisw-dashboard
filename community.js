/* Shared read-only community rotation. ES5 syntax for built-in television browsers. */
(function () {
  'use strict';
  var items=[],selected=0,signature='',date='',onChange=function(){};
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function kind(item){var match=/^community-(birthday|offer)-/.exec(item.id||'');return match?match[1]:null;}
  function midnight(value){var p=String(value).split('-');return Date.UTC(Number(p[0]),Number(p[1])-1,Number(p[2]));}
  function birthdayDate(item,today){
    var match=/^\d{4}-(\d{2})-(\d{2})$/.exec(item.date||'');if(!match)return null;
    var month=Number(match[1]),day=Number(match[2]),year=Number(today.slice(0,4)),candidate,i;
    if(month<1||month>12||day<1||day>31)return null;
    for(i=0;i<9;i++){
      candidate=new Date(Date.UTC(year+i,month-1,day));
      if(candidate.getUTCMonth()!==month-1||candidate.getUTCDate()!==day)continue;
      if(candidate.getTime()>=midnight(today))return candidate.toISOString().slice(0,10);
    }return null;
  }
  function slides(records,today){
    var birthdays=[],offers=[],result=[],i;
    records.forEach(function(item){
      var type=kind(item),next,days;
      if(!item.title)return;
      if(type==='birthday'){
        next=birthdayDate(item,today);if(!next)return;days=Math.round((midnight(next)-midnight(today))/86400000);
        if(days>=0&&days<=7)birthdays.push({id:item.id,kind:type,title:item.title,description:item.description||'Happy birthday!',date:next,days:days});
      }else if(type==='offer'&&item.date>=today)offers.push({id:item.id,kind:type,title:item.title,description:item.description||'',date:item.date});
    });
    birthdays.sort(function(a,b){return a.days-b.days||a.title.localeCompare(b.title);});
    offers.sort(function(a,b){return b.date.localeCompare(a.date)||a.title.localeCompare(b.title);});
    for(i=0;i<Math.max(birthdays.length,offers.length);i++){if(birthdays[i])result.push(birthdays[i]);if(offers[i])result.push(offers[i]);}
    return result;
  }
  var cake='<path d="M7 13h26v19H7zM7 21c4 5 5-5 9 0s5-5 9 0 5-5 8 0M5 32h30M13 13V8m7 5V8m7 5V8M13 4v1m7-1v1m7-1v1"/>',cap='<path d="m3 14 17-8 17 8-17 8zM10 18v10c7 6 13 6 20 0V18M37 14v14"/>';
  function paint(){
    var board=document.getElementById('community-board');if(!board)return;
    var item=items[selected%Math.max(1,items.length)],target=document.getElementById('community-content');
    board.hidden=!item;
    var strip=document.querySelector('.support-strip');if(strip)strip.className='support-strip'+(item?' has-community':'');
    if(!item){target.innerHTML='';onChange();return;}
    var birthday=item.kind==='birthday',label=birthday?'Birthday · '+(item.days===0?'Today':item.days===1?'Tomorrow':new Date(item.date+'T12:00:00Z').toUTCString().slice(5,11)):'University offer received';
    board.setAttribute('data-community-kind',item.kind);
    target.innerHTML='<article class="community-slide"><svg class="community-symbol" viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(birthday?cake:cap)+'</svg><div class="community-copy"><p class="community-label">'+esc(label)+'</p><h3>'+esc(item.title)+'</h3><p class="community-detail">'+esc(item.description).replace(/\n/g,' · ')+'</p></div></article>';
    document.getElementById('community-position').textContent=items.length>1?(selected+1)+' / '+items.length:'';
    onChange();
  }
  window.BISWCommunity={kind:kind,birthdayDate:birthdayDate,slides:slides,update:function(records,today,callback){
    if(callback)onChange=callback;
    var next=slides(records,today),nextSignature=JSON.stringify(next);
    if(signature!==nextSignature||date!==today){var previous=items[selected];items=next;selected=0;if(previous)items.some(function(item,index){if(item.id===previous.id){selected=index;return true;}return false;});signature=nextSignature;date=today;paint();}
    else onChange();
  }};
  setInterval(function(){if(document.hidden||items.length<2)return;selected=(selected+1)%items.length;paint();},10000);
}());

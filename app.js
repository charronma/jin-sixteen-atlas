'use strict';
const D=window.ATLAS,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
let index=D.frames.findIndex(f=>f.year===280),playing=null,view='map',activeFilter=false,geoReady=false;
function el(tag,attrs={},text=''){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;return n;}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function point(p){return[(p[0]-93)*27,(46-p[1])*25];}
function path(coords,close=false){return coords.map((p,i)=>`${i?'L':'M'}${point(p).map(v=>v.toFixed(2)).join(',')}`).join(' ')+(close?'Z':'');}
function geoPath(g){if(g.type==='Polygon')return g.coordinates.map(c=>path(c,true)).join(' ');if(g.type==='MultiPolygon')return g.coordinates.flatMap(p=>p.map(c=>path(c,true))).join(' ');if(g.type==='LineString')return path(g.coordinates);if(g.type==='MultiLineString')return g.coordinates.map(c=>path(c)).join(' ');return '';}
function state(id){return D.states.find(s=>s.id===id);}
function alive(s,year){return (s.periods||[[s.start,s.end]]).some(([a,b])=>year>=a&&year<b);}
function chapterButtons(){ $('chapters').innerHTML=D.chapters.map(c=>`<button class="chapter-button" data-year="${c.year}"><small>${c.range}</small><span><b>0${c.id+1}</b>${c.name}</span></button>`).join('');}
function setYear(year){index=D.frames.findIndex(f=>f.year===year);if(index<0)index=0;render();}
function stop(){if(playing)clearInterval(playing);playing=null;$('playButton').textContent='▷ 自动浏览';$('playButton').setAttribute('aria-pressed','false');}
function move(n){index=Math.max(0,Math.min(D.frames.length-1,index+n));render();}
function setView(v){view=v;for(const x of ['map','timeline','guide'])$(x+'View').hidden=x!==v;document.querySelectorAll('.nav').forEach(n=>{n.classList.toggle('active',n.dataset.view===v);if(n.dataset.view===v)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});if(v!=='map')stop();if(v==='timeline')renderLifelines();}
function render(){const f=D.frames[index];
$('fullscreenYear').textContent=`${f.year}年`;
$('fullscreenTitle').textContent=f.title;
$('fullscreenPrevious').disabled=index===0;
$('fullscreenNext').disabled=index===D.frames.length-1;
$('fullscreenSlider').max=D.frames.length-1;
$('fullscreenSlider').value=index;
$('fullscreenSlider').setAttribute('aria-valuetext',`${f.year}年，${f.title}`);
$('fullscreenYearSelect').innerHTML=D.frames.map((a,i)=>`<option value="${i}" ${i===index?'selected':''}>${a.year}年</option>`).join('');
$('yearNumber').textContent=f.year;$('frameTitle').textContent=f.title;$('stageLabel').textContent=`第${f.stage+1}阶段 · ${D.chapters[f.stage].name}`;$('stepCounter').textContent=`${String(index+1).padStart(2,'0')} / ${D.frames.length}`;$('previous').disabled=index===0;$('next').disabled=index===D.frames.length-1;$('yearSlider').max=D.frames.length-1;$('yearSlider').value=index;$('yearSlider').setAttribute('aria-valuetext',`${f.year}年，${f.title}`);$('yearSelect').innerHTML=D.frames.map((a,i)=>`<option value="${i}" ${i===index?'selected':''}>${a.year}年</option>`).join('');
for(const[id,key]of [['eventType','type'],['eventTitle','title'],['eventSummary','summary'],['beforeText','before'],['changeText','change'],['afterText','after'],['rememberText','remember']])$(id).textContent=f[key];$('people').innerHTML=f.people.map(p=>`<b>${esc(p)}</b>`).join('');$('eventSources').innerHTML=f.source.map(id=>{const s=D.sources.find(s=>s.id===id);return `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a>`;}).join('')+(f.volume?`<a href="https://zh.wikisource.org/wiki/資治通鑑/卷${f.volume}" target="_blank" rel="noopener">《通鉴》卷${f.volume}</a>`:'');
$('chapters').querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('active',i===f.stage);b.setAttribute('aria-pressed',i===f.stage?'true':'false');});
$('timeTicks').innerHTML=D.frames.map((a,i)=>`<button data-index="${i}" class="${i===index?'active':''}" aria-label="${a.year}年，${esc(a.title)}" title="${esc(a.title)}">${a.year}</button>`).join('');
const current=D.states.filter(s=>alive(s,f.year));$('activeStates').innerHTML=current.map(s=>`<button class="state-chip" data-state="${s.id}"><i class="state-dot" style="background:${s.color}"></i>${s.name}</button>`).join('');
renderMap();renderLifelines();renderCompanion(f);}
function borderPath(regions){const edges=new Map();for(const r of regions){const ps=D.regions[r];for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length],key=[a.join(','),b.join(',')].sort().join('|');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}}return [...edges.values()].map(e=>path(e)).join(' ');}
function renderMap(){const f=D.frames[index];$('territories').replaceChildren();$('countryLabels').replaceChildren();$('battle').replaceChildren();for(const[id,regions]of Object.entries(f.map)){const s=state(id);if(!s)continue;const n=el('path',{d:regions.map(r=>path(D.regions[r],true)).join(' '),fill:s.color,stroke:'none',class:'territory','data-state':id,tabindex:0,role:'button','aria-label':`查看${s.name}详情`});n.append(el('title',{},`${s.name}：主要控制区域示意`));$('territories').append(n,el('path',{d:borderPath(regions),fill:'none',stroke:'#142339','stroke-width':1.5,'pointer-events':'none'}));const p=f.labels?.[id];if(p){let[x,y]=point(p);const near=D.cities.find(c=>{const[a,b]=point(c.p);return Math.hypot(a-x,b-y)<55;});if(near){const cy=point(near.p)[1];y+=y<=cy?-32:32;}$('countryLabels').append(el('text',{x,y,fill:s.color,class:'country-label','text-anchor':'middle','data-state':id,'font-size':Object.keys(f.map).length>6?19:25},(f.year===316&&id==='jin')?'晋室势力':s.name));}}
$('legend').innerHTML=Object.keys(f.map).filter(state).map(id=>{const s=state(id);return `<button data-state="${id}"><i style="background:${s.color}"></i>${s.name}</button>`;}).join('');
if(f.battle){const[x,y]=point(f.battle);const g=el('g');g.append(el('circle',{cx:x,cy:y,r:8,fill:'none',stroke:'#ffe3a6','stroke-width':1.5}),el('circle',{cx:x,cy:y,r:3,fill:'#ffe3a6'}),el('text',{x:x+13,y:y+6,fill:'#ffe3a6','font-size':13,'paint-order':'stroke',stroke:'#142339','stroke-width':3},'淝水'));$('battle').append(g);}
$('mapTitle').textContent=`${f.year}年：${f.title}，主要政权形势示意`;renderCities();}
function renderCities(){const modern=$('modernToggle').checked;$('cities').replaceChildren();D.cities.forEach(c=>{const[x,y]=point(c.p),group=el('g',{class:'city '+(['长安','建康','姑臧','龙城'].includes(c.name)?'primary-city':'secondary-city')});group.append(el('circle',{cx:x,cy:y,r:2.5,fill:'#e1edf6'}));const text=el('text',{x:x+7,y:y+5,class:'city-label'},c.name);if(modern)text.append(el('tspan',{x:x+7,dy:19,class:'modern-city'},'今'+c.modern));group.append(text);$('cities').append(group);});}
async function loadGeo(){try{const responses=await Promise.all([fetch('land.geojson'),fetch('rivers.geojson')]);if(responses.some(r=>!r.ok))throw new Error('geo');const[land,rivers]=await Promise.all(responses.map(r=>r.json()));land.features.forEach(f=>$('land').append(el('path',{d:geoPath(f.geometry),class:'land'})));const clip=el('clipPath',{id:'landClip'});land.features.forEach(f=>clip.append(el('path',{d:geoPath(f.geometry)})));$('map').querySelector('defs').append(clip);$('territories').setAttribute('clip-path','url(#landClip)');const names=new Set(['Huang','Huang He','Yangtze','Yellow','Chang','Chang Jiang']);rivers.features.filter(f=>names.has(f.properties.name)).forEach(f=>$('rivers').append(el('path',{d:geoPath(f.geometry),class:'river'})));const geo=[['河西走廊',[98.9,39.3]],['关中',[108,35.7]],['巴蜀',[104.4,28.4]],['江南',[117.3,27]],['黄河',[108.5,40]],['长江',[114.7,30.5]],['东海',[123,29]]];geo.forEach(([name,p])=>{const[x,y]=point(p);$('geography').append(el('text',{x,y,class:'geo-label','text-anchor':'middle'},name));});geoReady=true;$('mapLoading').hidden=true;}catch(e){$('mapLoading').textContent='地理底图未能载入，仍可查看政权示意与时间轴。';$('mapLoading').style.top='8px';}}
function lifeMarkup(states){const f=D.frames[index],cursor=(f.year-265)/174*100;return `<div class="life-axis"><span>政权 / 公元</span><div class="axis-track"><span>265</span><span>300</span><span>335</span><span>370</span><span>405</span><span>439</span></div></div>`+states.map(s=>`<div class="life-row ${alive(s,f.year)?'current':''}"><button class="life-name" data-state="${s.id}"><i class="state-dot" style="background:${s.color}"></i>${s.name}</button><div class="life-track">${(s.periods||[[s.start,s.end]]).map(([a,b])=>{let left=Math.max(265,a),right=Math.min(439,b);if(left>439||right<265)return '';return `<button class="life-bar" data-state="${s.id}" aria-label="${s.name}，${a}至${b}年" title="${s.name} ${a}—${b}" style="left:${(left-265)/174*100}%;width:${Math.max(.8,(right-left)/174*100)}%;background:${s.color}"></button>`;}).join('')}<i class="life-cursor" style="left:${cursor}%"></i></div></div>`).join('');}
function renderLifelines(){const f=D.frames[index];$('miniLifelines').innerHTML=lifeMarkup(D.states.filter(s=>['jin','eastjin','qin','wei','song'].includes(s.id)));$('timelineYear').textContent=`所选年份：${f.year}年`;$('timelineAll').setAttribute('aria-pressed',String(!activeFilter));$('timelineActive').setAttribute('aria-pressed',String(activeFilter));const groups=[...new Set(D.states.map(s=>s.group))];$('fullLifelines').innerHTML=groups.map(g=>{const ss=D.states.filter(s=>s.group===g&&(!activeFilter||alive(s,f.year)));return ss.length?`<div class="life-group">${g}</div>${lifeMarkup(ss)}`:'';}).join('');}
function details(id){const s=state(id);if(!s)return;stop();const dates=s.periods?s.periods.map(p=>p.join('—')).join('、'):`${s.start}—${s.end}`;$('detailContent').innerHTML=`<span class="eyebrow">${esc(s.group)}</span><div class="detail-dates">${s.traditional?'传统十六国之一':'相关政权 · 不在传统十六国名单内'}</div><h2 id="detailTitle"><i class="state-dot" style="background:${s.color};width:14px;height:14px;margin-right:10px"></i>${s.name}</h2><div class="detail-dates">公元 ${dates} 年${s.end>439?' · 年表显示至439年':''}</div><p>${esc(s.desc)}</p><div class="detail-grid"><div><small>主要都城 / 治所</small><strong>${esc(s.capital)}</strong></div><div><small>主要活动区域</small><strong>${esc(s.place)}</strong></div><div><small>建立者 / 早期奠基者</small><strong>${esc(s.founder)}</strong></div><div><small>主要统治集团</small><strong>${esc(s.family)}</strong></div></div><h3>沿着这几个节点记</h3>${s.events.map(([y,t])=>`<div class="detail-milestone"><b>${y}年</b><span>${esc(t)}</span></div>`).join('')}<h3>与其他政权的关系</h3><p>${esc(s.relation)}</p>${relatedStates(s)}${s.note?`<h3>年代说明</h3><p>${esc(s.note)}</p>`:''}<div class="detail-jump">${D.frames.filter(f=>f.year>=s.start&&f.year<=s.end).filter((f,i,a)=>i===0||i===a.length-1||s.events.some(e=>e[0]===f.year)).map(f=>`<button data-jump="${f.year}">看${f.year}年地图</button>`).join('')}</div><div class="event-sources"><a target="_blank" rel="noopener" href="${s.source||'https://zh.wikisource.org/wiki/晉書'}">${s.sourceTitle||'史料入口：《晋书》'}</a></div>`;$('detailDialog').showModal();}
function guide(){guideCompanion(); $('guideChapters').innerHTML=D.chapters.map(c=>`<article class="guide-card"><small>0${c.id+1} · ${c.range}年</small><h2>${c.name}</h2><p>${c.text}</p><p class="question">带着这个问题看：${c.question}</p><button data-guide="${c.year}">进入这一阶段</button></article>`).join('');$('sourceList').innerHTML=D.sources.map(s=>`<div class="source-item"><a href="${s.url}" target="_blank" rel="noopener">${s.title}</a><small>${s.note}</small></div>`).join('');}
document.addEventListener('click',e=>{const stateButton=e.target.closest('[data-state]');if(stateButton){details(stateButton.dataset.state);return;}const c=e.target.closest('[data-year]');if(c){stop();setYear(+c.dataset.year);setView('map');return;}const t=e.target.closest('[data-index]');if(t){stop();index=+t.dataset.index;render();return;}const nav=e.target.closest('[data-view]');if(nav){setView(nav.dataset.view);return;}const j=e.target.closest('[data-jump],[data-guide]');if(j){$('detailDialog').close();setYear(+(j.dataset.jump||j.dataset.guide));setView('map');window.scrollTo({top:0,behavior:'smooth'});return;}if(e.target.closest('.dialog-close'))e.target.closest('dialog').close();});
$('territories').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset.state){e.preventDefault();details(e.target.dataset.state);}});// Keep one map and one year state in both normal and fullscreen views.
let mapFullscreen=false,fullscreenBusy=false,fullscreenInert=[];
function syncFullscreen(active){
 if(mapFullscreen===active)return;
 mapFullscreen=active;
 $('mapPanel').classList.toggle('is-fullscreen',active);
 document.body.classList.toggle('map-fullscreen-open',active);
 $('fullscreenControls').hidden=!active;
 $('fullscreenButton').setAttribute('aria-pressed',String(active));
 $('fullscreenButton').setAttribute('aria-label',active?'退出地图全屏':'地图全屏');
 $('fullscreenButtonText').textContent=active?'退出全屏':'全屏';
 if(active){
  fullscreenInert=[...document.querySelectorAll('.site-header,.chapter-strip,.context-bar,.story-panel,.time-panel,.mini-timeline,footer,#sourcesDialog')].map(n=>[n,n.inert]);
  fullscreenInert.forEach(([n])=>n.inert=true);
 }else{
  fullscreenInert.forEach(([n,previous])=>n.inert=previous);
  fullscreenInert=[];
 }
 $('fullscreenButton').focus({preventScroll:true});
}
async function toggleFullscreen(){
 if(fullscreenBusy)return;
 fullscreenBusy=true;
 try{
  if(mapFullscreen){
   if(document.fullscreenElement===$('mapPanel'))await document.exitFullscreen();
   else syncFullscreen(false);
  }else{
   stop();
   if($('mapPanel').requestFullscreen&&document.fullscreenEnabled){
    try{await $('mapPanel').requestFullscreen();syncFullscreen(true);}
    catch{syncFullscreen(true);}
   }else syncFullscreen(true);
  }
 }finally{fullscreenBusy=false;}
}
document.addEventListener('fullscreenchange',()=>syncFullscreen(document.fullscreenElement===$('mapPanel')));
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&mapFullscreen&&!document.fullscreenElement&&!document.querySelector('dialog[open]')){
  e.preventDefault();syncFullscreen(false);
 }
});
$('fullscreenButton').onclick=toggleFullscreen;
$('fullscreenPrevious').onclick=()=>{stop();move(-1);};
$('fullscreenNext').onclick=()=>{stop();move(1);};
$('fullscreenYearSelect').onchange=$('fullscreenSlider').oninput=e=>{stop();index=+e.target.value;render();};
$('previous').onclick=()=>{stop();move(-1);};$('next').onclick=()=>{stop();move(1);};$('yearSlider').oninput=e=>{stop();index=+e.target.value;render();};$('modernToggle').onchange=renderCities;$('yearSelect').onchange=e=>{stop();index=+e.target.value;render();};$('playButton').onclick=()=>{if(playing){stop();return;}if(index===D.frames.length-1)index=0;render();$('playButton').textContent='Ⅱ 暂停浏览';$('playButton').setAttribute('aria-pressed','true');playing=setInterval(()=>{if(index>=D.frames.length-1){stop();return;}move(1);},6000);};$('sourcesButton').onclick=$('footerSources').onclick=()=>{stop();$('sourcesDialog').showModal();};$('fullTimeline').onclick=()=>setView('timeline');$('timelineAll').onclick=()=>{activeFilter=false;$('timelineAll').classList.add('active');$('timelineActive').classList.remove('active');renderLifelines();};$('timelineActive').onclick=()=>{activeFilter=true;$('timelineActive').classList.add('active');$('timelineAll').classList.remove('active');renderLifelines();};document.querySelector('.brand').onclick=e=>{e.preventDefault();setView('map');};document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
chapterButtons();guide();render();loadGeo();

// Optional browser agent interface; it uses the same visible controls and data.
(function registerAtlasTools(){
 const context=document.modelContext||navigator.modelContext;if(!context?.registerTool)return;
 const lifecycle=new AbortController();
 const read=()=>{const f=D.frames[index];return{year:f.year,title:f.title,stage:D.chapters[f.stage].name,view,summary:f.summary,states:D.states.filter(s=>alive(s,f.year)).map(s=>({id:s.id,name:s.name})),mapNote:'区域级教学示意，非精确疆界'};};
 const definitions=[
 {name:'read_history_context',title:'读取当前历史局势',description:'Read the currently selected year, event, stage and contemporary states in this historical atlas.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(input===null||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object.');return read();}},
 {name:'navigate_history_year',title:'查看关键年份',description:'Navigate this atlas to one of its supported key years and update the visible map, timeline and event explanation. This only changes the current page view.',inputSchema:{type:'object',properties:{year:{type:'integer',enum:D.frames.map(f=>f.year)}},required:['year'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Object.keys(input).some(k=>k!=='year')||!Number.isInteger(input.year)||!D.frames.some(f=>f.year===input.year))throw new Error('Choose one of the supported key years.');stop();setYear(input.year);setView('map');return read();}}
 ];
 definitions.forEach(tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}});
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
})();

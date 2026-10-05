'use strict';
// The companion offers chapter navigation, separate from event-level primary sources.
function companionLink(bookId,label){
 const b=D.books.find(b=>b.id===bookId);
 return `<a href="${b.url}" target="_blank" rel="noopener">${esc(label)} <span aria-hidden="true">↗</span></a>`;
}
function renderCompanion(f){
 const r=D.readingStages[f.stage],note=D.mapNotes[f.year]||D.stageMapNotes[f.stage];
 $('mapReadingTitle').textContent=`看图线索 · ${note[0]}`;
 $('mapReadingText').textContent=note[1];
 $('currentReading').innerHTML=`<p class="reading-question">${esc(r.question)}</p><ul class="reading-list"><li><small>整体框架 · 吕思勉</small>${companionLink('lvGeneral',`《中国通史》${r.lv}`)}</li><li><small>事件展开 · 吕思勉</small>${companionLink('lvJin',`《两晋南北朝史》${r.jin}`)}</li><li><small>背景对照 · 钱穆</small>${companionLink('qian',`《国史大纲》${r.qian}`)}</li><li><small>按年核读 · 司马光</small><a href="https://zh.wikisource.org/wiki/資治通鑑/卷${f.volume}" target="_blank" rel="noopener">《资治通鉴》卷${f.volume} · ${f.year}年条 ↗</a></li></ul><p class="reading-status">前三项为目录对应的阅读建议；《通鉴》链接定位原文。章名以所链接目录为准，页码随版本变化。</p>`;
}
function guideCompanion(){
 $('bookCards').innerHTML=D.books.map((b,i)=>`<article class="book-card"><div class="book-card-top"><span>0${i+1}</span><small>${b.status}</small></div><h3>${b.title}</h3><p class="book-author">${b.author} · ${b.role}</p><p>${b.note}</p><div class="book-links"><a href="${b.url}" target="_blank" rel="noopener">${b.linkLabel} ↗</a>${b.catalog?`<a href="${b.catalog}" target="_blank" rel="noopener">章节目录 ↗</a>`:''}</div></article>`).join('');
 $('relationLessons').innerHTML=D.relationLessons.map(l=>`<article class="relation-card"><h3>${l.title}</h3><p>${l.intro}</p><div class="relation-states">${l.states.map(id=>{const s=state(id);return `<button class="state-chip" data-state="${id}"><i class="state-dot" style="background:${s.color}"></i>${s.name}<span>${s.family}</span></button>`;}).join('')}</div><ol class="relation-steps">${l.steps.map(([y,t])=>`<li><strong>${y}</strong><span>${t}</span></li>`).join('')}</ol><p class="relation-question">${l.question}</p><div class="relation-actions"><button data-guide="${l.year}">对照${l.year}年地图</button><a href="https://zh.wikisource.org/wiki/資治通鑑/卷${l.volume}" target="_blank" rel="noopener">重点原文 · 卷${l.volume} ↗</a></div></article>`).join('');
}
function relatedStates(s){
 const others=D.states.filter(other=>other.group===s.group&&other.id!==s.id);
 return others.length?`<div class="related-states"><h3>同组对照</h3><p>点击对照建立者、根据地与存续时间。分组便于学习，不表示全部具有直接继承关系。</p><div class="relation-states">${others.map(other=>`<button class="state-chip" data-state="${other.id}"><i class="state-dot" style="background:${other.color}"></i>${other.name}</button>`).join('')}</div></div>`:'';
}

(function(){
'use strict';
const G=window.G,U=G.U;
const UI=G.UI={cur:'title'};
const screens=['title','menu','partner','collection','gacha','upgrades','missions','rank','settings','help','pause','result'];

UI.show=function(name){
  for(const s of screens){
    const el=U.el('screen-'+s);
    if(el)el.classList.toggle('hidden',s!==name);
  }
  UI.cur=name;
  const gs=G.game;
  if(name==='title'||name==='menu'){
    U.el('hud').classList.add('hidden');
    U.el('touch-ui').classList.add('hidden');
  }
};
UI.hideAll=function(){
  for(const s of screens){
    const el=U.el('screen-'+s);
    if(el)el.classList.add('hidden');
  }
  UI.cur=null;
};

UI.toast=function(txt,cls){
  const box=U.el('toasts');
  const d=document.createElement('div');
  d.className='toast'+(cls?' '+cls:'');
  d.textContent=txt;
  box.appendChild(d);
  setTimeout(()=>d.remove(),2600);
  while(box.children.length>4)box.firstChild.remove();
};
UI.banner=function(txt){
  const b=U.el('big-banner');
  b.textContent=txt;
  b.classList.remove('hidden');
  b.style.animation='none';
  void b.offsetWidth;
  b.style.animation='';
  clearTimeout(b._t);
  b._t=setTimeout(()=>b.classList.add('hidden'),2200);
};

// ---------- 升级卡片 ----------
UI.showLevelUp=function(opts,cb){
  const box=U.el('levelup-cards');
  box.innerHTML='';
  for(const o of opts){
    const d=document.createElement('div');
    d.className='choice-card'+(o.evolve?' evo':'');
    d.innerHTML='<div class="ci">'+U.esc(o.icon)+'</div><div class="cn">'+U.esc(o.name)+
      (o.tag?'<div class="cl">'+U.esc(o.tag)+'</div>':'')+
      '</div><div class="cd">'+U.esc(o.desc||'')+'</div>';
    d.onclick=()=>{G.Audio.sfx('click');cb(o);};
    box.appendChild(d);
  }
  U.el('screen-levelup').classList.remove('hidden');
};
UI.hideLevelUp=function(){U.el('screen-levelup').classList.add('hidden');};
UI.showBless=function(opts,cb){
  const box=U.el('bless-cards');
  box.innerHTML='';
  for(const o of opts){
    const d=document.createElement('div');
    d.className='choice-card';
    d.innerHTML='<div class="ci">'+U.esc(o.icon)+'</div><div class="cn">'+U.esc(o.name)+'</div><div class="cd">'+U.esc(o.desc)+'</div>';
    d.onclick=()=>{G.Audio.sfx('click');cb(o);};
    box.appendChild(d);
  }
  U.el('screen-bless').classList.remove('hidden');
};
UI.hideBless=function(){U.el('screen-bless').classList.add('hidden');};

// ---------- 图鉴 ----------
UI.renderCollection=function(filter){
  const grid=U.el('dex-grid');
  const s=G.Save.data;
  const ids=Object.keys(G.SPECIES).sort((a,b)=>G.SPECIES[a].rarity-G.SPECIES[b].rarity||a.localeCompare(b));
  const owned=ids.filter(id=>G.Save.hasMon(id));
  U.el('dex-count').textContent='('+owned.length+'/'+ids.length+')';
  // 过滤器
  const fbox=U.el('dex-filter');
  fbox.innerHTML='';
  const filters=[{id:'all',n:'全部'},{id:'new',n:'未获得'},{id:'shiny',n:'闪光'}];
  for(const f of filters){
    const c=document.createElement('span');
    c.className='chip'+((filter||'all')===f.id?' on':'');
    c.textContent=f.n;
    c.onclick=()=>UI.renderCollection(f.id);
    fbox.appendChild(c);
  }
  grid.innerHTML='';
  for(const id of ids){
    const sp=G.SPECIES[id];
    const col=s.collection[id];
    if(filter==='new'&&col)continue;
    if(filter==='shiny'&&!(col&&col.sh>0))continue;
    const card=document.createElement('div');
    card.className='card'+(col?'':' locked')+(col&&col.sh>0?' shiny':'');
    const cv=document.createElement('canvas');cv.width=16;cv.height=16;
    const sheet=G.gfx.sheet(sp.sprite,col&&col.sh>0);
    if(sheet){const c2=cv.getContext('2d');G.gfx.fit(c2,sheet,cv.width||16,cv.height||16);}
    card.appendChild(cv);
    const nm=document.createElement('div');nm.className='nm';nm.textContent=col?sp.name:'？？？';card.appendChild(nm);
    const ty=document.createElement('div');ty.className='ty';
    ty.textContent=sp.types.map(t=>(G.Types.ICON[t]||'')+t).join(' ');card.appendChild(ty);
    const rar=document.createElement('div');rar.className='rar';
    rar.style.color=G.RARITY_COLOR[sp.rarity];
    rar.textContent=G.RARITY_NAME[sp.rarity]+(col?' ×'+col.n:'')+(col&&col.sh>0?' ✦闪光':'');
    card.appendChild(rar);
    card.onclick=()=>{
      if(!col){UI.toast('尚未获得该精灵，可通过扭蛋召唤');return;}
      showDexDetail(id);
    };
    grid.appendChild(card);
  }
};
function showDexDetail(id){
  const sp=G.SPECIES[id];
  const col=G.Save.data.collection[id];
  const box=U.el('dex-detail');
  box.classList.remove('hidden');
  const stats=calcStats(sp);
  box.innerHTML='<div class="dp-head"><canvas width="16" height="16" id="dex-cv"></canvas>'+
    '<div><h3>'+U.esc(sp.name)+(col&&col.sh>0?' ✦':'')+'</h3>'+
    '<div style="font-size:12px;color:var(--dim)">'+sp.types.map(t=>'<span style="color:'+G.Types.COLOR[t]+'">'+(G.Types.ICON[t]||'')+t+'</span>').join(' ')+'</div>'+
    '<div style="font-size:11px;color:var(--dim);margin-top:4px">'+U.esc(sp.desc||'')+'</div></div>'+
    '<button class="icon-btn" id="dex-close" style="margin-left:auto">✕</button></div>'+
    statRow('生命',stats.hp,260)+statRow('攻击',stats.dmg*100,160)+
    statRow('速度',stats.spd*100,150)+statRow('回复',stats.regen*100,100)+
    '<div style="margin-top:8px">'+sp.learn.map(l=>{
      const m=G.MOVES[l.m];return m?'<span class="move-chip">'+m.icon+' '+m.name+' @Lv'+l.lv+'</span>':'';
    }).join('')+'</div>'+
    (sp.evo?'<div class="mission-prog">进化 → '+U.esc(G.mon(sp.evo.into).name)+'（Lv.'+sp.evo.lv+'）</div>':'');
  const cv=U.el('dex-cv');
  const sheet=G.gfx.sheet(sp.sprite,col&&col.sh>0);
  if(sheet){const c2=cv.getContext('2d');G.gfx.fit(c2,sheet,cv.width||16,cv.height||16);}
  U.el('dex-close').onclick=()=>box.classList.add('hidden');
}
function statRow(k,v,max){
  const pct=U.clamp(v/max*100,2,100);
  return '<div class="stat-row"><span>'+k+'</span><div class="stat-bar"><i style="width:'+pct+'%"></i></div><span>'+Math.round(v)+'</span></div>';
}
function calcStats(sp){
  return {hp:sp.base.hp,dmg:sp.base.dmg,spd:sp.base.spd,regen:sp.base.regen};
}

// ---------- 伙伴选择 ----------
UI.renderPartners=function(cb){
  const grid=U.el('partner-list');
  grid.innerHTML='';
  const s=G.Save.data;
  const owned=Object.keys(s.collection).filter(id=>G.SPECIES[id]&&s.collection[id].n>0);
  for(const id of owned){
    const sp=G.SPECIES[id];
    const col=s.collection[id];
    const card=document.createElement('div');
    card.className='card'+(s.mon===id?' sel':'')+(col.sh>0?' shiny':'');
    const cv=document.createElement('canvas');cv.width=16;cv.height=16;
    const sheet=G.gfx.sheet(sp.sprite,s.mon===id&&s.shiny&&col.sh>0);
    if(sheet){const c2=cv.getContext('2d');G.gfx.fit(c2,sheet,cv.width||16,cv.height||16);}
    card.appendChild(cv);
    const nm=document.createElement('div');nm.className='nm';nm.textContent=sp.name;card.appendChild(nm);
    const ty=document.createElement('div');ty.className='ty';ty.textContent=sp.types.join('/');card.appendChild(ty);
    const rar=document.createElement('div');rar.className='rar';
    rar.style.color=G.RARITY_COLOR[sp.rarity];
    rar.textContent=G.RARITY_NAME[sp.rarity];
    card.appendChild(rar);
    if(col.sh>0){
      const lab=document.createElement('label');
      lab.style.cssText='cursor:pointer;font-size:10px;display:block;margin-top:2px';
      const cb2=document.createElement('input');
      cb2.type='checkbox';cb2.className='sh-toggle';cb2.checked=(s.mon===id&&s.shiny);
      lab.appendChild(cb2);lab.appendChild(document.createTextNode(' 闪光'));
      card.appendChild(lab);
    }
    card.onclick=(e)=>{
      if(e.target.classList.contains('sh-toggle')){
        s.mon=id;s.shiny=e.target.checked;G.Save.save();
        UI.renderPartners(cb);return;
      }
      s.mon=id;s.shiny=col.sh>0?s.shiny:false;G.Save.save();
      G.Audio.sfx('click');
      UI.renderPartners(cb);
    };
    grid.appendChild(card);
  }
  if(!owned.length)grid.innerHTML='<div style="color:var(--dim)">还没有精灵，先开始冒险吧</div>';
};

// ---------- 扭蛋 ----------
UI.renderGacha=function(){
  const s=G.Save.data;
  U.el('gacha-tickets').textContent='✦ '+s.tickets;
  U.el('gacha-x1').disabled=s.tickets<1;
  U.el('gacha-x10').disabled=s.tickets<9;
};
UI.gachaResult=function(res){
  const box=U.el('gacha-result');
  box.innerHTML='';
  if(!res)return;
  for(let i=0;i<res.length;i++){
    const r=res[i];
    const sp=G.SPECIES[r.id];
    const card=document.createElement('div');
    card.className='card'+(r.shiny?' shiny':'');
    card.style.animationDelay=(i*0.08)+'s';
    const cv=document.createElement('canvas');cv.width=16;cv.height=16;
    const sheet=G.gfx.sheet(sp.sprite,r.shiny);
    if(sheet){const c2=cv.getContext('2d');G.gfx.fit(c2,sheet,cv.width||16,cv.height||16);}
    card.appendChild(cv);
    const nm=document.createElement('div');nm.className='nm';nm.textContent=sp.name;card.appendChild(nm);
    const rar=document.createElement('div');rar.className='rar';
    rar.style.color=G.RARITY_COLOR[sp.rarity];
    rar.innerHTML=G.RARITY_NAME[sp.rarity]+(r.shiny?' ✦闪光':'')+(r.dup?'<br>重复 +'+r.gems+'◆':'<br>NEW!');
    card.appendChild(rar);
    box.appendChild(card);
  }
  UI.renderGacha();
};

// ---------- 永久强化 ----------
UI.renderUpgrades=function(){
  const box=U.el('upgrade-list');
  const s=G.Save.data;
  U.el('up-gem').textContent='◆ '+s.gems;
  box.innerHTML='';
  for(const m of G.META){
    const lv=s.meta[m.id]||0;
    const maxed=lv>=m.max;
    const cost=maxed?0:m.cost(lv);
    const row=document.createElement('div');
    row.className='up-row'+(maxed?' done':'');
    row.innerHTML='<div class="ic">'+m.icon+'</div><div><div class="nm">'+m.n+'</div>'+
      '<div class="ds">'+m.d+'</div><div class="pips">'+
      Array.from({length:m.max},(_,i)=>'<i class="'+(i<lv?'on':'')+'"></i>').join('')+
      '</div></div>';
    const btn=document.createElement('button');
    btn.className='btn small'+(maxed?'':' primary');
    btn.textContent=maxed?'已满级':'◆'+cost;
    btn.disabled=maxed||s.gems<cost;
    btn.onclick=()=>{
      if(s.gems<cost)return;
      s.gems-=cost;s.meta[m.id]=lv+1;
      G.Save.save();G.Audio.sfx('levelup');
      UI.renderUpgrades();
    };
    row.appendChild(btn);
    box.appendChild(row);
  }
};

// ---------- 任务 ----------
UI.renderMissions=function(){
  const s=G.Save.data;
  const box=U.el('mission-list');
  box.innerHTML='';
  for(const id of (s.missions.pool||[])){
    const md=G.MissionDef(id);
    if(!md)continue;
    const cur=s.missions.list[id]||0;
    const done=cur>=md.goal;
    const claimed=s.missions.claimed&&s.missions.claimed[id];
    const row=document.createElement('div');
    row.className='up-row'+(claimed?' done':'');
    row.innerHTML='<div class="ic">📋</div><div><div class="nm">'+md.n+'</div>'+
      '<div class="mission-prog">'+cur+' / '+md.goal+
      (md.r.gems?' · ◆'+md.r.gems:'')+(md.r.tickets?' · ✦'+md.r.tickets:'')+(md.r.coins?' · ●'+md.r.coins:'')+'</div></div>';
    const btn=document.createElement('button');
    btn.className='btn small primary';
    btn.textContent=claimed?'已领取':(done?'领取':'进行中');
    btn.disabled=!done||claimed;
    btn.onclick=()=>{
      if(!done||claimed)return;
      s.missions.claimed=s.missions.claimed||{};
      s.missions.claimed[id]=1;
      if(md.r.gems)s.gems+=md.r.gems;
      if(md.r.tickets)s.tickets+=md.r.tickets;
      if(md.r.coins)s.coins+=md.r.coins;
      G.Save.save();G.Audio.sfx('coin');
      UI.toast('任务奖励已领取','good');
      UI.renderMissions();
    };
    row.appendChild(btn);
    box.appendChild(row);
  }
  // 成就
  const ab=U.el('achieve-list');
  ab.innerHTML='';
  for(const a of G.Save.ACH){
    const got=s.achievements[a.id];
    const row=document.createElement('div');
    row.className='up-row'+(got?' done':'');
    row.innerHTML='<div class="ic">'+(got?'🏅':'🔒')+'</div><div><div class="nm">'+a.n+'</div>'+
      '<div class="ds">'+a.d+'</div></div>'+
      '<div class="claimed">'+(got?'已达成':(a.r.gems?'◆'+a.r.gems:''))+'</div>';
    ab.appendChild(row);
  }
};
G.MissionDef=id=>G.Save.missionDef(id);

// ---------- 排行 ----------
let rankScope='today';
UI.renderRank=function(){
  const tabs=U.el('rank-tabs');
  tabs.innerHTML='';
  const list=U.el('rank-list');
  list.innerHTML='<div style="color:var(--dim);text-align:center;padding:20px">加载中...</div>';
  const scopes=[{id:'today',n:'今日'},{id:'all',n:'历史'}];
  for(const sc of scopes){
    const c=document.createElement('span');
    c.className='chip'+(rankScope===sc.id?' on':'');
    c.textContent=sc.n;
    c.onclick=()=>{rankScope=sc.id;UI.renderRank();};
    tabs.appendChild(c);
  }
  // 本地成绩
  const s=G.Save.data;
  const me={nick:s.nick||'我',mon:G.SPECIES[s.mon]?G.SPECIES[s.mon].name:'',ms:s.stats.bestMs||0,me:true};
  G.Save.api('/api/rank?scope='+rankScope).then(res=>{
    const rows=(res&&res.rows)||[];
    rows.push(me);
    rows.sort((a,b)=>b.ms-a.ms);
    list.innerHTML='';
    rows.slice(0,20).forEach((r,i)=>{
      const d=document.createElement('div');
      d.className='rank-row'+(r.me?' me':'');
      d.innerHTML='<div class="rk">'+(i+1)+'</div><div>'+U.esc(r.nick||'幸存者')+'</div>'+
        '<div class="mn">'+U.esc(r.mon||'')+'</div><div>'+U.fmtTime(r.ms)+'</div>';
      list.appendChild(d);
    });
    if(!rows.length)list.innerHTML='<div style="color:var(--dim);text-align:center">暂无记录</div>';
  }).catch(()=>{
    list.innerHTML='';
    const d=document.createElement('div');
    d.className='rank-row me';
    d.innerHTML='<div class="rk">-</div><div>'+U.esc(me.nick)+'</div><div class="mn">'+me.mon+'</div><div>'+U.fmtTime(me.ms)+'</div>';
    list.appendChild(d);
    const tip=document.createElement('div');
    tip.style.cssText='color:var(--dim);text-align:center;padding:10px;font-size:12px';
    tip.textContent='离线模式，仅显示本地最佳成绩';
    list.appendChild(tip);
  });
};

// ---------- 设置 ----------
UI.bindSettings=function(){
  const s=G.Save.data.settings;
  const vol=U.el('set-volume'),mus=U.el('set-music'),dn=U.el('set-dmgnum'),
    sh=U.el('set-shake'),q=U.el('set-quality'),nick=U.el('set-nick');
  vol.value=s.vol;mus.checked=s.music;dn.checked=s.dmgnum;sh.checked=s.shake;q.value=s.quality;
  nick.value=G.Save.data.nick||'';
  vol.oninput=()=>{s.vol=+vol.value;G.Audio.setVolume(s.vol/100);G.Save.save();};
  mus.onchange=()=>{s.music=mus.checked;G.Audio.setMusic(mus.checked);G.Save.save();};
  dn.onchange=()=>{s.dmgnum=dn.checked;G.Save.save();};
  sh.onchange=()=>{s.shake=sh.checked;G.Save.save();};
  q.onchange=()=>{s.quality=q.value;G.Save.save();};
  nick.onchange=()=>{G.Save.data.nick=nick.value.trim().slice(0,12)||'幸存者';G.Save.save();};
  U.el('set-cloud').onclick=async()=>{
    UI.toast('正在同步云存档...');
    const ok=await G.Save.sync();
    UI.toast(ok?'云存档同步成功':'同步失败：'+G.Save.cloudMsg,ok?'good':'bad');
  };
  U.el('set-export').onclick=()=>{
    const ta=U.el('set-io');ta.classList.remove('hidden');
    ta.value=G.Save.export();ta.select();
    UI.toast('已生成存档文本，可复制保存');
  };
  U.el('set-import').onclick=()=>{
    const f=U.el('import-file');f.click();
  };
  U.el('set-reset').onclick=()=>{
    if(confirm('确定要清空所有存档吗？此操作不可恢复。')){
      G.Save.reset();UI.toast('存档已重置');UI.show('title');
    }
  };
  U.el('import-file').onchange=(e)=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=()=>{if(G.Save.import(r.result)){UI.toast('存档导入成功','good');UI.show('menu');G.Menu.refresh();}else UI.toast('存档格式错误','bad');};
    r.readAsText(f);e.target.value='';
  };
};

// 全局按钮代理
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');
  if(!b)return;
  G.Audio.init();G.Audio.resume();
  const act=b.getAttribute('data-act');
  G.Menu.action(act);
});
})();

(function(){
'use strict';
const G=window.G,U=G.U;
const H=G.HUD={dirty:true,faceDrawn:''};

H.show=function(on){
  U.el('hud').classList.toggle('hidden',!on);
  if(on&&G.Input.isTouch)U.el('touch-ui').classList.remove('hidden');
  else U.el('touch-ui').classList.add('hidden');
};

H.refreshMon=function(){
  const gs=G.game,p=gs&&gs.player;
  if(!p)return;
  U.el('hud-mon-name').textContent=p.name+(p.shiny?' ✦':'');
  const cv=U.el('hud-face');
  const sheet=G.gfx.sheet(p.sprite,p.shiny);
  if(sheet){
    const c=cv.getContext('2d');
    c.clearRect(0,0,32,32);c.imageSmoothingEnabled=false;
    G.gfx.fit(c,sheet,32,32);
  }
  H.refreshMoves();H.refreshItems();
};

H.refreshMoves=function(){
  const gs=G.game,p=gs&&gs.player;
  const box=U.el('hud-moves');
  if(!p){box.innerHTML='';return;}
  box.innerHTML='';
  p.moves.forEach((m,i)=>{
    const d=document.createElement('div');
    d.className='move-slot'+(p.active===i?' on':'');
    d.innerHTML='<div class="mi">'+(m.evo?m.evo.icon||m.def.icon:m.def.icon)+'</div>'+
      '<div class="ml">'+(m.evo?m.evo.name:m.def.name)+(m.evo?'':' Lv'+m.lv)+'</div><div class="cd"></div>';
    d.onclick=()=>{p.active=i;H.refreshMoves();};
    box.appendChild(d);
  });
};

H.refreshItems=function(){
  const gs=G.game,p=gs&&gs.player;
  const box=U.el('hud-items');
  if(!p){box.innerHTML='';return;}
  box.innerHTML='';
  for(const id in p.items){
    const it=G.item(id);
    if(!it)continue;
    const d=document.createElement('div');
    d.className='item-chip';
    d.textContent=it.icon+' '+it.name+' '+p.items[id];
    box.appendChild(d);
  }
};

H.update=function(){
  const gs=G.game,p=gs.player;
  if(!p)return;
  // HP
  const hpPct=U.clamp(p.hp/p.hpMax*100,0,100);
  U.el('hud-hp-fill').style.width=hpPct+'%';
  U.el('hud-hp-text').textContent=Math.ceil(p.hp)+'/'+p.hpMax;
  // XP
  U.el('hud-xp-fill').style.width=U.clamp(p.xp/p.xpNext*100,0,100)+'%';
  U.el('hud-lv').textContent=p.lv;
  // 时间 / 波次
  U.el('hud-time').textContent=U.fmtTime(gs.run.time);
  U.el('hud-wave').textContent='第 '+gs.run.wave+' 波';
  // 天气
  const wbox=U.el('hud-weather');
  if(gs.weather){
    wbox.classList.remove('hidden');
    wbox.textContent=gs.weather.icon+' '+gs.weather.n+' · '+gs.weather.desc;
  }else wbox.classList.add('hidden');
  // 击杀/金币
  U.el('hud-kills').textContent='☠ '+gs.run.kills;
  U.el('hud-gold').textContent='● '+gs.save.coins;
  // Boss
  const bb=U.el('hud-boss');
  if(G.Boss.active&&!G.Boss.active.dead){
    bb.classList.remove('hidden');
    U.el('hud-boss-name').textContent=G.Boss.active.name;
    U.el('hud-boss-fill').style.width=U.clamp(G.Boss.active.hp/G.Boss.active.hpMax*100,0,100)+'%';
  }else bb.classList.add('hidden');
  // 冲刺
  const dp=p.dashCd>0?1-p.dashCd/(p.dashCdMax*p.dashCdMul):1;
  U.el('hud-dash-fill').style.width=(dp*100)+'%';
  // 冷却显示
  const slots=U.el('hud-moves').children;
  p.moves.forEach((m,i)=>{
    const el=slots[i];if(!el)return;
    const cdEl=el.querySelector('.cd');
    const alwaysOn=m.def.kind==='orbit'||m.def.kind==='aura';
    if(m.cd>0&&!alwaysOn){
      const lv=m.evo||m.def.lv[m.lv-1];
      const max=(lv&&(lv.cd||lv.tick))||800;
      el.classList.add('cooling');
      cdEl.textContent=(m.cd/1000).toFixed(1);
      cdEl.style.background='rgba(5,8,20,'+(0.72*U.clamp(m.cd/max,0,1))+')';
    }else el.classList.remove('cooling');
  });
};
})();

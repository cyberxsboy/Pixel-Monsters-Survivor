(function(){
'use strict';
const G=window.G,U=G.U;
const B=G.Boss={active:null,nextIn:120,t:0};

const BOSSES=[
  {id:'b_stone',name:'巨岩魔像',sprite:'e_golem',types:['岩'],hp:900,r:18,spd:38,dmg:22,
   patterns:['radial','stomp','summon'],color:'#c8a860'},
  {id:'b_flame',name:'炎狱魔王',sprite:'e_imp',types:['火'],hp:1100,r:17,spd:52,dmg:24,
   patterns:['radial','charge','lines'],color:'#ff5d2d'},
  {id:'b_ghost',name:'幽冥鬼帝',sprite:'e_ghost',types:['幽'],hp:1300,r:17,spd:48,dmg:26,
   patterns:['radial','homing','summon'],color:'#8f7ad6'},
  {id:'b_eye',name:'深渊之眼',sprite:'e_eye',types:['恶'],hp:1600,r:18,spd:42,dmg:28,
   patterns:['lines','radial','homing'],color:'#ff3d5a'},
];
const LEGENDS=[
  {id:'l_sun',name:'烈阳神鸟',sprite:'spark2',types:['火','飞'],hp:1500,r:16,spd:70,dmg:26,
   patterns:['radial','lines','charge'],color:'#ffb454'},
  {id:'l_tide',name:'沧海神龟',sprite:'ripple3',types:['水','冰'],hp:2000,r:20,spd:34,dmg:28,
   patterns:['radial','stomp','summon'],color:'#4aa8ff'},
  {id:'l_forest',name:'森罗神鹿',sprite:'sprout3',types:['草'],hp:1800,r:18,spd:56,dmg:26,
   patterns:['radial','homing','lines'],color:'#6ec95c'},
  {id:'l_dragon',name:'苍穹古龙',sprite:'dragon2',types:['龙'],hp:2600,r:20,spd:60,dmg:32,
   patterns:['radial','charge','lines','summon'],color:'#7a6cff'},
];

B.reset=function(){B.active=null;B.nextIn=120;B.t=0;};

B.update=function(dt){
  const gs=G.game;
  if(gs.run.bossMode&&B.active){
    updateFight(dt);
    return;
  }
  if(gs.run.bossMode)return;
  const timeSec=gs.run.time/1000;
  // 每 120 秒一头目
  const idx=Math.floor(timeSec/120);
  if(idx>=1&&!gs.run.bossKills[idx-1]){
    gs.run.bossKills[idx-1]=true;
    spawnBoss(idx-1,false);
  }
};

function spawnBoss(i,isLegend){
  const gs=G.game,pl=gs.player;
  const list=isLegend?LEGENDS:BOSSES;
  const def=list[i%list.length];
  const timeSec=gs.run.time/1000;
  const scale=1+timeSec/300*0.8;
  const a=Math.random()*U.TAU,r=150;
  const x=pl.x+Math.cos(a)*r,y=pl.y+Math.sin(a)*r;
  const e=G.Enemies.spawn(def.id,x,y,{boss:true,hp:def.hp*scale,r:def.r,spd:1,xp:Math.round(60*scale)});
  if(!e)return;
  // 覆盖为 boss 定义
  e.name=def.name;e.sprite=def.sprite;e.tint=def.color;e.def={tier:3};
  e.boss=true;e.dmg=def.dmg*(1+timeSec/600);
  e.spd=def.spd;
  e.patterns=def.patterns.slice();
  e.patT=1.6;e.patI=0;e.phase=1;
  e.types=def.types;
  B.active=e;
  gs.run.bossMode=true;
  gs.run.bossName=def.name;
  if(!isLegend){
    G.UI.banner('头目来袭 · '+def.name);
  }
  G.Audio.sfx('boss');
  G.Audio.playSong(isLegend?'legend':'boss');
  e.teleT=0;e.radialN=12;
};

B.enterLegendary=function(rift){
  const gs=G.game;
  gs.run.arena={x:rift.x,y:rift.y,r:230,prev:gs.player.x,py:gs.player.y};
  gs.player.x=rift.x;gs.player.y=rift.y;
  // 清场
  for(const o of G.Enemies.L)o.dead=true;
  G.Pickups.reset();
  spawnBoss((gs.run.legendsDone||0)%LEGENDS.length,true);
  gs.run.legendsDone=(gs.run.legendsDone||0)+1;
  G.UI.banner('传说之战！');
  G.Audio.sfx('legendary');
};

function updateFight(dt){
  const gs=G.game,e=B.active,pl=gs.player;
  if(!e||e.dead){endFight(false);return;}
  B.t+=dt;
  e.patT-=dt;
  if(e.hp<e.hpMax*0.5&&e.phase===1){e.phase=2;e.radialN=18;G.UI.toast(e.name+' 进入狂暴状态！','bad');}
  if(e.patT<=0){
    const pat=e.patterns[(e.patI++)%e.patterns.length];
    doPattern(e,pat);
    e.patT=(e.phase===2?1.3:2.0)*(0.9+Math.random()*0.3);
  }
  // Arena 边界
  if(gs.run.arena){
    const a=gs.run.arena;
    const dx=pl.x-a.x,dy=pl.y-a.y,d=Math.hypot(dx,dy);
    if(d>a.r){
      pl.x=a.x+dx/d*a.r;pl.y=a.y+dy/d*a.r;
    }
  }
};

function doPattern(e,pat){
  const gs=G.game,pl=gs.player;
  const n=e.radialN||12;
  if(pat==='radial'){
    const base=Math.random()*U.TAU;
    for(let i=0;i<n;i++){
      const a=base+i/n*U.TAU;
      G.Projectiles.spawn({x:e.x,y:e.y-10,vx:Math.cos(a)*150,vy:Math.sin(a)*150,
        dmg:e.dmg*0.7,team:'enemy',size:5,color:e.tint||'#ff5d6c',life:3.2});
    }
    G.Audio.sfx('shoot');
  }else if(pat==='lines'){
    const base=U.ang(e.x,e.y,pl.x,pl.y);
    for(let i=-2;i<=2;i++){
      const a=base+i*0.22;
      // 预警后发射
      const tx=pl.x+Math.cos(a)*200,ty=pl.y+Math.sin(a)*200;
      G.FX.mark(e.x+Math.cos(a)*40,e.y+Math.sin(a)*40,22,0.55,0.1,'rgba(255,60,60,.4)',()=>{
        if(e.dead)return;
        for(let k=0;k<8;k++){
          G.Projectiles.spawn({x:e.x,y:e.y-10,vx:Math.cos(a)*(180+k*10),vy:Math.sin(a)*(180+k*10),
            dmg:e.dmg*0.6,team:'enemy',size:5,color:e.tint||'#ff5d6c',life:2.4});
        }
        G.Audio.sfx('shoot');
      });
    }
  }else if(pat==='charge'){
    const a=U.ang(e.x,e.y,pl.x,pl.y);
    G.FX.mark(e.x+Math.cos(a)*70,e.y+Math.sin(a)*70,26,0.6,0.1,'rgba(255,160,60,.4)',()=>{
      if(e.dead)return;
      e.charging=true;e.chargeT=0.6;e.chgX=Math.cos(a);e.chgY=Math.sin(a);e.chargeSpeed=340;
      setTimeout(()=>{if(e)e.charging=false;},600);
    });
  }else if(pat==='stomp'){
    G.FX.mark(e.x,e.y,80,0.8,0.1,'rgba(255,80,80,.4)',()=>{
      if(e.dead)return;
      G.FX.ring(e.x,e.y,80,'#ffd257',0.5,5);
      if(U.dist(e.x,e.y,pl.x,pl.y)<80)G.Player.hurt(pl,e.dmg*1.2,e);
      G.Audio.sfx('boss');
      // 冲击波
      for(let i=0;i<10;i++){
        const a=i/10*U.TAU;
        G.Projectiles.spawn({x:e.x,y:e.y-6,vx:Math.cos(a)*120,vy:Math.sin(a)*120,
          dmg:e.dmg*0.5,team:'enemy',size:4,color:'#ffd257',life:2.2});
      }
    });
  }else if(pat==='summon'){
    for(let i=0;i<3;i++){
      const a=Math.random()*U.TAU;
      const s=G.Enemies.spawn(gs.rng.pick(['slime2','bat2','ghost']),e.x+Math.cos(a)*60,e.y+Math.sin(a)*60,{hpMul:0.5});
      if(s)s.summonedBy=e;
    }
    G.FX.ring(e.x,e.y,40,'#a86cff',0.4,3);
    G.Audio.sfx('teleport');
  }else if(pat==='homing'){
    for(let i=0;i<3;i++){
      const a=Math.random()*U.TAU;
      G.Projectiles.spawn({x:e.x,y:e.y-10,vx:Math.cos(a)*120,vy:Math.sin(a)*120,
        dmg:e.dmg*0.7,team:'enemy',size:5,color:e.tint||'#8f7ad6',life:4,homing:3.2});
    }
    G.Audio.sfx('shoot2');
  }
  if(e.charging){
    // Boss 冲锋在下方 bossDrawPatch 中手动处理
  }
}

function endFight(killed){
  const gs=G.game,e=B.active;
  B.active=null;
  gs.run.bossMode=false;
  gs.run.bossName='';
  gs.run.bossKillsDone=(gs.run.bossKillsDone||0)+1;
  G.Save.track('boss',1);
  if(killed&&e){
    G.UI.banner('头目讨伐成功！');
    G.Audio.sfx('win');
    G.FX.ring(e.x,e.y,80,'#ffd257',0.8,5);
    G.FX.burst(e.x,e.y,'#ffd257',40,260);
    // 奖励
    const s=gs.save;
    const gold=200+gs.run.wave*20;
    s.coins+=gold;gs.run.gold+=gold;
    s.gems+=5+((Math.random()*6)|0);
    s.tickets+=1;
    G.Save.track('gold',gold);
    for(let i=0;i<12;i++)G.Pickups.xp(e.x+(Math.random()*60-30),e.y+(Math.random()*60-30),10);
    G.Pickups.ticket(e.x,e.y);
    if(String(e.id).indexOf('l_')===0)G.Save.track('legend',1);
    // 武器进化道具掉落
    const needIds=Object.keys(G.ITEMS).filter(id=>G.ITEMS[id].maxLv===1);
    const have=Object.keys(gs.player.items);
    const cand=needIds.filter(id=>have.indexOf(id)<0);
    if(cand.length)G.Pickups.item(e.x,e.y,gs.rng.pick(cand));
    G.LevelUp.openBless();
    G.Save.save();
  }
  G.Audio.playSong('field');
}
// 由 enemy kill 调用
const origKill=G.Enemies.kill;
G.Enemies.kill=function(e,by){
  const wasBoss=e.boss;
  origKill(e,by);
  if(wasBoss&&B.active===e){
    if(e.id&&String(e.id).indexOf('l_')===0){
      G.UI.banner('传说精灵讨伐成功！');
      gs.winLegend();
    }
    endFight(true);
  }
};
function gs(){return G.game;}

// Boss 血条 & 充锋
(function bossDrawPatch(){
  const origUpdate=G.Enemies.update;
  G.Enemies.update=function(dt){
    origUpdate(dt);
    const e=B.active;
    if(e&&!e.dead&&e.charging){
      const a=Math.atan2(e.chgY,e.chgX);
      G.World.collide(e,Math.cos(a)*e.chargeSpeed*dt,Math.sin(a)*e.chargeSpeed*dt);
      e.chargeT-=dt;
      if(e.chargeT<=0)e.charging=false;
    }
  };
})();
})();

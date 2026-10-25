(function(){
'use strict';
const G=window.G,U=G.U;
const Pl=G.Player={};

G.Player.reset=function(monId,shiny){
  const gs=G.game,s=gs.save;
  const sp=G.mon(monId)||G.mon('flame1');
  const meta=s.meta||{};
  const p={
    x:0,y:0,r:7,vx:0,vy:0,
    monId:monId,shiny:!!shiny,sp:sp,
    name:sp.name,sprite:sp.sprite,types:sp.types,
    lv:1,xp:0,xpNext:8,xpTotal:0,
    hpMax:Math.round(sp.base.hp*(1+(meta.hp||0)*0.04)),
    hp:0,
    baseDmg:sp.base.dmg,baseSpd:sp.base.spd,baseRegen:sp.base.regen,
    dmgMul:1,spdMul:1,cdMul:1,pickMul:1,dmgTaken:1,
    regen:sp.base.regen+(meta.regen||0)*0.25,
    crit:0.05+(meta.crit||0)*0.015,
    pickR:52*(1+(meta.pick||0)*0.08),
    goldMul:1,xpMul:1,lifesteal:0,thorn:0,
    dashCd:0,dashCdMax:1.4,dashCdMul:1,dashT:0,dashVX:0,dashVY:0,
    inv:0,aim:0,hurtFlash:0,t:0,dead:false,
    moves:[],items:{},active:0,
    evolutions:0,evoT:0
  };
  p.hp=p.hpMax;
  // 出生点可能落在水/熔岩/障碍物内 → 环形搜索可站立点
  const spn=G.World.findSpawn(0,0,p.r*0.72);
  p.x=spn.x;p.y=spn.y;
  // 初始技能
  const start=sp.learn.find(l=>l.lv<=1)||sp.learn[0];
  if(start)Pl.addMove(p,start.m);
  // 开局等级
  const startLv=1+(meta.start||0);
  for(let i=1;i<startLv;i++)Pl.gainXp(p,p.xpNext*0.99);
  return p;
};

G.Player.addMove=function(p,moveId){
  if(p.moves.length>=4)return false;
  if(p.moves.find(m=>m.id===moveId))return false;
  const md=G.move(moveId);if(!md)return false;
  p.moves.push({id:moveId,def:md,lv:1,cd:0,ang:0,evolved:false,evo:null});
  return true;
};
G.Player.addItem=function(p,itemId){
  const it=G.item(itemId);if(!it)return;
  const cur=p.items[itemId]||0;
  if(cur>=it.maxLv)return false;
  p.items[itemId]=cur+1;
  it.apply(p,1);
  return true;
};
G.Player.itemsLevel=function(p,id){return p.items[id]||0;};

G.Player.gainXp=function(p,amt){
  p.xp+=amt;p.xpTotal+=amt;
  let ups=0;
  while(p.xp>=p.xpNext){
    p.xp-=p.xpNext;p.lv++;
    p.xpNext=Math.round(8+p.lv*4.5+p.lv*p.lv*0.55);
    ups++;
  }
  if(ups>0){
    G.Audio.sfx('levelup');
    G.HUD.dirty=true;
    G.LevelUp.enqueue(ups);
  }
};

G.Player.update=function(dt){
  const gs=G.game,p=gs.player;
  if(p.dead)return;
  p.t+=dt;
  if(p.inv>0)p.inv-=dt;
  if(p.hurtFlash>0)p.hurtFlash-=dt*3;
  if(p.dashT>0){
    p.dashT-=dt;
    G.World.collide(p,p.dashVX*dt,p.dashVY*dt);
    // 冲刺留残影
    if(Math.random()<0.6)G.FX.trail(p.x,p.y-6,p.shiny?'#9ef':'#fff');
  }else{
    const mv=G.Input.update();
    const spd=126*p.baseSpd*p.spdMul*G.World.speedAt(p.x,p.y)*(gs.weather&&gs.weather.id==='snow'?0.92:1);
    p.vx=mv.x*spd;p.vy=mv.y*spd;
    G.World.collide(p,p.vx*dt,p.vy*dt);
    if(mv.x||mv.y)p.aim=Math.atan2(mv.y,mv.x);
  }
  G.World.unstick(p);

  // 冲刺
  if(p.dashCd>0)p.dashCd-=dt;
  if(G.Input.consumeDash()&&p.dashCd<=0&&p.dashT<=0){
    const mv=G.Input.move;
    let dx=mv.x,dy=mv.y;
    if(!dx&&!dy){dx=Math.cos(p.aim);dy=Math.sin(p.aim);}
    const d=Math.hypot(dx,dy)||1;
    p.dashVX=dx/d*430;p.dashVY=dy/d*430;
    p.dashT=0.18;p.dashCd=p.dashCdMax*p.dashCdMul;
    p.inv=Math.max(p.inv,0.28);
    G.Audio.sfx('dash');
    G.FX.ring(p.x,p.y,18,'#fff',0.25,2);
    G.Save.track('dash',1);
  }

  // 环境伤害（熔岩）
  if(G.World.hazardAt(p.x,p.y)){
    Pl.hurt(p,14*dt*(p.dmgTaken),null,true);
  }

  // 回复
  if(p.regen>0&&p.hp<p.hpMax){
    p.hp=Math.min(p.hpMax,p.hp+p.regen*dt);
  }

  // 技能
  const slotSel=G.Input.consumeSlot();
  if(slotSel>=0&&slotSel<p.moves.length)p.active=slotSel;
  const cyc=G.Input.consumeCycle();
  if(cyc&&p.moves.length)p.active=(p.active+cyc+p.moves.length)%p.moves.length;

  for(const m of p.moves){
    if(m.cd>0)m.cd-=dt*1000;
    const lv=m.evo?m.evo:m.def.lv[m.lv-1];
    if(!lv)continue;
    const isOrbit=m.def.kind==='orbit';
    const isAura=m.def.kind==='aura';
    const isBeam=m.def.kind==='beam';
    const isShield=m.def.kind==='shield';
    if(isOrbit||isAura||isShield){
      // 持续型：进入即激活
      if(!m.activeOn){m.activeOn=true;m.cd=0;}
    }
    if(m.cd<=0&&(isOrbit||isAura||isShield||true)){
      if(isOrbit){castOrbit(p,m,lv);m.cd=lv.rot?100:(lv.cd||100);}
      else if(isAura){m.auraOn=true;m.cd=(lv.tick||300);}
      else if(isShield){castShield(p,m,lv);m.cd=lv.cd||1000;}
      else if(isBeam){
        if(p.moves[p.active]===m){
          castBeam(p,m,lv);m.cd=lv.tick||120;
        }
      }else{
        if(p.moves[p.active]===m)castAttack(p,m,lv);
      }
    }
    // 光束需要跟随 active 判断
  }
  // 光束激活状态
  for(const m of p.moves){
    if(m.def.kind==='beam'){
      m.beamActive=(p.moves[p.active]===m);
    }
    if(m.auraOn){
      m.auraT=(m.auraT||0)+dt*1000;
      const lv=m.evo||m.def.lv[m.lv-1];
      if(m.auraT>=(lv.tick||300)){
        m.auraT=0;
        G.Combat.auraTick(p,m,lv);
      }
    }
  }

  // 进化检测
  const evo=p.sp.evo;
  if(evo&&p.lv>=evo.lv&&p.monId===p.sp.id){
    const into=G.mon(evo.into);
    if(into){
      p.monId=into.id;p.sp=into;p.name=into.name;p.sprite=into.sprite;p.types=into.types;
      p.baseDmg=into.base.dmg;p.baseSpd=into.base.spd;
      p.hpMax=Math.round(p.hpMax*1.35);p.hp=p.hpMax;
      p.regen+=0.3;p.evoT=1.2;p.evolutions++;
      G.Save.track('evo',1);
      G.UI.banner(into.name+' 进化！');
      G.Audio.sfx('evolve');
      G.FX.ring(p.x,p.y,60,'#fff',0.8,5);
      G.FX.burst(p.x,p.y,'#fff',30,220);
      const fl=U.el('evolve-flash');fl.classList.remove('hidden');
      setTimeout(()=>fl.classList.add('hidden'),900);
      // 学习新技能
      for(const l of into.learn){
        if(l.lv<=p.lv&&l.lv>1){
          if(!p.moves.find(m=>m.id===l.m)){
            if(p.moves.length<4)Pl.addMove(p,l.m);
          }
        }
      }
      G.HUD.refreshMon();
      G.Save.save();
    }
  }
  if(p.evoT>0)p.evoT-=dt;
};

function castAttack(p,m,lv){
  const gs=G.game;
  m.cd=(lv.cd||800)*p.cdMul;
  const dmg=Math.round((lv.dmg||10)*p.baseDmg*p.dmgMul);
  const n=lv.n||1;
  const base=p.aim;
  const kind=m.def.kind;
  const col=typeColor(m.def.type);
  if(kind==='bullet'||kind==='homing'){
    for(let i=0;i<n;i++){
      const spread=n>1?(i-(n-1)/2)*0.13:0;
      const a=base+spread;
      G.Projectiles.spawn({x:p.x,y:p.y-6,vx:Math.cos(a)*(lv.spd||220),vy:Math.sin(a)*(lv.spd||220),
        dmg:dmg,size:lv.size||5,type:m.def.type,color:col,pierce:lv.pierce||0,
        blast:lv.blast||0,knock:lv.knock||0,stun:lv.stun||0,
        slow:lv.slow||0,slowT:lv.slowT||0,steal:lv.steal||0,
        homing:(lv.turn||0)*2.2});
    }
    G.Audio.sfx(m.def.type==='火'?'fire':(m.def.type==='冰'?'ice':'shoot'));
  }else if(kind==='spread'){
    const arc=lv.arc||0.5;
    for(let i=0;i<n;i++){
      const a=base+(n>1?(i/(n-1)-0.5)*arc*2:0);
      G.Projectiles.spawn({x:p.x,y:p.y-6,vx:Math.cos(a)*(lv.spd||260),vy:Math.sin(a)*(lv.spd||260),
        dmg:dmg,size:lv.size||4,type:m.def.type,color:col,pierce:lv.pierce||0});
    }
    G.Audio.sfx('shoot2');
  }else if(kind==='chain'){
    // 直线弹，命中后连锁
    const a=base;
    G.Projectiles.spawn({x:p.x,y:p.y-6,vx:Math.cos(a)*(lv.spd||240),vy:Math.sin(a)*(lv.spd||240),
      dmg:dmg,size:lv.size||4,type:m.def.type,color:col,
      onHit:function(e){
        G.Combat.chain(e,dmg*(m.evo?1.1:0.85),m.def.type,(lv.jump||2)+(m.evo?m.evo.jumpAdd||0:0),(lv.jrange||100));
      }});
    G.Audio.sfx('shoot2');
  }else if(kind==='boomerang'){
    for(let i=0;i<n;i++){
      const a=base+(n>1?(i-(n-1)/2)*0.4:0);
      const r=(lv.r||110)+(m.evo?(m.evo.rAdd||0):0);
      G.Projectiles.spawn({x:p.x,y:p.y-6,vx:0,vy:0,dmg:dmg,size:lv.size||6,type:m.def.type,color:col,
        life:1.4,boom:{r:r,dir:1,dist:0,speed:420}});
    }
    G.Audio.sfx('shoot');
  }else if(kind==='pulse'){
    const r=(lv.r||80)+(m.evo?(m.evo.rAdd||0):0);
    G.FX.ring(p.x,p.y,r,col,0.4,5);
    for(const e of gs.enemies){
      if(e.dead)continue;
      const d=U.dist(p.x,p.y,e.x,e.y);
      if(d<r+e.r){
        G.Combat.hurtEnemy(e,dmg,m.def.type);
        if(lv.stun)e.stun=Math.max(e.stun,lv.stun/1000);
      }
    }
    G.Audio.sfx('fire');
  }
}
function castOrbit(p,m,lv){
  if(!m.orbs){m.orbs=[];m.ang=Math.random()*U.TAU;}
  const n=(lv.n||2)+(m.evo?(m.evo.nAdd||0):0);
  const r=(lv.r||44)+(m.evo?(m.evo.rAdd||0):0);
  const rot=(lv.rot||2.4);
  const spawnOrb=()=>G.Projectiles.spawn({x:p.x,y:p.y,team:'player',dmg:lv.dmg||10,size:lv.size||6,
    type:m.def.type,color:typeColor(m.def.type),life:9999,pierce:Infinity,
    orbit:{r:r,ang:0,spd:rot,cx:p.x,cy:p.y}});
  // 重建轨道弹（伤害实时更新）
  while(m.orbs.length>n){const idx=m.orbs.pop();if(idx.p)idx.p.dead=true;}
  while(m.orbs.length<n){const pr=spawnOrb();m.orbs.push({p:pr,uid:pr.uid});}
  const dmg=Math.round((lv.dmg||10)*p.baseDmg*p.dmgMul);
  for(const o of m.orbs){
    // 弹体可能已被对象池回收复用（换局/异常），校验 uid，失效则重新生成
    if(!o.p||!o.p.orbit||o.p.uid!==o.uid||G.Projectiles.indexOf(o.p)<0){
      o.p=spawnOrb();o.uid=o.p.uid;
    }
    o.p.dmg=dmg;o.p.size=lv.size||6;o.p.r=o.p.size;
    o.p.orbit.r=r;o.p.orbit.spd=rot;
  }
}
function castShield(p,m,lv){
  const gs=G.game;
  const r=(lv.r||26)+(m.evo?(m.evo.rAdd||0):0);
  const hp=Math.round((lv.hp||20)*(m.evo?(m.evo.hpMul||1):1));
  p.shield={hp:hp,max:hp,r:r,dmg:Math.round((lv.dmg||10)*p.baseDmg*p.dmgMul),type:m.def.type,t:0};
  G.FX.ring(p.x,p.y,r+8,'#7ad8ff',0.4,3);
  G.Audio.sfx('pickup');
}
function castBeam(p,m,lv){
  const len=(lv.len||120)+(m.evo?(m.evo.lenAdd||0):0);
  const w=(lv.w||16)+(m.evo?(m.evo.wAdd||0):0);
  G.Projectiles.spawn({x:p.x,y:p.y,dmg:Math.round((lv.dmg||7)*p.baseDmg*p.dmgMul),
    type:m.def.type,color:typeColor(m.def.type),life:0.16,
    beam:{len:len,w:w,tick:lv.tick||110,t:0}});
  G.Audio.sfx(m.def.type==='龙'?'fire':'shoot2');
}

function typeColor(t){return G.Types.COLOR[t]||'#fff';}

G.Player.hurt=function(p,raw,src,ignoreInv){
  if(p.dead)return;
  if(!ignoreInv&&p.inv>0)return;
  const gs=G.game;
  let dmg=raw*(p.dmgTaken||1);
  // 护盾
  if(p.shield&&p.shield.hp>0){
    const a=Math.min(p.shield.hp,dmg);
    p.shield.hp-=a;dmg-=a;
    G.FX.num(p.x,p.y-34,'格挡','#7ad8ff',12);
    G.FX.spark(p.x,p.y,'#7ad8ff',6,80);
    if(p.shield.hp<=0){G.FX.ring(p.x,p.y,p.shield.r+10,'#7ad8ff',0.3,3);p.shield=null;}
  }
  if(dmg<=0){if(!ignoreInv)p.inv=0.3;return;}
  p.hp-=dmg;
  p.hurtFlash=1;
  if(!ignoreInv)p.inv=0.45;
  G.FX.num(p.x,p.y-26,'-'+Math.round(dmg),'#ff5d6c',14);
  G.FX.burst(p.x,p.y-8,'#ff5d6c',6,90);
  G.Audio.sfx('hurt');
  if(G.game.settings.shake)G.game.shake=Math.min(10,G.game.shake+4);
  // 反伤
  if(p.thorn>0&&src&&!src.dead){G.Combat.hurtEnemy(src,p.thorn,null);}
  if(p.hp<=0){
    p.hp=0;p.dead=true;
    G.Game.onPlayerDeath();
  }
};

G.Player.draw=function(ctx,cam){
  const gs=G.game,p=gs.player;
  if(p.dead)return;
  const x=p.x-cam.x,y=p.y-cam.y;
  const bob=Math.sin(p.t*6)*1.4;
  const moving=Math.abs(p.vx)+Math.abs(p.vy)>10;
  const squash=p.dashT>0?1.15:(moving?1+Math.sin(p.t*12)*0.04:1);
  const flip=(p.vx<-4)||(Math.cos(p.aim)<-0.2);
  const flash=p.inv>0&&(Date.now()/80|0)%2===0?0.55:(p.hurtFlash>0?Math.min(1,p.hurtFlash):0);
  const psheet=G.gfx.sheet(p.sprite,p.shiny);
  G.gfx.shadow(ctx,x,y+1,Math.max(7,psheet?psheet.width*0.3:7),0.3);
  // 护盾
  if(p.shield){
    ctx.save();ctx.globalAlpha=0.35+0.1*Math.sin(Date.now()/80);
    ctx.strokeStyle='#7ad8ff';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.arc(x,y-8,p.shield.r,0,U.TAU);ctx.stroke();
    ctx.globalAlpha=0.12;ctx.fillStyle='#7ad8ff';ctx.fill();
    ctx.restore();
  }
  G.gfx.draw(ctx,p.sprite,x,y,{shiny:p.shiny,scale:1,bob:bob,flip:flip,squash:squash,
    lean:p.dashT>0?3:0,flash:flash,alpha:p.evoT>0?(0.7+0.3*Math.sin(Date.now()/40)):1});
};

// 触屏用：冲刺按钮
G.Player.touchDash=function(){G.Input.dashQueued=true;};
})();

(function(){
'use strict';
const G=window.G,U=G.U;
const C=G.Combat={};

// 单发弹体对敌扫描（带命中冷却）
C.projHitScan=function(p,dt){
  const gs=G.game;
  if(!p.hitCd)p.hitCd=0;
  if(p.hitCd>0){p.hitCd-=dt;return;}
  const rr=p.size+p.r;
  for(const e of gs.enemies){
    if(e.dead)continue;
    if(p.hitList&&p.hitList.indexOf(e)>=0)continue;
    const dx=e.x-p.x,dy=(e.y-p.y)*1.35;
    if(dx*dx+dy*dy<(rr+e.r)*(rr+e.r)){
      hitEnemy(e,p);
      if(p.pierce>0){p.pierce--;addHit(p,e);}
      else{p.dead=true;}
      p.hitCd=0.06;
      return;
    }
  }
};
function addHit(p,e){(p.hitList=p.hitList||[]).push(e);if(p.hitList.length>20)p.hitList.shift();}

function hitEnemy(e,p){
  const gs=G.game,pl=gs.player;
  C.hurtEnemy(e,p.dmg,p.type,p,{
    knock:p.knock,stun:p.stun,slow:p.slow,slowT:p.slowT,steal:p.steal,srcX:p.x,srcY:p.y
  });
  G.FX.spark(p.x,p.y,p.color,4,80);
  if(p.onHit)p.onHit(e);
  if(p.blast&&p.team==='player'){G.Projectiles.explode(p);}
}

// 核心伤害
C.hurtEnemy=function(e,raw,type,opt){
  if(e.dead)return 0;
  const gs=G.game,pl=gs.player;
  opt=opt||{};
  let dmg=raw;
  // 属性克制
  let mult=1,critTag=false;
  const defs=enemyTypes(e);
  if(type)mult=G.Types.multAll([type],defs);
  // 天气
  if(gs.weather&&gs.weather.atk&&type){
    const w=gs.weather.atk[type];
    if(w)mult*=w;
  }
  // 暴击
  if(Math.random()<pl.crit){dmg*=1.8;critTag=true;}
  dmg*=mult*(pl.xpDmgMul||1);
  if(e.shield>0){
    const a=Math.min(e.shield,dmg);
    e.shield-=a;dmg-=a;
    G.FX.num(e.x,e.y-e.r-12,'格挡','#7ad8ff',11);
    if(dmg<=0){e.hurt=0.4;return 0;}
  }
  dmg=Math.max(1,Math.round(dmg));
  e.hp-=dmg;e.hurt=0.55;
  gs.run.dmg+=dmg;
  gs.save.stats.dmg=(gs.save.stats.dmg||0)+dmg;
  // 击退/控制
  if(opt.knock){
    const a=opt.srcX!=null?U.ang(opt.srcX,opt.srcY,e.x,e.y):Math.random()*U.TAU;
    e.kbX+=Math.cos(a)*opt.knock;e.kbY+=Math.sin(a)*opt.knock;
  }
  if(opt.stun)e.stun=Math.max(e.stun,opt.stun/1000);
  if(opt.slow){e.slow=Math.max(e.slow,opt.slow);e.slowT=Math.max(e.slowT,(opt.slowT||1000)/1000);}
  // 吸血
  if(opt.steal||pl.lifesteal){
    const heal=dmg*(opt.steal||pl.lifesteal);
    pl.hp=Math.min(pl.hpMax,pl.hp+heal);
  }
  // 数字
  const col=mult>=2?'#ff8a3d':(mult<=0.5?'#7ad8ff':(critTag?'#ffd257':'#fff'));
  G.FX.num(e.x,e.y-e.r-8,''+dmg+(critTag?'!':''),col,critTag?16:12);
  if(mult>=2)G.FX.text(e.x,e.y-e.r-22,'效果拔群！','#ff8a3d',11,0.8);
  if(mult<=0.5&&mult>0)G.FX.text(e.x,e.y-e.r-22,'效果不佳','#7ad8ff',10,0.7);
  if(critTag)G.Audio.sfx('crit');else if(Math.random()<0.5)G.Audio.sfx('hit');
  if(e.hp<=0)G.Enemies.kill(e,true);
  return dmg;
};

function enemyTypes(e){
  // 敌人属性映射（毒并入恶，简化为 12 属性系统）
  const m={
    slime:'草',slime2:'恶',slime3:'火',bat:'飞',bat2:'恶',bat3:'幽',
    plant:'草',plant2:'草',plant3:'火',imp:'恶',imp2:'火',imp3:'恶',
    golem:'岩',golem2:'岩',ghost:'幽',ghost2:'幽',ghost3:'幽',
    eye:'幽',eye2:'恶',skull:'幽',skull2:'幽',mush:'虫',mush2:'虫',
    mage:'幽',mage2:'恶',healer:'一般',healer2:'冰'
  };
  return [m[e.id]||'一般'];
}

// 连锁闪电
C.chain=function(from,dmg,type,jumps,range){
  const gs=G.game;
  let cur=from,used=[from];
  for(let i=0;i<jumps;i++){
    let best=null,bd=range*range;
    for(const e of gs.enemies){
      if(e.dead||used.indexOf(e)>=0)continue;
      const d=U.dist2(cur.x,cur.y,e.x,e.y);
      if(d<bd){bd=d;best=e;}
    }
    if(!best)break;
    G.FX.ring(best.x,best.y,10,'#ffe066',0.15,2);
    // 电弧
    G.FX.parts.push({x:best.x,y:best.y-6,vx:0,vy:0,life:0.15,max:0.15,col:'#ffe066',size:3,grav:0});
    C.hurtEnemy(best,dmg*(1-i*0.12),type,{srcX:cur.x,srcY:cur.y});
    used.push(best);cur=best;
  }
};

// 光束伤害
C.beamDamage=function(p,gs){
  const pl=gs.player;
  const len=p.beam.len,w=p.beam.w;
  const x0=pl.x,y0=pl.y-8;
  const x1=x0+Math.cos(pl.aim)*len,y1=y0+Math.sin(pl.aim)*len;
  for(const e of gs.enemies){
    if(e.dead)continue;
    const d=distToSeg(e.x,e.y,x0,y0,x1,y1);
    if(d<w*0.5+e.r)C.hurtEnemy(e,p.dmg,p.type,{});
  }
  G.Audio.sfx('hit');
};
function distToSeg(px,py,x0,y0,x1,y1){
  const dx=x1-x0,dy=y1-y0;
  const l2=dx*dx+dy*dy;
  if(!l2)return Math.hypot(px-x0,py-y0);
  let t=((px-x0)*dx+(py-y0)*dy)/l2;
  t=U.clamp(t,0,1);
  return Math.hypot(px-(x0+t*dx),py-(y0+t*dy));
}

// 光环 tick
C.auraTick=function(p,m,lv){
  const gs=G.game;
  const r=(lv.r||60)+(m.evo?(m.evo.rAdd||0):0);
  const dmg=Math.round((lv.dmg||5)*p.baseDmg*p.dmgMul);
  G.FX.ring(p.x,p.y,r,m.def.type==='冰'?'#8fe0ff':'#a86cff',0.35,2);
  for(const e of gs.enemies){
    if(e.dead)continue;
    if(U.dist2(p.x,p.y,e.x,e.y)<(r+e.r)*(r+e.r)){
      C.hurtEnemy(e,dmg,m.def.type,{slow:lv.slow||0.4,slowT:800});
    }
  }
};
})();

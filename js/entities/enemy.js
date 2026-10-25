(function(){
'use strict';
const G=window.G,U=G.U;
const pool=[];
const L=G.Enemies=[];
G.Enemies.reset=function(){while(L.length)pool.push(L.pop());};
G.Enemies.L=L;

G.Enemies.spawn=function(defId,x,y,opts){
  const def=G.enemy(defId);if(!def)return null;
  const gs=G.game;
  const e=pool.pop()||{};
  const tier=opts&&opts.tier||def.tier||1;
  const waveMul=1+gs.run.wave*0.16+gs.run.time/1000*0.012;
  const hpMul=opts&&opts.hpMul!=null?opts.hpMul:1;
  e.id=defId;e.def=def;e.name=def.name;e.sprite=def.sprite;e.tint=def.tint||null;
  e.x=x;e.y=y;e.vx=0;e.vy=0;e.r=def.r;e.t=Math.random()*6;
  e.hpMax=Math.round(def.hp*waveMul*hpMul*(opts&&opts.hp||1));
  e.hp=e.hpMax;
  e.dmg=def.dmg*(1+gs.run.wave*0.1);
  e.spd=def.spd*(opts&&opts.spdMul||1);
  e.xp=def.xp*(opts&&opts.xpMul||1);
  e.ai=def.ai;e.shootCd=Math.random()*1.5+0.8;
  e.stun=0;e.slow=0;e.slowT=0;e.hurt=0;e.dead=false;
  e.kbX=0;e.kbY=0;
  e.shield=def.shield?def.shield*waveMul:0;
  e.shieldMax=e.shield;
  e.chargeT=0;e.charging=false;e.windup=0;
  e.blastT=0;
  e.phase=def.phase?Math.random()*U.TAU:0;
  e.hitCd=0;
  e.summonCd=def.summon?def.summon.cd/1000:0;
  e.healCd=def.heal?def.heal.cd/1000:0;
  e.elite=opts&&opts.elite?opts.elite:0;
  if(e.elite){
    e.hpMax=Math.round(e.hpMax*(2.2+e.elite*1.2));e.hp=e.hpMax;
    e.dmg*=1.25+e.elite*0.2;e.spd*=1.1;e.xp*=3;e.r*=1.15;
  }
  e.isShiny=opts&&opts.shiny||false;
  if(e.isShiny){e.hpMax=Math.round(e.hpMax*3);e.hp=e.hpMax;e.xp*=6;e.dmg*=1.2;}
  e.boss=opts&&opts.boss||false;
  if(e.boss){e.r=opts.r||16;}
  L.push(e);
  return e;
};

G.Enemies.update=function(dt){
  const gs=G.game,pl=gs.player;
  for(let i=L.length-1;i>=0;i--){
    const e=L[i];
    if(e.dead){L.splice(i,1);if(pool.length<150)pool.push(e);continue;}
    e.t+=dt;
    if(e.hurt>0)e.hurt-=dt*4;
    if(e.stun>0){e.stun-=dt;continue;}
    if(e.slowT>0){e.slowT-=dt;if(e.slowT<=0)e.slow=0;}
    if(e.hitCd>0)e.hitCd-=dt;
    const spd=e.spd*(1-e.slow)*(gs.weather&&gs.weather.id==='snow'?0.95:1);
    const dx=pl.x-e.x,dy=pl.y-e.y;
    const dist=Math.hypot(dx,dy)||1;
    const nx=dx/dist,ny=dy/dist;

    // 击退
    if(Math.abs(e.kbX)+Math.abs(e.kbY)>2){
      G.World.collide(e,e.kbX*dt,e.kbY*dt);
      e.kbX*=1-8*dt;e.kbY*=1-8*dt;
    }

    switch(e.ai){
      case 'chaser':
        move(e,nx*spd,ny*spd,dt);
        break;
      case 'orbiter':{
        const tx=-ny*Math.sin(e.t*1.6)+nx*0.75;
        const ty=nx*Math.sin(e.t*1.6)+ny*0.75;
        const d=Math.hypot(tx,ty)||1;
        move(e,tx/d*spd,ty/d*spd,dt);
        break;}
      case 'shooter':{
        const want=110;
        if(dist>want+20)move(e,nx*spd,ny*spd,dt);
        else if(dist<want-30)move(e,-nx*spd*0.8,-ny*spd*0.8,dt);
        else move(e,-ny*spd*0.4,nx*spd*0.4,dt);
        e.shootCd-=dt;
        if(e.shootCd<=0&&dist<280){
          e.shootCd=(e.def.shot.cd)/1000*(0.85+Math.random()*0.3);
          const sh=e.def.shot;
          const a=Math.atan2(dy,dx)+(Math.random()*0.1-0.05);
          G.Projectiles.spawn({x:e.x,y:e.y-6,vx:Math.cos(a)*sh.spd,vy:Math.sin(a)*sh.spd,
            dmg:sh.dmg*(1+gs.run.wave*0.05),team:'enemy',size:sh.size,color:'#ff7a9a',
            life:3,homing:sh.homing?3.4:0});
          G.Audio.sfx('shoot');
        }
        break;}
      case 'charger':{
        if(e.charging){
          move(e,e.chgX*e.chargeSpeed,e.chgY*e.chargeSpeed,dt);
          e.chargeT-=dt;
          if(e.chargeT<=0){e.charging=false;e.windup=0.9;}
        }else if(e.windup>0){
          e.windup-=dt;
          if(e.windup<=0){
            e.charging=true;e.chargeT=0.55;
            e.chgX=nx;e.chgY=ny;e.chargeSpeed=e.def.charge.speed;
          }
        }else{
          move(e,nx*spd*0.8,ny*spd*0.8,dt);
          const c=e.def.charge;
          if(dist<c.range){e.windup=c.wind/1000;}
        }
        break;}
      case 'bomber':{
        move(e,nx*spd,ny*spd,dt);
        if(dist<(e.def.blast.r*0.9)&&e.blastT<=0){
          e.blastT=e.def.blast.wind/1000;
          G.FX.text(e.x,e.y-24,'!', '#ffd93d',16,0.7);
        }
        if(e.blastT>0){
          e.blastT-=dt;
          if(e.blastT<=0){
            e.dead=true;
            G.FX.ring(e.x,e.y,e.def.blast.r,'#ff7a2d',0.4,5);
            G.FX.burst(e.x,e.y,'#ff7a2d',20,200);
            if(U.dist2(e.x,e.y,pl.x,pl.y)<(e.def.blast.r+pl.r)*(e.def.blast.r+pl.r)){
              G.Player.hurt(pl,e.def.blast.dmg*(1+gs.run.wave*0.04),e);
            }
            G.Audio.sfx('fire');
          }
        }
        break;}
      case 'healer':{
        move(e,-nx*spd*0.5,-ny*spd*0.5,dt);
        e.healCd-=dt;
        if(e.healCd<=0){
          e.healCd=e.def.heal.cd/1000;
          let n=0;
          for(const o of L){
            if(o===e||o.dead||n>=6)continue;
            if(U.dist2(e.x,e.y,o.x,o.y)<e.def.heal.r*e.def.heal.r){
              o.hp=Math.min(o.hpMax,o.hp+e.def.heal.amt*(1+gs.run.wave*0.05));
              G.FX.num(o.x,o.y-20,'+'+e.def.heal.amt,'#7ef57e',11);n++;
            }
          }
          if(n){G.FX.ring(e.x,e.y,e.def.heal.r,'#7ef57e',0.4,2);G.Audio.sfx('pickup');}
        }
        break;}
      case 'shielder':{
        move(e,nx*spd,ny*spd,dt);
        if(e.shield<=0&&e.shieldMax>0&&Math.random()<dt*0.5){
          e.shield=e.shieldMax;
          G.FX.ring(e.x,e.y,e.r+8,'#7ad8ff',0.3,2);
        }
        break;}
      case 'summoner':{
        move(e,-nx*spd*0.6,-ny*spd*0.6,dt);
        e.summonCd-=dt;
        if(e.summonCd<=0){
          e.summonCd=e.def.summon.cd/1000;
          let n=0;for(const o of L)if(o.summonedBy===e)n++;
          if(n<e.def.summon.max){
            for(let k=0;k<2;k++){
              const a=Math.random()*U.TAU;
              const s=G.Enemies.spawn(e.def.summon.what,e.x+Math.cos(a)*24,e.y+Math.sin(a)*24,{hpMul:0.6});
              if(s)s.summonedBy=e;
              G.FX.ring(e.x,e.y,20,'#a86cff',0.3,2);
            }
          }
        }
        break;}
      default:
        move(e,nx*spd,ny*spd,dt);
    }

    // 熔岩伤害（对敌）
    if(G.World.hazardAt(e.x,e.y)){
      e.hp-=16*dt;
      if(Math.random()<dt*8)G.FX.trail(e.x,e.y-4,'#ff7a2d');
      if(e.hp<=0){G.Enemies.kill(e);continue;}
    }

    // 接触伤害
    const rr=e.r+pl.r;
    if(dist<rr&&!pl.dead&&pl.inv<=0){
      G.Player.hurt(pl,e.dmg,e);
      if(e.ai!=='bomber'){
        e.kbX=-nx*90;e.kbY=-ny*90;
      }
    }
  }
  function move(e,mx,my,dt){
    G.World.collide(e,mx*dt,my*dt);
  }
};

G.Enemies.kill=function(e,byPlayer){
  const gs=G.game;
  if(e.dead)return;
  e.dead=true;
  gs.run.kills++;
  G.Save.track('kills',1);
  // 掉落
  G.Pickups.xp(e.x,e.y,e.xp);
  if(Math.random()<0.45)G.Pickups.gold(e.x,e.y,1+((Math.random()*3)|0)+gs.run.wave);
  if(Math.random()<0.012)G.Pickups.heart(e.x,e.y);
  if(Math.random()<0.004)G.Pickups.ticket(e.x,e.y);
  if(Math.random()<0.002)G.Pickups.gem(e.x,e.y,1);
  if(Math.random()<0.06&&!gs.run.bossMode){
    const ids=Object.keys(G.ITEMS);
    G.Pickups.item(e.x,e.y,gs.rng.pick(ids));
  }
  if(e.isShiny){
    G.UI.toast('捕获闪光 '+e.name+'！','good');
    G.Save.gainMon(e.id,true);
    G.Save.data.gems+=10;
    G.FX.ring(e.x,e.y,50,'#9ef',0.6,4);
  }
  G.FX.burst(e.x,e.y-4,e.tint||'#fff',8,120);
  G.FX.spark(e.x,e.y,'#ffd257',5,100);
  if(Math.random()<0.25)G.Audio.sfx('kill');
  if(gs.run.bossMode&&e.boss){/* boss.js 处理 */}
};

G.Enemies.draw=function(ctx,cam){
  for(const e of L){
    if(e.dead)continue;
    const x=e.x-cam.x,y=e.y-cam.y;
    if(x<-40||y<-40||x>cam.w+40||y>cam.h+40)continue;
    const bob=Math.sin(e.t*(e.ai==='orbiter'?8:5))*1.2;
    const squash=e.windup>0?1.12:(e.hurt>0?0.92:1);
    G.gfx.shadow(ctx,x,y+1,e.r*0.85,0.28);
    // 充能预警
    if(e.windup>0){
      ctx.save();ctx.globalAlpha=0.4+0.3*Math.sin(Date.now()/50);
      ctx.strokeStyle='#ff5d6c';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(x,y-8,e.r+6,0,U.TAU);ctx.stroke();ctx.restore();
    }
    if(e.shield>0){
      ctx.save();ctx.globalAlpha=0.3;ctx.strokeStyle='#7ad8ff';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(x,y-8,e.r+4,0,U.TAU);ctx.stroke();ctx.restore();
    }
    G.gfx.draw(ctx,e.sprite,x,y,{scale:e.boss?2:(e.elite?1.15:1),tint:e.tint,tintA:0.4,
      bob:bob,squash:squash,flash:e.hurt>0?Math.min(1,e.hurt):0});
    if(e.isShiny){
      ctx.save();ctx.globalAlpha=0.5+0.3*Math.sin(Date.now()/100);
      ctx.fillStyle='#9ef';ctx.font='10px sans-serif';ctx.textAlign='center';
      ctx.fillText('✦',x,y-e.r*2-8);ctx.restore();ctx.textAlign='left';
    }
    // 血条（受伤的非满血敌人）
    if(e.hp<e.hpMax&&!e.boss){
      const w=Math.max(14,e.r*2);
      const yy=y-e.r*2-6;
      ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(x-w/2,yy,w,3);
      ctx.fillStyle=e.elite?'#ffd257':'#ff5d6c';ctx.fillRect(x-w/2,yy,w*(e.hp/e.hpMax),3);
    }
  }
};
})();

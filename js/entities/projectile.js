(function(){
'use strict';
const G=window.G,U=G.U;
const pool=[];
let uid=1;
const P=G.Projectiles=[];
G.Projectiles.reset=function(){while(P.length)pool.push(P.pop());};

G.Projectiles.spawn=function(o){
  const p=pool.pop()||{};
  p.uid=uid++;
  p.x=o.x;p.y=o.y;p.vx=o.vx||0;p.vy=o.vy||0;
  p.dmg=o.dmg||10;p.team=o.team||'player';
  p.size=o.size||4;p.life=o.life||1.6;p.r=p.size;
  p.pierce=o.pierce||0;p.hitList=null;
  p.type=o.type||'一般';
  p.color=o.color||'#fff';
  p.icon=o.icon||'dot';
  p.knock=o.knock||0;p.stun=o.stun||0;
  p.slow=o.slow||0;p.slowT=o.slowT||0;
  p.blast=o.blast||0;
  p.homing=o.homing||0;          // 追踪转向速度
  p.target=o.target||null;
  p.orbit=o.orbit||null;          // {r,ang,spd,cx,cy}
  p.boom=o.boom||null;            // {r,dist,out} 往返
  p.beam=o.beam||null;            // {len,w,tick,t}
  p.steal=o.steal||0;
  p.dead=false;p.age=0;
  p.onHit=o.onHit||null;
  P.push(p);
  return p;
};

function findTarget(x,y,maxR){
  const gs=G.game;if(!gs)return null;
  let best=null,bd=maxR*maxR;
  for(const e of gs.enemies){
    const d=U.dist2(x,y,e.x,e.y);
    if(d<bd){bd=d;best=e;}
  }
  return best;
}

G.Projectiles.update=function(dt){
  const gs=G.game;
  for(let i=P.length-1;i>=0;i--){
    const p=P[i];
    p.age+=dt;
    if(p.age>=p.life){kill(i);continue;}
    if(p.dead){kill(i);continue;}

    if(p.beam){
      // 光束：跟随玩家朝向，tick 伤害
      const pl=gs.player;
      p.x=pl.x;p.y=pl.y-8;
      p.beam.t=(p.beam.t||0)+dt;
      if(p.beam.t*1000>=p.beam.tick){
        p.beam.t=0;
        G.Combat.beamDamage(p,gs);
      }
      continue;
    }

    if(p.orbit){
      const pl=gs.player;
      p.orbit.cx=pl.x;p.orbit.cy=pl.y-6;
      p.orbit.ang+=p.orbit.spd*dt;
      p.x=p.orbit.cx+Math.cos(p.orbit.ang)*p.orbit.r;
      p.y=p.orbit.cy+Math.sin(p.orbit.ang)*p.orbit.r*0.72;
      // 轨道弹按帧判定，无速度
      G.Combat.projHitScan(p,dt);
      continue;
    }

    if(p.boom){
      const b=p.boom;
      b.dist+=b.dir*(b.speed)*dt;
      if(b.dist>=b.r){b.dir=-1;}
      if(b.dist<=8){kill(i);continue;}
      const nx=p.ox+Math.cos(p.ang)*b.dist;
      const ny=p.oy+Math.sin(p.ang)*b.dist;
      p.vx=(nx-p.x)/Math.max(dt,0.001);p.vy=(ny-p.y)/Math.max(dt,0.001);
      p.x=nx;p.y=ny;
      G.Combat.projHitScan(p,dt);
      continue;
    }

    if(p.homing){
      if(!p.target||p.target.dead)p.target=findTarget(p.x,p.y,260);
      if(p.target){
        const want=U.ang(p.x,p.y,p.target.x,p.target.y);
        const cur=Math.atan2(p.vy,p.vx);
        let d=want-cur;
        while(d>Math.PI)d-=U.TAU;while(d<-Math.PI)d+=U.TAU;
        const na=cur+U.clamp(d,-p.homing*dt,p.homing*dt);
        const sp=Math.hypot(p.vx,p.vy);
        p.vx=Math.cos(na)*sp;p.vy=Math.sin(na)*sp;
      }
    }

    const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt;
    // 撞墙
    if(G.World.solidAt(nx,ny,true)){
      if(p.blast){explode(p);}else{G.FX.spark(p.x,p.y,p.color,4,60);kill(i);continue;}
      continue;
    }
    p.x=nx;p.y=ny;

    G.Combat.projHitScan(p,dt);
  }
  function kill(i){const p=P[i];P.splice(i,1);if(pool.length<200)pool.push(p);}
};

G.Projectiles.draw=function(ctx,cam){
  for(const p of P){
    const x=p.x-cam.x,y=p.y-cam.y;
    if(p.beam){
      const pl=G.game.player;
      const len=p.beam.len,w=p.beam.w;
      const x0=pl.x-cam.x,y0=pl.y-cam.y-8;
      const ex=x0+Math.cos(pl.aim)*len,ey=y0+Math.sin(pl.aim)*len;
      ctx.save();
      ctx.globalAlpha=0.35+0.2*Math.sin(Date.now()/40);
      ctx.strokeStyle=p.color;ctx.lineWidth=w;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(ex,ey);ctx.stroke();
      ctx.globalAlpha=0.9;ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(2,w*0.3);
      ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(ex,ey);ctx.stroke();
      ctx.restore();
      continue;
    }
    G.gfx.shadow(ctx,x,y+2,p.size*0.8,0.25);
    ctx.fillStyle=p.color;
    const s=p.size*2;
    ctx.beginPath();ctx.arc(x,y-6,p.size,0,U.TAU);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.75)';
    ctx.beginPath();ctx.arc(x-p.size*0.3,y-6-p.size*0.3,p.size*0.35,0,U.TAU);ctx.fill();
  }
};
function explode(p){
  const gs=G.game;
  G.FX.ring(p.x,p.y,p.blast,p.color,0.35,4);
  G.FX.burst(p.x,p.y,p.color,14,160);
  for(const e of gs.enemies){
    if(e.dead)continue;
    if(U.dist2(p.x,p.y,e.x,e.y)<(p.blast+e.r)*(p.blast+e.r)){
      G.Combat.hurtEnemy(e,p.dmg*0.7,p.type,null,{noChain:true});
    }
  }
  G.Audio.sfx('fire');
}
G.Projectiles.explode=explode;
})();

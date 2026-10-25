(function(){
'use strict';
const G=window.G,U=G.U;
const S=G.Spawner={t:0,riftT:0,rift:null,shinyT:0};

const TIERS={
  1:['slime','bat','plant'],
  2:['slime2','bat2','plant2','imp','ghost','skull'],
  3:['imp2','ghost2','mush','golem','eye','mage','healer'],
  4:['slime3','bat3','plant3','imp3','ghost3','golem2','skull2','mush2','eye2','mage2','healer2'],
};

S.reset=function(){
  S.t=0;S.riftT=60+Math.random()*30;S.rift=null;S.shinyT=40+Math.random()*60;
};

// 随机刷怪点（屏幕外环形）
function spawnPos(){
  const gs=G.game,pl=gs.player,cam=gs.cam;
  const a=Math.random()*U.TAU;
  const r=Math.max(cam.w,cam.h)*0.55+40;
  let x=pl.x+Math.cos(a)*r,y=pl.y+Math.sin(a)*r;
  // 避开水/熔岩中心（允许边缘）
  let guard=0;
  while((G.World.tileAt(x,y)===2||G.World.tileAt(x,y)===4)&&guard++<6){x+=Math.cos(a)*20;y+=Math.sin(a)*20;}
  // 最终确保不在树/石/宝箱等固体里
  return G.World.findSpawn(x,y,6);
}

S.pickPool=function(wave){
  let tier=1;
  if(wave>=18)tier=4;else if(wave>=11)tier=3;else if(wave>=5)tier=2;
  const pool=[];
  for(let t=1;t<=tier;t++)for(const id of TIERS[t])pool.push({v:id,w:t===tier?3:(t===tier-1?2:1)});
  return pool;
};

S.update=function(dt){
  const gs=G.game,pl=gs.player;
  S.t+=dt;
  gs.run.time+=dt*1000;
  const timeSec=gs.run.time/1000;
  gs.run.wave=1+Math.floor(timeSec/45);

  // 生成预算：随时间指数增长 + 上限
  const rate=0.9+timeSec*0.055+gs.run.wave*0.18;
  const cap=Math.min(260,60+Math.floor(timeSec*1.6));
  S.acc=(S.acc||0)+rate*dt*6;
  const maxSpawn=Math.min(8,2+Math.floor(timeSec/60));
  let n=0;
  const pool=S.pickPool(gs.run.wave);
  while(S.acc>=1&&n<maxSpawn&&G.Enemies.L.length<cap){
    S.acc-=1;n++;
    const p=spawnPos();
    const id=gs.rng.wpick(pool);
    // 精英概率
    let elite=0;
    if(timeSec>90&&gs.rng()<0.03+Math.min(0.07,timeSec/2400))elite=1;
    if(timeSec>240&&gs.rng()<0.015)elite=2;
    // 闪光
    let shiny=false;
    S.shinyT-=dt;
    if(S.shinyT<=0){shiny=true;S.shinyT=30+Math.random()*50;}
    G.Enemies.spawn(id,p.x,p.y,{elite:elite,shiny:shiny});
  }
  if(S.acc>4)S.acc=4;

  // 头目
  G.Boss.update(dt);

  // 裂隙（传说挑战）
  if(!S.rift&&!gs.run.bossMode&&timeSec>50){
    S.riftT-=dt;
    if(S.riftT<=0){
      S.openRift();
      S.riftT=120+Math.random()*60;
    }
  }
  if(S.rift){
    const dx=pl.x-S.rift.x,dy=pl.y-S.rift.y;
    if(dx*dx+dy*dy<26*26){
      G.Boss.enterLegendary(S.rift);
      S.rift=null;
    }
  }
};

S.openRift=function(){
  const gs=G.game,pl=gs.player;
  const a=Math.random()*U.TAU,r=140+Math.random()*100;
  const x=pl.x+Math.cos(a)*r,y=pl.y+Math.sin(a)*r;
  S.rift={x:x,y:y,t:0};
  G.UI.banner('裂隙出现！');
  G.Audio.sfx('teleport');
  G.FX.ring(x,y,40,'#a86cff',0.8,4);
};

S.draw=function(ctx,cam){
  if(!S.rift)return;
  const x=S.rift.x-cam.x,y=S.rift.y-cam.y;
  S.rift.t+=0.016;
  const pulse=1+Math.sin(S.rift.t*4)*0.12;
  ctx.save();
  ctx.globalAlpha=0.5+0.2*Math.sin(S.rift.t*6);
  ctx.strokeStyle='#a86cff';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(x,y,20*pulse,0,U.TAU);ctx.stroke();
  ctx.restore();
  G.gfx.draw(ctx,'portal',x,y+4,{scale:1,bob:Math.sin(S.rift.t*3)*3});
  G.gfx.font(ctx,11,800);ctx.textAlign='center';
  ctx.fillStyle='#d8c0ff';ctx.fillText('裂隙',x,y-26);ctx.textAlign='left';
};
})();

(function(){
'use strict';
const G=window.G,U=G.U;
const Ga=G.Gacha={};

// 权重：稀有度 1:60 2:26 3:11 4:3
const RATES=[{v:1,w:60},{v:2,w:26},{v:3,w:11},{v:4,w:3}];
const SHINY_RATE=1/64;

Ga.rollOne=function(rng){
  rng=rng||Math.random;
  const r=rng.wpick?rng.wpick(RATES):U.wpick(rng,RATES);
  const pool=Object.keys(G.SPECIES).filter(id=>G.SPECIES[id].rarity===r);
  if(!pool.length)return null;
  const id=pool[(rng()*pool.length)|0];
  const shiny=rng()<SHINY_RATE;
  return {id:id,shiny:shiny,rarity:r};
};

Ga.pull=function(n){
  const s=G.Save.data;
  const cost=n>=10?9:1;
  if(s.tickets<cost){G.Audio.sfx('error');G.UI.toast('扭蛋券不足','bad');return null;}
  s.tickets-=cost;
  const rng=G.RNG((Date.now()^(Math.random()*1e9))>>>0);
  const res=[];
  for(let i=0;i<n;i++){
    const r=Ga.rollOne(rng);
    if(!r)continue;
    const isNew=!G.Save.hasMon(r.id)&&!r.shiny;
    const wasNew=!G.Save.hasMon(r.id);
    G.Save.gainMon(r.id,r.shiny);
    // 重复转化为资源
    const sp=G.SPECIES[r.id];
    let dup=0;
    if(!wasNew){
      dup=1;
      const g=sp.rarity*5+(r.shiny?20:0);
      s.gems+=g;
      s.tickets+=sp.rarity>=3?1:0;
    }
    res.push({id:r.id,shiny:r.shiny,rarity:sp.rarity,dup:dup,gems:dup?sp.rarity*5+(r.shiny?20:0):0});
  }
  s.stats.gacha+=n;
  G.Save.track('gacha',n);
  G.Save.save();
  G.Audio.sfx(n>=10?'gachaBig':'gacha');
  return res;
};

// 扭蛋机动画绘制
Ga.drawMachine=function(ctx,w,h,t){
  ctx.clearRect(0,0,w,h);
  const cx=w/2,baseY=h-20;
  // 底座
  ctx.fillStyle='#3a4a8a';ctx.fillRect(cx-50,baseY-30,100,30);
  ctx.fillStyle='#2a3468';ctx.fillRect(cx-50,baseY-8,100,8);
  ctx.fillStyle='#ffd257';ctx.fillRect(cx-40,baseY-24,12,8);
  ctx.fillStyle='#1a2040';ctx.fillRect(cx-20,baseY-24,40,14);
  // 球体
  const bob=Math.sin(t*2)*3;
  const gy=baseY-80+bob;
  ctx.save();
  ctx.beginPath();ctx.arc(cx,gy,42,0,U.TAU);
  const g=ctx.createRadialGradient(cx-14,gy-16,4,cx,gy,44);
  g.addColorStop(0,'#fff');g.addColorStop(0.25,'#7ad8ff');g.addColorStop(1,'#1f4a8a');
  ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle='#0f2a5a';ctx.lineWidth=3;ctx.stroke();
  // 高光
  ctx.globalAlpha=0.5;ctx.fillStyle='#fff';
  ctx.beginPath();ctx.ellipse(cx-16,gy-18,12,8,-0.5,0,U.TAU);ctx.fill();
  ctx.globalAlpha=0.25;ctx.fillStyle='#fff';
  for(let i=0;i<3;i++){
    ctx.beginPath();ctx.arc(cx+Math.cos(t*2+i*2)*22,gy+Math.sin(t*2+i*2)*18,3,0,U.TAU);ctx.fill();
  }
  ctx.restore();
  // 管道
  ctx.fillStyle='#4a5aa0';ctx.fillRect(cx-8,baseY-38,16,10);
};
})();

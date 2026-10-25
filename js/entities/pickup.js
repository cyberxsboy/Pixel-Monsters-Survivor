(function(){
'use strict';
const G=window.G,U=G.U;
const pool=[];
const L=G.Pickups=[];
G.Pickups.reset=function(){while(L.length)pool.push(L.pop());};

function mk(o){const p=pool.pop()||{};Object.assign(p,{x:0,y:0,vx:0,vy:0,type:'xp',val:1,r:5,life:60,mag:false,t:0,dead:false},o);L.push(p);return p;}

G.Pickups.xp=function(x,y,v){
  const big=v>=25;
  mk({x:x+(Math.random()*10-5),y:y+(Math.random()*10-5),type:'xp',val:v,r:big?6:4,mag:false});
};
G.Pickups.gold=function(x,y,v){
  mk({x:x+(Math.random()*12-6),y:y+(Math.random()*12-6),type:'gold',val:v,r:5});
};
G.Pickups.heart=function(x,y){
  mk({x:x,y:y,type:'heart',val:25,r:6});
};
G.Pickups.ticket=function(x,y){
  mk({x:x,y:y,type:'ticket',val:1,r:6});
};
G.Pickups.gem=function(x,y,v){
  mk({x:x,y:y,type:'gem',val:v||1,r:6});
};
G.Pickups.chest=function(x,y){
  mk({x:x,y:y,type:'chest',val:1,r:8,life:120});
};
G.Pickups.item=function(x,y,itemId){
  mk({x:x,y:y,type:'item',val:itemId,r:7,life:120});
};

G.Pickups.update=function(dt){
  const gs=G.game,pl=gs.player;
  for(let i=L.length-1;i>=0;i--){
    const p=L[i];p.t+=dt;p.life-=dt;
    if(p.life<=0){L.splice(i,1);continue;}
    const dx=pl.x-p.x,dy=pl.y-p.y;
    const d2=dx*dx+dy*dy;
    const magR=pl.pickR+(p.type==='xp'?18:0);
    if(p.mag||d2<magR*magR){
      p.mag=true;
      const d=Math.sqrt(d2)||1;
      const sp=U.clamp(340-d*1.2,120,420);
      p.vx=dx/d*sp;p.vy=dy/d*sp;
      p.x+=p.vx*dt;p.y+=p.vy*dt;
    }
    if(d2<(pl.r+12)*(pl.r+12)){
      collect(p);
      L.splice(i,1);
    }
  }
  function collect(p){
    const s=gs.save;
    switch(p.type){
      case 'xp':
        G.Audio.sfx('gem');
        G.Player.gainXp(pl,p.val*(pl.xpMul||1));
        break;
      case 'gold':
        G.Audio.sfx('coin');
        s.coins+=Math.max(1,Math.round(p.val*(pl.goldMul||1)));
        gs.run.gold+=Math.max(1,Math.round(p.val*(pl.goldMul||1)));
        G.Save.track('gold',Math.max(1,Math.round(p.val*(pl.goldMul||1))));
        G.HUD.dirty=true;
        break;
      case 'heart':
        G.Audio.sfx('pickup');
        pl.hp=Math.min(pl.hpMax,pl.hp+p.val);
        G.FX.num(pl.x,pl.y-30,'+'+p.val,'#7ef57e',14);
        break;
      case 'ticket':
        G.Audio.sfx('coin');
        s.tickets+=1;G.HUD.dirty=true;
        G.UI.toast('获得扭蛋券 ✦1','good');
        break;
      case 'gem':
        G.Audio.sfx('coin');
        s.gems+=p.val;G.HUD.dirty=true;
        break;
      case 'chest':
        G.Audio.sfx('chest');
        openChest(p);
        break;
      case 'item':
        G.Audio.sfx('levelup');
        G.LevelUp.addItem(p.val);
        break;
    }
  }
  function openChest(p){
    const rng=gs.rng;
    const gold=U.irand(20,60)+gs.run.wave*8;
    s.coins+=gold;gs.run.gold+=gold;
    G.Save.track('gold',gold);
    let n=3+((rng()*3)|0);
    for(let k=0;k<n;k++)G.Pickups.xp(p.x,p.y,5+((rng()*10)|0));
    if(rng()<0.35)G.Pickups.ticket(p.x,p.y);
    if(rng()<0.2)G.Pickups.heart(p.x,p.y);
    if(rng()<0.12)G.Pickups.gem(p.x,p.y,2);
    if(rng()<0.5){
      const ids=Object.keys(G.ITEMS);
      G.Pickups.item(p.x+(rng()*30-15),p.y+(rng()*30-15),rng.pick(ids));
    }
    G.FX.ring(p.x,p.y,40,'#ffd257',0.5,4);
    G.FX.burst(p.x,p.y,'#ffd257',20,180);
    G.UI.toast('打开宝箱！金币 +'+gold,'good');
  }
};

G.Pickups.draw=function(ctx,cam){
  for(const p of L){
    const x=p.x-cam.x,y=p.y-cam.y;
    const bob=Math.sin(p.t*4)*2;
    const blink=p.life<12&&(Date.now()/200|0)%2===0;
    if(blink)continue;
    G.gfx.shadow(ctx,x,y+1,p.r*0.7,0.22);
    if(p.type==='xp'){
      ctx.fillStyle='#7ef57e';
      ctx.beginPath();ctx.moveTo(x,y-6+bob);ctx.lineTo(x+p.r,y+bob);ctx.lineTo(x,y+6+bob);ctx.lineTo(x-p.r,y+bob);
      ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.6)';ctx.fillRect(x-1,y-4+bob,2,3);
    }else if(p.type==='gold'){
      ctx.fillStyle='#ffd257';ctx.beginPath();ctx.arc(x,y-4+bob,p.r,0,U.TAU);ctx.fill();
      ctx.fillStyle='#b8860b';ctx.beginPath();ctx.arc(x,y-4+bob,p.r*0.55,0,U.TAU);ctx.fill();
    }else if(p.type==='heart'){
      G.gfx.draw(ctx,'heart',x,y+bob,{scale:1});
    }else if(p.type==='ticket'){
      G.gfx.font(ctx,12,900);ctx.fillStyle='#ff9de2';ctx.textAlign='center';ctx.fillText('✦',x,y+bob);ctx.textAlign='left';
    }else if(p.type==='gem'){
      G.gfx.draw(ctx,'gemBig',x,y+bob,{scale:1});
    }else if(p.type==='chest'){
      G.gfx.draw(ctx,'chest',x,y+2,{scale:1,bob:bob*0.5});
    }else if(p.type==='item'){
      const it=G.item(p.val);
      G.gfx.font(ctx,16,900);ctx.textAlign='center';
      ctx.fillStyle='#000';ctx.fillText(it?it.icon:'?',x+1,y-4+bob+1);
      ctx.fillStyle='#7ad8ff';ctx.fillText(it?it.icon:'?',x,y-4+bob);
      ctx.textAlign='left';
      ctx.globalAlpha=0.5;ctx.strokeStyle='#7ad8ff';ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(x,y-4+bob,10+Math.sin(p.t*6)*2,0,U.TAU);ctx.stroke();ctx.globalAlpha=1;
    }
  }
};
})();

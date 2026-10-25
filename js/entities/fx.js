(function(){
'use strict';
const G=window.G,U=G.U;
const F=G.FX={parts:[],nums:[],rings:[],marks:[],texts:[]};

F.reset=function(){F.parts.length=0;F.nums.length=0;F.rings.length=0;F.marks.length=0;F.texts.length=0;};

F.spark=function(x,y,col,n,spd){
  n=n||6;spd=spd||90;
  const q=G.game&&G.game.quality!==0;
  if(!q)n=Math.ceil(n/2);
  for(let i=0;i<n;i++){
    if(F.parts.length>420)return;
    const a=Math.random()*U.TAU,v=spd*(0.4+Math.random()*0.8);
    F.parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:0.28+Math.random()*0.25,max:0.5,
      col:col||'#fff',size:1+((Math.random()*2)|0),grav:0});
  }
};
F.burst=function(x,y,col,n,spd,grav){
  n=n||10;spd=spd||140;
  for(let i=0;i<n;i++){
    if(F.parts.length>420)return;
    const a=Math.random()*U.TAU,v=spd*(0.3+Math.random());
    F.parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:0.3+Math.random()*0.3,max:0.6,
      col:col||'#ffd257',size:1+((Math.random()*3)|0),grav:grav==null?180:grav});
  }
};
F.trail=function(x,y,col){
  if(F.parts.length>420)return;
  F.parts.push({x:x+(Math.random()*4-2),y:y+(Math.random()*4-2),vx:0,vy:0,life:0.2,max:0.2,
    col:col||'#fff',size:2,grav:0});
};
F.num=function(x,y,txt,col,size){
  if(!G.game.settings.dmgnum)return;
  if(F.nums.length>70)return;
  F.nums.push({x:x+(Math.random()*10-5),y:y,txt:txt,col:col||'#fff',size:size||12,life:0.7,max:0.7,vy:-46});
};
F.ring=function(x,y,r,col,life,w){
  if(F.rings.length>24)return;
  F.rings.push({x:x,y:y,r0:r*0.3,r1:r,col:col||'#fff',life:life||0.3,max:life||0.3,w:w||3});
};
// 地面预警标记（矩形/圆形）
F.mark=function(x,y,r,delay,life,col,onEnd){
  if(F.marks.length>30)return;
  F.marks.push({x:x,y:y,r:r,delay:delay||0.5,life:life||0.4,max:life||0.4,col:col||'rgba(255,80,80,.35)',onEnd:onEnd});
};
F.text=function(x,y,txt,col,size,life){
  if(F.texts.length>16)return;
  F.texts.push({x:x,y:y,txt:txt,col:col||'#ffd257',size:size||14,life:life||1.4,max:life||1.4});
};

F.update=function(dt){
  for(let i=F.parts.length-1;i>=0;i--){
    const p=F.parts[i];p.life-=dt;
    if(p.life<=0){F.parts.splice(i,1);continue;}
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.grav)p.vy+=p.grav*dt;
    p.vx*=1-2.6*dt;p.vy*=1-2.6*dt;
  }
  for(let i=F.nums.length-1;i>=0;i--){
    const n=F.nums[i];n.life-=dt;if(n.life<=0){F.nums.splice(i,1);continue;}
    n.y+=n.vy*dt;n.vy*=(1-3*dt);
  }
  for(let i=F.rings.length-1;i>=0;i--){
    const r=F.rings[i];r.life-=dt;if(r.life<=0){F.rings.splice(i,1);continue;}
  }
  for(let i=F.marks.length-1;i>=0;i--){
    const m=F.marks[i];
    if(m.delay>0){m.delay-=dt;continue;}
    m.life-=dt;
    if(m.life<=0){F.marks.splice(i,1);if(m.onEnd)m.onEnd();continue;}
  }
  for(let i=F.texts.length-1;i>=0;i--){
    const t=F.texts[i];t.life-=dt;if(t.life<=0){F.texts.splice(i,1);continue;}
    t.y-=14*dt;
  }
};

F.drawGround=function(ctx,cam){
  for(const m of F.marks){
    const x=m.x-cam.x,y=m.y-cam.y;
    if(m.delay>0){
      ctx.save();ctx.globalAlpha=0.25+0.15*Math.sin(Date.now()/80);
      ctx.fillStyle='#ff4040';ctx.beginPath();ctx.arc(x,y,m.r,0,U.TAU);ctx.fill();
      ctx.globalAlpha=0.6;ctx.strokeStyle='#ff8080';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(x,y,m.r,0,U.TAU);ctx.stroke();
      ctx.restore();
    }else{
      const t=1-m.life/m.max;
      ctx.save();ctx.globalAlpha=0.55*(1-t*0.5);
      ctx.fillStyle=m.col;ctx.beginPath();ctx.arc(x,y,m.r,0,U.TAU);ctx.fill();
      ctx.restore();
    }
  }
  for(const r of F.rings){
    const t=1-r.life/r.max,rad=U.lerp(r.r0,r.r1,U.easeOut(t));
    ctx.save();ctx.globalAlpha=1-t;
    ctx.strokeStyle=r.col;ctx.lineWidth=r.w;
    ctx.beginPath();ctx.arc(r.x-cam.x,r.y-cam.y,rad,0,U.TAU);ctx.stroke();
    ctx.restore();
  }
};

F.draw=function(ctx,cam){
  for(const p of F.parts){
    const t=p.life/p.max;
    ctx.globalAlpha=t;ctx.fillStyle=p.col;
    const s=p.size;
    ctx.fillRect(Math.round(p.x-cam.x-s/2),Math.round(p.y-cam.y-s/2),s,s);
  }
  ctx.globalAlpha=1;
  G.gfx.font(ctx,13,800);
  ctx.textAlign='center';
  for(const n of F.nums){
    const t=n.life/n.max;
    ctx.globalAlpha=Math.min(1,t*2);
    ctx.fillStyle='#000';ctx.fillText(n.txt,n.x-cam.x+1,n.y-cam.y+1);
    ctx.fillStyle=n.col;ctx.fillText(n.txt,n.x-cam.x,n.y-cam.y);
  }
  for(const tx of F.texts){
    const t=tx.life/tx.max;
    ctx.globalAlpha=Math.min(1,t*2);
    G.gfx.font(ctx,tx.size,800);
    ctx.fillStyle='#000';ctx.fillText(tx.txt,tx.x-cam.x+1,tx.y-cam.y+1);
    ctx.fillStyle=tx.col;ctx.fillText(tx.txt,tx.x-cam.x,tx.y-cam.y);
  }
  ctx.globalAlpha=1;ctx.textAlign='left';
};
})();

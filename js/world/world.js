(function(){
'use strict';
const G=window.G,U=G.U;
const TS=16;           // tile 像素（世界单位）
const CS=16;           // 每块 tiles
const W=G.World={TS:TS,CS:CS,seed:0,chunk:new Map(),objs:new Map()};

// tile: 0草 1深草 2水 3沙 4熔岩 5花 6石板
// obj: 0无 1树 2石 3草丛 4回复泉 5石碑 6宝箱 7陷阱

function key(cx,cy){return cx+','+cy;}
function tileHash(x,y,s){let h=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(s,1274126177);
  h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}

W.reset=function(seed){
  W.seed=seed>>>0;W.chunk.clear();W.objs.clear();
};
W.genChunk=function(cx,cy){
  const k=key(cx,cy);
  let c=W.chunk.get(k);
  if(c)return c;
  const tiles=new Uint8Array(CS*CS);
  const objs=new Uint8Array(CS*CS);
  const s=W.seed;
  for(let ty=0;ty<CS;ty++)for(let tx=0;tx<CS;tx++){
    const x=cx*CS+tx,y=cy*CS+ty;
    const i=ty*CS+tx;
    const n=G.noise(x*0.045,y*0.045,s,3);
    const n2=G.noise(x*0.09+100,y*0.09+100,s+7,2);
    const n3=G.noise(x*0.02+500,y*0.02+500,s+13,2);
    let t=0;
    if(n>0.66)t=2;              // 水
    else if(n>0.6)t=3;          // 沙
    else if(n<0.32&&n3>0.55)t=4;// 熔岩
    else if(n2>0.62)t=1;        // 深草
    else if(n2<0.28&&n<0.55&&n>0.42)t=5; // 花
    tiles[i]=t;
    // 物件（不放在水/熔岩上）
    let o=0;
    if(t===0||t===1||t===5){
      const r=tileHash(x,y,s);
      if(r>0.955)o=1;            // 树
      else if(r>0.93)o=2;        // 石
      else if(r>0.9)o=3;         // 草丛
    }else if(t===3){
      const r=tileHash(x,y,s+3);
      if(r>0.97)o=2;
    }else if(t===2){
      const r=tileHash(x,y,s+9);
      if(r>0.995)o=4;            // 水中泉（少见）
    }
    objs[i]=o;
  }
  c={tiles:tiles,objs:objs,cx:cx,cy:cy,img:null,dirty:true,items:[]};
  W.chunk.set(k,c);
  return c;
};
W.tileAt=function(x,y){
  const tx=Math.floor(x/TS),ty=Math.floor(y/TS);
  const cx=Math.floor(tx/CS),cy=Math.floor(ty/CS);
  const c=W.genChunk(cx,cy);
  return c.tiles[(ty-cy*CS)*CS+(tx-cx*CS)];
};
W.objAt=function(x,y){
  const tx=Math.floor(x/TS),ty=Math.floor(y/TS);
  const cx=Math.floor(tx/CS),cy=Math.floor(ty/CS);
  const c=W.genChunk(cx,cy);
  return c.objs[(ty-cy*CS)*CS+(tx-cx*CS)];
};
W.setObj=function(x,y,o){
  const tx=Math.floor(x/TS),ty=Math.floor(y/TS);
  const cx=Math.floor(tx/CS),cy=Math.floor(ty/CS);
  const c=W.genChunk(cx,cy);
  c.objs[(ty-cy*CS)*CS+(tx-cx*CS)]=o;c.dirty=true;
};
W.objPixelCenter=function(x,y){
  const tx=Math.floor(x/TS),ty=Math.floor(y/TS);
  return {x:tx*TS+TS/2,y:ty*TS+TS/2,tx:tx,ty:ty};
};

const SOLID_OBJ={1:1,2:1,6:1};      // 树/石/宝箱 阻挡移动
const BLOCK_SHOT={1:1,2:1};          // 树/石 挡子弹
W.solidAt=function(x,y,forShot){
  const t=W.tileAt(x,y);
  if(t===2||t===4)return forShot?false:'liquid';
  const o=W.objAt(x,y);
  if(o===0)return false;
  if(forShot)return !!BLOCK_SHOT[o];
  if(o===7)return false;             // 陷阱不阻挡
  if(o===4)return false;             // 泉不阻挡
  if(o===3)return false;             // 草丛可穿过
  return !!SOLID_OBJ[o];
};
// 圆形碰撞检测 + 滑动移动
W.collide=function(ent,dx,dy){
  const r=ent.r*0.72;
  let nx=ent.x+dx,ny=ent.y;
  if(!W.hitSolid(nx,ny,r))ent.x=nx;
  nx=ent.x;ny=ent.y+dy;
  if(!W.hitSolid(nx,ny,r))ent.y=ny;
};
W.hitSolid=function(x,y,r){
  for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
    const tx=Math.floor((x+ox*r*0.9)/TS),ty=Math.floor((y+oy*r*0.9)/TS);
    if(W.solidAt(tx*TS+8,ty*TS+8,false))return true;
  }
  return false;
};
W.speedAt=function(x,y){
  const t=W.tileAt(x,y);
  if(t===2)return 0.55;   // 水减速
  if(t===3)return 1.08;   // 沙加速
  if(t===1)return 0.92;   // 深草略慢
  return 1;
};
W.hazardAt=function(x,y){
  const t=W.tileAt(x,y);
  if(t===4)return 1;      // 熔岩
  return 0;
};

// ---------- 地块绘制 ----------
function drawTile(ctx,tx,ty,t,s){
  const px=tx*TS,py=ty*TS;
  const h=(a,b)=>tileHash(tx+a,ty+b,s);
  if(t===0||t===5){
    ctx.fillStyle='#3f8f3a';ctx.fillRect(px,py,TS,TS);
    ctx.fillStyle='#49a043';
    for(let i=0;i<7;i++){const r=h(i,1);ctx.fillRect(px+((r*TS)|0),py+((h(i,2)*TS)|0),2,2);}
    ctx.fillStyle='#357a31';
    for(let i=0;i<4;i++){const r=h(i,3);ctx.fillRect(px+((r*TS)|0),py+((h(i,4)*TS)|0),2,1);}
    if(t===5){
      ctx.fillStyle='#ffd93d';ctx.fillRect(px+5,py+6,3,3);
      ctx.fillStyle='#ff6b8a';ctx.fillRect(px+4,py+5,1,1);ctx.fillRect(px+8,py+5,1,1);
      ctx.fillRect(px+4,py+9,1,1);ctx.fillRect(px+8,py+9,1,1);
    }
  }else if(t===1){
    ctx.fillStyle='#2f7a34';ctx.fillRect(px,py,TS,TS);
    ctx.fillStyle='#388a3c';
    for(let i=0;i<9;i++){const r=h(i,5);ctx.fillRect(px+((r*TS)|0),py+((h(i,6)*TS)|0),2,2);}
    ctx.fillStyle='#25662b';
    for(let i=0;i<5;i++){ctx.fillRect(px+((h(i,7)*TS)|0),py+((h(i,8)*TS)|0),1,3);}
  }else if(t===2){
    ctx.fillStyle='#2a6fb8';ctx.fillRect(px,py,TS,TS);
    ctx.fillStyle='#3a83cc';
    const w=(h(9,0)*2)|0;
    ctx.fillRect(px+((w+2)%TS),py+3,6,1);ctx.fillRect(px+((w+8)%TS),py+9,5,1);
    ctx.fillRect(px+((w+4)%TS),py+13,7,1);
    ctx.fillStyle='#1f5a9a';ctx.fillRect(px,py+TS-2,TS,2);
  }else if(t===3){
    ctx.fillStyle='#d8c080';ctx.fillRect(px,py,TS,TS);
    ctx.fillStyle='#c8b070';
    for(let i=0;i<6;i++)ctx.fillRect(px+((h(i,10)*TS)|0),py+((h(i,11)*TS)|0),2,1);
    ctx.fillStyle='#e8d898';
    for(let i=0;i<3;i++)ctx.fillRect(px+((h(i,12)*TS)|0),py+((h(i,13)*TS)|0),2,2);
  }else if(t===4){
    ctx.fillStyle='#c83a10';ctx.fillRect(px,py,TS,TS);
    ctx.fillStyle='#ff7a2d';
    const f=((Date.now()/240+tx*3+ty*5)|0)%TS;
    ctx.fillRect(px+2,py+((f+3)%TS),8,2);ctx.fillRect(px+((f+6)%TS),py+9,6,2);
    ctx.fillStyle='#ffd93d';ctx.fillRect(px+((h(14,0)*12)|0),py+((h(15,0)*12)|0),3,2);
  }else if(t===6){
    ctx.fillStyle='#8a8aa0';ctx.fillRect(px,py,TS,TS);
    ctx.fillStyle='#9a9ab0';ctx.fillRect(px+1,py+1,TS-2,TS-2);
    ctx.fillStyle='#6a6a80';ctx.fillRect(px,py,TS,1);ctx.fillRect(px,py,1,TS);
  }
}
function drawObj(ctx,tx,ty,o,s){
  const cx=tx*TS+TS/2,cy=ty*TS+TS;
  if(o===1)G.gfx.draw(ctx,'tree',cx,cy,{scale:1});
  else if(o===2)G.gfx.draw(ctx,'rock',cx,cy,{scale:1});
  else if(o===3)G.gfx.draw(ctx,'bush',cx,cy,{scale:1});
  else if(o===4){
    const t=(Date.now()/400)%1;
    G.gfx.draw(ctx,'spring',cx,cy,{scale:1,bob:Math.sin(t*6.28)*1.5});
  }
  else if(o===5)G.gfx.draw(ctx,'altar',cx,cy,{scale:1});
  else if(o===6){
    const k=tx+'_'+ty;
    G.gfx.draw(ctx,'chest',cx,cy,{scale:1});
  }
  else if(o===7){
    ctx.globalAlpha=0.55;G.gfx.draw(ctx,'trap',cx,cy,{scale:1});ctx.globalAlpha=1;
  }
}

W.bake=function(c){
  if(!c.dirty&&c.img)return c.img;
  const size=CS*TS;
  if(!c.img){c.img=document.createElement('canvas');c.img.width=size;c.img.height=size;}
  const ctx=c.img.getContext('2d');
  ctx.clearRect(0,0,size,size);
  for(let ty=0;ty<CS;ty++)for(let tx=0;tx<CS;tx++){
    drawTile(ctx,c.cx*CS+tx,c.cy*CS+ty,c.tiles[ty*CS+tx],W.seed);
  }
  for(let ty=0;ty<CS;ty++)for(let tx=0;tx<CS;tx++){
    const o=c.objs[ty*CS+tx];
    if(o)drawObj(ctx,c.cx*CS+tx,c.cy*CS+ty,o,W.seed);
  }
  c.dirty=false;
  return c.img;
};
})();

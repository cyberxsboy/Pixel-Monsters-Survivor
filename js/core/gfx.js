(function(){
'use strict';
const G=window.G,U=G.U;
const cache=Object.create(null);
const Gfx=G.gfx={sheets:{}};

// 解析像素网格 -> canvas
function bake(grid,pal){
  const h=grid.length,w=grid[0].length;
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const x=c.getContext('2d');
  for(let y=0;y<h;y++){const row=grid[y];
    for(let i=0;i<w;i++){const ch=row[i];if(ch==='.'||ch===' ')continue;
      const col=pal[ch];if(!col)continue;x.fillStyle=col;x.fillRect(i,y,1,1);}}
  return c;
}
function parseHex(h){
  h=h.replace('#','');
  if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function toHex(r,g,b){
  const c=v=>('0'+Math.round(U.clamp(v,0,255)).toString(16)).slice(-2);
  return '#'+c(r)+c(g)+c(b);
}
function rgb2hsl(r,g,b){
  r/=255;g/=255;b/=255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h,s,l=(mx+mn)/2;
  if(mx===mn){h=s=0;}else{const d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);
    switch(mx){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}
    h/=6;}
  return [h*360,s*100,l*100];
}
function hsl2rgb(h,s,l){
  h=((h%360)+360)%360;s/=100;l/=100;
  const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
  let r,g,b;
  if(h<60){r=c;g=x;b=0;}else if(h<120){r=x;g=c;b=0;}else if(h<180){r=0;g=c;b=x;}
  else if(h<240){r=0;g=x;b=c;}else if(h<300){r=x;g=0;b=c;}else{r=c;g=0;b=x;}
  return [(r+m)*255,(g+m)*255,(b+m)*255];
}
function shinyPal(pal){
  const out={};
  for(const k in pal){
    const [r,g,b]=parseHex(pal[k]);
    const [h,s,l]=rgb2hsl(r,g,b);
    const nh=(h+135)%360, ns=Math.min(100,s*1.25+12), nl=U.clamp(l*1.05+6,8,94);
    out[k]=hsl2rgb(nh,ns,nl).map(v=>Math.round(v)).join(','); // temp
    out[k]='#'+out[k].split(',').map(v=>('0'+(+v).toString(16)).slice(-2)).join('');
  }
  return out;
}

// 注册精灵：id -> {pal, grid, w, h}
Gfx.register=function(id,def){
  const w=def.grid[0].length,h=def.grid.length;
  const cN=bake(def.grid,def.pal);
  const cS=bake(def.grid,shinyPal(def.pal));
  Gfx.sheets[id]={n:cN,s:cS,w:w,h:h};
};
Gfx.registerMany=function(obj){for(const k in obj)Gfx.register(k,obj[k]);};

Gfx.sheet=function(id,shiny){const s=Gfx.sheets[id];if(!s)return null;return shiny?s.s:s.n;};
Gfx.size=function(id){const s=Gfx.sheets[id];return s?{w:s.w,h:s.h}:{w:16,h:16};};

// 绘制（以脚下中心为锚点）
Gfx.draw=function(ctx,id,x,y,o){
  o=o||{};
  const s=Gfx.sheets[id];if(!s)return;
  const sheet=o.shiny?s.s:s.n;
  const sc=o.scale==null?1:o.scale;
  const flip=!!o.flip;
  const w=s.w*sc,h=s.h*sc;
  const bob=o.bob||0;         // 上下浮动像素
  const lean=o.lean||0;       // 前倾位移
  const squash=o.squash==null?1:o.squash; // 纵向压缩
  const flash=o.flash||0;     // 0..1 白闪
  const alpha=o.alpha==null?1:o.alpha;
  const rot=o.rot||0;
  ctx.save();
  ctx.globalAlpha*=alpha;
  ctx.translate(x+lean,y+bob);
  if(rot)ctx.rotate(rot);
  if(squash!==1)ctx.scale(1,squash);
  if(flip)ctx.scale(-1,1);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(sheet,-w/2,-h,w,h);
  if(o.tint){
    ctx.globalCompositeOperation='source-atop';
    ctx.globalAlpha=alpha*(o.tintA==null?0.35:o.tintA);
    ctx.fillStyle=o.tint;
    ctx.fillRect(-w/2,-h,w,h);
  }
  if(flash>0){
    ctx.globalCompositeOperation='source-atop';
    ctx.globalAlpha=flash*0.85;
    ctx.fillStyle='#fff';
    ctx.fillRect(-w/2,-h,w,h);
  }
  ctx.restore();
};

// 阴影
Gfx.shadow=function(ctx,x,y,rx,alpha){
  ctx.save();
  ctx.globalAlpha=(alpha==null?0.32:alpha);
  ctx.fillStyle='#000';
  ctx.beginPath();ctx.ellipse(x,y,rx,rx*0.42,0,0,U.TAU);ctx.fill();
  ctx.restore();
};

// 像素矩形（整数像素对齐）
Gfx.rect=function(ctx,x,y,w,h,col){
  ctx.fillStyle=col;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
};

// 圆角面板
Gfx.panel=function(ctx,x,y,w,h,col,border){
  ctx.fillStyle=col||'rgba(12,16,38,.85)';
  const r=6;
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill();
  if(border){ctx.strokeStyle=border;ctx.lineWidth=2;ctx.stroke();}
};

// 伤害数字缓存的字体
Gfx.font=function(ctx,size,weight){
  ctx.font=(weight||'700')+' '+Math.round(size)+'px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
};
})();

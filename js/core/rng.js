(function(){
'use strict';
const G=window.G,U=G.U;
// mulberry32 确定性随机
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
G.RNG=function(seed){const r=mulberry32(seed>>>0);r.int=(a,b)=>a+Math.floor(r()*(b-a+1));r.range=(a,b)=>a+r()*(b-a);
  r.pick=arr=>arr[(r()*arr.length)|0];r.chance=p=>r()<p;r.shuffle=arr=>{const a=arr.slice();
    for(let i=a.length-1;i>0;i--){const j=(r()*(i+1))|0;const t=a[i];a[i]=a[j];a[j]=t;}return a;};
  r.wpick=items=>U.wpick(r,items);return r;};

// 值噪声（世界生成用）
function hash2(x,y,seed){
  let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(seed|0,1442695041);
  h=Math.imul(h^(h>>>13),1274126177);
  return ((h^(h>>>16))>>>0)/4294967296;
}
function smooth(t){return t*t*(3-2*t);}
function vnoise(x,y,seed){
  const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
  const a=hash2(xi,yi,seed),b=hash2(xi+1,yi,seed),c=hash2(xi,yi+1,seed),d=hash2(xi+1,yi+1,seed);
  const u=smooth(xf),v=smooth(yf);
  return U.lerp(U.lerp(a,b,u),U.lerp(c,d,u),v);
}
G.noise=(x,y,seed,oct)=>{
  oct=oct||3;let s=0,amp=1,f=1,tot=0;
  for(let i=0;i<oct;i++){s+=vnoise(x*f,y*f,seed+i*1013)*amp;tot+=amp;amp*=0.5;f*=2;}
  return s/tot;
};
G.hash2=hash2;
})();

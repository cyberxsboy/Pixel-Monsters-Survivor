(function(){
'use strict';
const G = window.G = window.G || {};
const U = G.U = {};

U.TAU = Math.PI*2;
U.clamp=(v,a,b)=>v<a?a:(v>b?b:v);
U.lerp=(a,b,t)=>a+(b-a)*t;
U.dist=(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
U.dist2=(x1,y1,x2,y2)=>{const dx=x2-x1,dy=y2-y1;return dx*dx+dy*dy;};
U.ang=(x1,y1,x2,y2)=>Math.atan2(y2-y1,x2-x1);
U.now=()=>performance.now();
U.pad2=n=>(n<10?'0':'')+n;
U.fmtTime=ms=>{ms=Math.max(0,ms|0);const s=(ms/1000)|0;return U.pad2((s/60)|0)+':'+U.pad2(s%60);};
U.fmtNum=n=>{n=Math.floor(n||0);const s=String(Math.abs(n));const o=s.replace(/\B(?=(\d{3})+(?!\d))/g,',');return (n<0?'-':'')+o;};
U.round=(v)=>Math.round(v);
U.el=id=>document.getElementById(id);
U.qs=s=>document.querySelector(s);
U.qsa=s=>Array.prototype.slice.call(document.querySelectorAll(s));
U.esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
U.sign=v=>v<0?-1:(v>0?1:0);
U.rand=(a,b)=>a+Math.random()*(b-a);
U.irand=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
U.chance=p=>Math.random()<p;
U.pick=arr=>arr[(Math.random()*arr.length)|0];
U.wpick=(rng,items)=>{let t=0;for(let i=0;i<items.length;i++)t+=items[i].w;let r=rng()*t;
  for(let i=0;i<items.length;i++){r-=items[i].w;if(r<=0)return items[i].v;}return items[items.length-1].v;};
U.shuffle=(rng,arr)=>{const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=(rng()*(i+1))|0;const t=a[i];a[i]=a[j];a[j]=t;}return a;};
U.uuid=()=>{const c='0123456789abcdef';let s='';for(let i=0;i<32;i++)s+=c[(Math.random()*16)|0];
  return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+s.slice(16,20)+'-'+s.slice(20);};
U.today=()=>{const d=new Date();return d.getFullYear()+'-'+U.pad2(d.getMonth()+1)+'-'+U.pad2(d.getDate());};
U.debounce=(fn,ms)=>{let t=0;return function(){const a=arguments,c=this;clearTimeout(t);t=setTimeout(()=>fn.apply(c,a),ms);};};

// 贝塞尔/缓动
U.easeOut=t=>1-Math.pow(1-t,3);
U.easeIn=t=>t*t*t;
U.easeInOut=t=>t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

U.on=(el,ev,fn,opt)=>{if(typeof el==='string')el=U.el(el);if(el)el.addEventListener(ev,opt||fn,typeof el==='string'?undefined:opt);};
U.delegate=(root,ev,sel,fn)=>{if(typeof root==='string')root=U.el(root);if(!root)return;
  root.addEventListener(ev,e=>{const t=e.target.closest(sel);if(t&&root.contains(t))fn(e,t);});};

// 简单事件总线
const bus={};
U.emit=(ev,data)=>{const l=bus[ev];if(l)for(let i=0;i<l.length;i++)l[i](data);};
U.on2=(ev,fn)=>{(bus[ev]=bus[ev]||[]).push(fn);return fn;};
U.off=(ev,fn)=>{const l=bus[ev];if(!l)return;const i=l.indexOf(fn);if(i>=0)l.splice(i,1);};
})();

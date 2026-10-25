// Node 冒烟/长跑测试共用的浏览器模拟环境
// createEnv({manualRaf:true}) → rAF 进入队列，由测试手动泵帧
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');

let recSink=null;   // 画布调用录制桶（测试用）

function makeCtx(){
  const g={addColorStop(){}};
  const rec=name=>(...a)=>{if(recSink)recSink.push({name,a,stack:new Error().stack});};
  return new Proxy({},{
    get(t,k){
      if(k in t)return t[k];
      if(k==='createRadialGradient'||k==='createLinearGradient')return ()=>g;
      if(k==='measureText')return ()=>({width:10});
      if(k==='getImageData')return ()=>({data:new Uint8ClampedArray(4)});
      if(k==='fillRect'||k==='clearRect'||k==='drawImage')return rec(k);
      return ()=>{};
    },
    set(t,k,v){t[k]=v;return true;}
  });
}
function makeEl(tag){
  const el={
    tagName:(tag||'div').toUpperCase(),
    style:{cssText:''},
    children:[],
    firstChild:null,
    width:16,height:16,
    _cls:new Set(),
    className:'',
    textContent:'',
    innerHTML:'',
    value:'',checked:false,disabled:false,files:[],
    offsetWidth:100,
    classList:{
      add(c){el._cls.add(c);},remove(c){el._cls.delete(c);},
      toggle(c,f){if(f===undefined)f=!el._cls.has(c);f?el._cls.add(c):el._cls.delete(c);return f;},
      contains(c){return el._cls.has(c);}
    },
    appendChild(c){el.children.push(c);el.firstChild=el.children[0];c.parentNode=el;return c;},
    removeChild(c){const i=el.children.indexOf(c);if(i>=0)el.children.splice(i,1);return c;},
    remove(){if(el.parentNode)el.parentNode.removeChild(el);},
    addEventListener(){},removeEventListener(){},
    querySelector(){return makeEl('div');},
    querySelectorAll(){return [];},
    getContext(){return el._ctx||(el._ctx=makeCtx());},
    getBoundingClientRect(){return {left:0,top:0,width:120,height:120,right:120,bottom:120};},
    focus(){},select(){},click(){},
    setAttribute(){},getAttribute(){return null;},
    closest(){return null;}
  };
  return el;
}

const SCRIPTS=[
  'js/core/util.js','js/core/rng.js','js/core/input.js','js/core/audio.js','js/core/save.js','js/core/gfx.js',
  'js/data/types.js','js/data/sprites.js','js/data/monsters.js','js/data/moves.js','js/data/enemies.js','js/data/upgrades.js',
  'js/world/world.js','js/entities/fx.js','js/entities/projectile.js','js/entities/pickup.js',
  'js/entities/player.js','js/entities/enemy.js',
  'js/systems/combat.js','js/systems/spawner.js','js/systems/levelup.js','js/systems/boss.js','js/systems/gacha.js',
  'js/ui/ui.js','js/ui/hud.js','js/ui/menu.js','js/game.js'
];

function createEnv(opts){
  opts=opts||{};
  const elCache=Object.create(null);
  const document={
    readyState:'complete',
    getElementById(id){return elCache[id]||(elCache[id]=makeEl('div'));},
    createElement(tag){return makeEl(tag);},
    querySelector(){return makeEl('div');},
    querySelectorAll(){return [];},
    addEventListener(){},removeEventListener(){},
    body:makeEl('body'),
    elementFromPoint(){return null;}
  };
  const rafQ=[];
  const rafFn=opts.manualRaf
    ? fn=>{rafQ.push(fn);return rafQ.length;}
    : fn=>setTimeout(()=>fn(Date.now()),16);
  const listeners={};
  const window={
    document,
    addEventListener(ev,fn){(listeners[ev]=listeners[ev]||[]).push(fn);},
    removeEventListener(){},
    innerWidth:960,innerHeight:540,devicePixelRatio:1,
    performance:{now:()=>Date.now()},
    requestAnimationFrame:rafFn,
    cancelAnimationFrame(){},
    AudioContext:null,webkitAudioContext:null,
    localStorage:{_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=v;},removeItem(k){delete this._d[k];}},
    navigator:{maxTouchPoints:0,userAgent:'node'},
    location:{href:'http://localhost/',search:'',protocol:'http:'},
    confirm(){return false;},
    fetch(){return Promise.reject(new Error('offline'));},
    setTimeout,clearTimeout,setInterval,clearInterval,console,Date,Math,JSON,Object,Array,String,Number,Boolean,Error,Promise,Proxy,Reflect,Uint8Array,Uint8ClampedArray,Map,Set,isNaN,parseInt,parseFloat,encodeURIComponent,decodeURIComponent
  };
  window.window=window;window.self=window;
  const ctxObj=vm.createContext(Object.assign(window,{
    document,console,window,self:window,globalThis:window,
    performance:window.performance,localStorage:window.localStorage,
    navigator:window.navigator,location:window.location,
    requestAnimationFrame:rafFn,
    setTimeout,clearTimeout,setInterval,clearInterval,
    fetch:window.fetch,confirm:window.confirm
  }));
  return {ctxObj,window,document,elCache,rafQ,listeners};
}

function loadScripts(ctxObj,root){
  for(const f of SCRIPTS){
    const code=fs.readFileSync(path.join(root,f),'utf8');
    vm.runInContext(code,ctxObj,{filename:f});
  }
}

module.exports=createEnv;
module.exports.SCRIPTS=SCRIPTS;
module.exports.loadScripts=loadScripts;
module.exports.setRec=v=>{recSink=v;};
module.exports.recSink=()=>recSink;

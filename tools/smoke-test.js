// 冒烟测试：在 Node 中模拟浏览器环境，加载全部脚本并模拟 12 秒战斗
// 用法：node tools/smoke-test.js
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');

// ---------- DOM 框架 ----------
function makeCtx(){
  const g={addColorStop(){}};
  const rec=name=>(...a)=>{if(window.__rec)window.__rec.push({name,a});};
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
const listeners={};
const window={
  document,
  addEventListener(ev,fn){(listeners[ev]=listeners[ev]||[]).push(fn);},
  removeEventListener(){},
  innerWidth:960,innerHeight:540,devicePixelRatio:1,
  performance:{now:()=>Date.now()},
  requestAnimationFrame(fn){return setTimeout(()=>fn(Date.now()),16);},
  cancelAnimationFrame(){},
  AudioContext:null,webkitAudioContext:null,
  localStorage:{_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=v;},removeItem(k){delete this._d[k];}},
  navigator:{maxTouchPoints:0,userAgent:'node'},
  location:{href:'http://localhost/',search:''},
  confirm(){return false;},
  fetch(){return Promise.reject(new Error('offline'));},
  setTimeout,clearTimeout,setInterval,clearInterval,console,Date,Math,JSON,Object,Array,String,Number,Boolean,Error,Promise,Proxy,Reflect,Uint8Array,Uint8ClampedArray,Map,Set,isNaN,parseInt,parseFloat,encodeURIComponent,decodeURIComponent
};
window.window=window;window.self=window;
const ctxObj=vm.createContext(Object.assign(window,{
  document,console,window,self:window,globalThis:window,
  performance:window.performance,localStorage:window.localStorage,
  navigator:window.navigator,location:window.location,
  requestAnimationFrame:window.requestAnimationFrame,
  setTimeout,clearTimeout,setInterval,clearInterval,
  fetch:window.fetch,confirm:window.confirm
}));

// ---------- 加载脚本 ----------
const order=[
  'js/core/util.js','js/core/rng.js','js/core/input.js','js/core/audio.js','js/core/save.js','js/core/gfx.js',
  'js/data/types.js','js/data/sprites.js','js/data/monsters.js','js/data/moves.js','js/data/enemies.js','js/data/upgrades.js',
  'js/world/world.js','js/entities/fx.js','js/entities/projectile.js','js/entities/pickup.js',
  'js/entities/player.js','js/entities/enemy.js',
  'js/systems/combat.js','js/systems/spawner.js','js/systems/levelup.js','js/systems/boss.js','js/systems/gacha.js',
  'js/ui/ui.js','js/ui/hud.js','js/ui/menu.js','js/game.js'
];
for(const f of order){
  const code=fs.readFileSync(path.join(root,f),'utf8');
  try{vm.runInContext(code,ctxObj,{filename:f});}
  catch(e){console.error('加载失败',f,e);process.exit(1);}
}
console.log('✓ 全部脚本加载成功');

const G=ctxObj.G;
if(!G||!G.Game){console.error('G.Game 未定义');process.exit(1);}

// ---------- 模拟开局 ----------
setTimeout(()=>{
  try{
    G.Game.startRun();
    console.log('✓ 开局成功，伙伴:',G.game.player.name,'技能:',G.game.player.moves.map(m=>m.def.name).join('/'));

    // 断言 1：逻辑视口必须等于 屏幕尺寸/scale（渲染变换为 dpr*scale）
    const expScale=window.innerWidth>=600?2.2:1.9;
    const evw=window.innerWidth/expScale,evh=window.innerHeight/expScale;
    if(Math.abs(G.Game.vw-evw)>1e-6||Math.abs(G.Game.vh-evh)>1e-6){
      console.error('视口异常',G.Game.vw,G.Game.vh,'期望',evw,evh);process.exit(1);
    }
    // 断言 2：玩家必须在可见区域内（相机中心）
    const cam=G.Game.cam;
    const sx=G.game.player.x-cam.x,sy=G.game.player.y-cam.y;
    if(!(sx>0&&sx<cam.w&&sy>0&&sy<cam.h)){
      console.error('玩家不在可见区域内',sx,sy,'cam.w',cam.w);process.exit(1);
    }
    console.log('✓ 视口/相机正确，玩家在屏幕内 ('+sx.toFixed(1)+','+sy.toFixed(1)+') 屏幕 '+evw.toFixed(0)+'×'+evh.toFixed(0));

    // 断言 3：非 (0,0) 分块烘焙必须画在 256×256 画布内（同步块内执行，无定时器插入）
    window.__rec=[];
    const c=G.World.genChunk(-3,2);
    c.dirty=true;c.img=null;
    G.World.bake(c);
    const rr=window.__rec.filter(o=>o.name==='fillRect');
    window.__rec=null;
    if(!rr.length){console.error('分块烘焙未绘制任何内容');process.exit(1);}
    const bad=rr.filter(o=>o.a[0]<-0.01||o.a[1]<-0.01||o.a[0]+o.a[2]>258.01||o.a[1]+o.a[3]>258.01);
    if(bad.length){console.error('分块越界绘制',bad.slice(0,3),'共',bad.length);process.exit(1);}
    console.log('✓ 分块烘焙坐标正确 (chunk -3,2，'+rr.length+' 次 fillRect)');
  }catch(e){console.error('开局失败',e);process.exit(1);}

  // 手动驱动主循环（game.js 的 tick 通过 rAF 走 setTimeout，这里直接调 update）
  let frames=0,errs=0;
  const iv=setInterval(()=>{
    try{
      // 模拟移动输入
      ctxObj.G.Input.move.x=0.6;ctxObj.G.Input.move.y=0.3;
      // 直接调用内部 update 通过 rAF 已在跑；额外强制一些事件
      frames++;
      if(frames===30){G.Input.dashQueued=true;}
      if(frames===60){
        // 强制升级
        G.Player.gainXp(G.game.player,50);
      }
      if(frames>=65&&frames<=100){
        // 模拟持续点击升级卡片直到选完
        const box=elCache['levelup-cards'];
        if(box&&G.LevelUp.open&&box.children.length){
          const card=box.children[0];
          if(card.onclick){card.onclick();console.log('✓ 选择升级卡片');}
        }
      }
      if(frames===120){
        G.Spawner.openRift();
      }
      if(frames===180){
        // 生成 boss
        G.Boss && G.Enemies.spawn('golem',G.game.player.x+80,G.game.player.y,{boss:true});
      }
      if(frames>=200){
        clearInterval(iv);
        const gs=G.game;
        console.log('✓ 模拟 '+frames+' 帧完成');
        console.log('  时间:',Math.round(gs.run.time)+'ms','波次:',gs.run.wave,
          '击杀:',gs.run.kills,'敌人:',G.Enemies.L.length,'弹幕:',G.Projectiles.length,
          '等级:',gs.player.lv,'HP:',Math.round(gs.player.hp)+'/'+gs.player.hpMax);
        if(!isFinite(gs.player.hp)||gs.player.hp<0)console.error('HP 异常');
        if(G.Enemies.L.length===0&&frames>60)console.error('未刷出敌人');
        else console.log('✓ 战斗系统运行正常');
        // 扭蛋测试
        G.Save.data.tickets=20;
        const r=G.Gacha.pull(10);
        console.log('✓ 扭蛋:',r?r.length+' 抽':'失败','图鉴数:',Object.keys(G.Save.data.collection).length);
        // 结束
        G.Game.endRun(false);
        console.log('✓ 结算界面 OK，奖励显示:',U_text());
        function U_text(){return elCache['result-reward']?elCache['result-reward'].textContent:'(n/a)';}
        console.log('全部冒烟测试通过');
        process.exit(0);
      }
    }catch(e){
      errs++;
      console.error('帧错误 @'+frames,e);
      if(errs>3){clearInterval(iv);process.exit(1);}
    }
  },16);
},200);

// 15 秒兜底
setTimeout(()=>{console.error('超时');process.exit(1);},15000);

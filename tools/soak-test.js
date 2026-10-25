// 长跑测试：手动泵帧模拟 15+ 分钟实战，捕捉偶发卡死/异常/移动失效
// 用法：node tools/soak-test.js        （SOAK_MIN=8 可缩短）
'use strict';
const path=require('path');
const createEnv=require('./env');
const root=path.join(__dirname,'..');

// ---- 定时器泵（必须在 createEnv 之前：VM 上下文在建环境时捕获 setTimeout 引用）----
let now=1000;
let timerSeq=0;
const timers=[];
const realSetTimeout=globalThis.setTimeout;
const realClearTimeout=globalThis.clearTimeout;
const realSetInterval=globalThis.setInterval;
const realClearInterval=globalThis.clearInterval;
globalThis.setTimeout=function(fn,ms){timers.push({id:++timerSeq,due:now+(ms||0),every:0,fn:fn});return timerSeq;};
globalThis.setInterval=function(fn,ms){timers.push({id:++timerSeq,due:now+(ms||0),every:ms||1,fn:fn});return timerSeq;};
globalThis.clearTimeout=globalThis.clearInterval=function(id){
  const t=timers.find(x=>x.id===id);if(t)t.cancelled=true;
};
function pumpTimers(){
  for(const t of timers){
    if(t.cancelled||t.done)continue;
    if(now>=t.due){
      try{t.fn();}catch(e){failNow('定时器回调抛异常: '+(e.stack||e));}
      if(t.every)t.due=now+t.every;else t.done=true;
    }
  }
  if(timers.length>500)for(let k=timers.length-1;k>=0;k--)if(timers[k].done||timers[k].cancelled)timers.splice(k,1);
}

const {ctxObj,window,document,elCache,rafQ}=createEnv({manualRaf:true});
try{createEnv.loadScripts(ctxObj,root);}
catch(e){console.error('加载失败',e);process.exit(1);}
const G=ctxObj.G;
if(!G||!G.Game){console.error('G.Game 未定义');process.exit(1);}

// ---- 捕获安全网日志（[game] update/render 异常）----
const gameErrs=[];
const realErr=console.error;
console.error=function(){
  const s=String(arguments[0]==null?'':arguments[0]);
  if(s.indexOf('[game]')===0)gameErrs.push(s+' | '+(arguments[1]&&arguments[1].stack||arguments[1]||''));
  realErr.apply(console,arguments);
};

const STEP=16.67;
const TARGET_MIN=parseFloat(process.env.SOAK_MIN||'16');
const totalFrames=Math.round(TARGET_MIN*60*1000/STEP);
let fatal=null,fail=null;
function failNow(msg){if(!fail){fail=msg;realErr('\n[soak] ✗ FAIL: '+msg);}}
function frame(){
  now+=STEP;
  const q=rafQ.splice(0,rafQ.length);
  for(const fn of q)fn(now);
  pumpTimers();
}
function frameSafe(){
  try{frame();return true;}catch(e){fatal=fatal||e;return false;}
}

// ---- 卡死状态转储 ----
function dump(p){
  const mv=G.Input.move;
  const spd=126*p.baseSpd*p.spdMul*G.World.speedAt(p.x,p.y);
  const S=(dx,dy)=>G.World.hitSolid(p.x+dx,p.y+dy,p.r*0.72);
  let tiles='';
  for(let ty=-2;ty<=2;ty++){
    let row='';
    for(let tx=-2;tx<=2;tx++){
      const t=G.World.tileAt(p.x+tx*16,p.y+ty*16);
      const o=G.World.objAt(p.x+tx*16,p.y+ty*16);
      row+=(t===2?'W':t===4?'D':t===3?'s':t===1?'g':'.');
      row+=(o===1?'T':o===2?'R':o===6?'C':o===7?'v':o===0?'.':o);
    }
    tiles+=row+' ';
  }
  return JSON.stringify({
    dead:p.dead,hp:Math.round(p.hp),lv:p.lv,
    mvx:+mv.x.toFixed(2),mvy:+mv.y.toFixed(2),
    keyR:!!G.Input.keys.right,dashQueued:!!G.Input.dashQueued,
    spd:+spd.toFixed(1),baseSpd:+p.baseSpd.toFixed(2),spdMul:+p.spdMul.toFixed(2),
    dashT:+p.dashT.toFixed(2),inv:+p.inv.toFixed(2),
    hitR:S(1,0),hitL:S(-1,0),hitU:S(0,-1),hitD:S(0,1),
    pos:[Math.round(p.x),Math.round(p.y)],tiles:tiles,
    lvOpen:G.LevelUp.open,queue:G.LevelUp.queue,
    ended:G.Game.run.ended,weather:G.Game.weather&&G.Game.weather.id,
    timersLive:timers.filter(t=>!t.done&&!t.cancelled).length
  });
}

const stats={frames:0,levelups:0,bless:0,pauses:0,restarts:0,bosses:0,
  moveSkip:0,moveStuck:0,lvStuck:0,blStuck:0,deadStuck:0,
  pausedAt:-1,_mx:0,_my:0};
const keys=G.Input.keys;
const DIRS=[['up'],['down'],['left'],['right'],['left','up'],['right','down'],['left','down'],['right','up']];

// 预创建面板元素（elCache 惰性）
document.getElementById('screen-levelup');
const blessEl=document.getElementById('screen-bless');

G.Game.startRun();
if(G.Game.state!=='playing')failNow('开局后 state='+G.Game.state);

for(let i=0;i<totalFrames&&!fatal&&!fail;i++){
  stats.frames++;
  const gs=G.Game,p=gs.player;

  // 死亡进入结算 → 重开
  if(gs.state==='result'){G.Game.startRun();stats.restarts++;continue;}

  // 死亡滞留探针：dead=true 而 state 仍 playing 超 5 秒 → endRun 链断了
  if(p&&p.dead&&gs.state==='playing'){
    if(++stats.deadStuck>300)failNow('玩家 dead 但结算未触发（endRun 链断）: '+dump(p));
  }else stats.deadStuck=0;

  // 上帝模式：每 5 秒回满，保证长跑不因死亡中断（只测稳定性）
  if(i%300===0&&p&&!p.dead&&p.hp<p.hpMax)p.hp=p.hpMax;

  // ---- 输入（探针窗口的方向由下方移动探针决定）----
  const inProbe=(i%2000)<120;
  if(!inProbe&&i%40===0){
    for(const k of ['up','down','left','right'])keys[k]=false;
    const d=DIRS[(i/40|0)%DIRS.length];
    for(const k of d)keys[k]=true;
  }
  // 冲刺避开移动探针前后 40 帧
  if(i%70===13&&(i%2000)>160&&(i%2000)<1960)G.Input.dashQueued=true;
  if(i%90===7)G.Input.slot=(i/90|0)%4;

  // ---- 暂停/恢复（按真实状态配对）----
  if(i%3000===1500&&gs.state==='playing'&&!inProbe&&!G.LevelUp.open){
    G.Input.paused=true;stats.pauses++;stats.pausedAt=i;
  }else if(i%3000===1505&&stats.pausedAt>=0&&gs.state==='pause'){
    G.Input.paused=true;stats.pausedAt=-1;
  }

  // ---- 升级面板：卡死探针 ----
  if(G.LevelUp.open){
    const box=elCache['levelup-cards'];
    if(box&&box.children.length&&box.children[0].onclick){
      try{box.children[0].onclick();stats.levelups++;stats.lvStuck=0;}
      catch(e){failNow('升级卡片 onclick 抛异常: '+(e.stack||e));}
    }else if(++stats.lvStuck>600){
      failNow('升级面板卡死 >10s：open=true 但无可用卡片 (cards='+(box?box.children.length:'无元素')+') '+dump(p));
    }
  }else stats.lvStuck=0;

  // ---- 祝福面板：卡死探针 ----
  if(!blessEl.classList.contains('hidden')){
    const b=elCache['bless-cards'];
    if(b&&b.children.length&&b.children[0].onclick){
      try{b.children[0].onclick();stats.bless++;stats.blStuck=0;}
      catch(e){failNow('祝福卡片 onclick 抛异常: '+(e.stack||e));}
    }else if(++stats.blStuck>600){
      failNow('祝福面板卡死 >10s：可见但无可用卡片 '+dump(p));
    }
  }else stats.blStuck=0;

  // ---- Boss 自然刷新（2 分钟一只）→ 快速击杀走祝福流程 ----
  try{
    if(G.Boss.active&&i%15===0)G.Boss.active.hp-=9999;
    if(i>1200&&i%3600===0)G.Spawner.openRift();
  }catch(e){failNow('Boss/裂隙事件抛异常: '+(e.stack||e));}

  // ---- 渲染探针：每 500 帧录制一帧 ----
  const probe=(i%500===0);
  if(probe)createEnv.setRec([]);
  const errsBefore=gameErrs.length;
  frameSafe();
  if(gameErrs.length>errsBefore)failNow('安全网捕获 update/render 异常: '+gameErrs[gameErrs.length-1].slice(0,600));
  if(probe){
    const calls=createEnv.recSink()||[];
    createEnv.setRec(null);
    if(!calls.length)failNow('渲染零绘制 @frame '+i+' (state='+gs.state+')');
    else{
      const nf=calls.filter(o=>o.a.some(v=>typeof v==='number'&&!isFinite(v)));
      if(nf.length)failNow('渲染参数非有限值: '+JSON.stringify({name:nf[0].name,args:nf[0].a.map(v=>typeof v==='number'?v:'obj')}));
    }
  }

  // ---- 移动探针：选初始畅通方向按住 120 帧，位移 <1px 连续 3 次 = 移动失效 ----
  if(inProbe){
    if(G.LevelUp.open||!blessEl.classList.contains('hidden')||gs.state!=='playing'||p.dashT>0.05){
      stats.moveSkip++;
    }else if(i%2000===0){
      stats._mx=p.x;stats._my=p.y;stats._dir=null;
      const cands=[['right',1,0],['left',-1,0],['down',0,1],['up',0,-1]];
      for(const[c,dx,dy]of cands){
        if(!G.World.hitSolid(p.x+dx*2,p.y+dy*2,p.r*0.72)){stats._dir=c;break;}
      }
      for(const k of ['up','down','left','right'])keys[k]=false;
      if(stats._dir)keys[stats._dir]=true;
      else failNow('四面全部锁死（真·脱困失败）: '+dump(p));
    }else if(i%2000===119){
      const d=Math.abs(p.x-stats._mx)+Math.abs(p.y-stats._my);
      if(stats.moveSkip>0)stats.moveSkip=0;
      else if(d<1){
        if(++stats.moveStuck>=3)failNow('方向键移动失效：连续 3 次按'+(stats._dir||'?')+' 2 秒位移='+d.toFixed(3)+' '+dump(p));
      }else stats.moveStuck=0;
    }
  }

  if(i%5000===0)realErr('[soak] '+(i*STEP/1000).toFixed(1)+'/'+TARGET_MIN+'min state='+gs.state+
    ' lv='+p.lv+' kills='+gs.run.kills+' 敌='+G.Enemies.L.length+' 弹='+G.Projectiles.length+
    ' 开卡='+stats.levelups+' 祝福='+stats.bless+' 重开='+stats.restarts);
}

globalThis.setTimeout=realSetTimeout;
globalThis.clearTimeout=realClearTimeout;
globalThis.setInterval=realSetInterval;
globalThis.clearInterval=realClearInterval;
console.error=realErr;
if(fatal){realErr('\n[soak] ✗ 未捕获异常(主循环外):\n'+(fatal.stack||fatal));process.exit(1);}
if(fail)process.exit(1);
if(gameErrs.length){realErr('\n[soak] ✗ 安全网异常 '+gameErrs.length+' 条:\n'+gameErrs.join('\n'));process.exit(1);}

console.log('✓ soak 全部通过');
console.log('  模拟时长:',(stats.frames*STEP/1000/60).toFixed(1),'分钟','帧数:',stats.frames);
console.log('  开卡:',stats.levelups,'祝福:',stats.bless,'暂停:',stats.pauses,'重开:',stats.restarts,
  'Boss讨伐:',G.Game.run.bossKillsDone,'裂隙传说:',G.Game.run.legendDone||0);
console.log('  安全网异常: 0');
process.exit(0);

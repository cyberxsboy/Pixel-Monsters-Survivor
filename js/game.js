(function(){
'use strict';
const G=window.G,U=G.U;
const Game=G.Game={};G.game=Game;
let canvas,ctx,last=0,acc=0,running=false;
const STEP=1/60;

Game.state='boot';

function resize(){
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const w=window.innerWidth,h=window.innerHeight;
  canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);
  canvas.style.width=w+'px';canvas.style.height=h+'px';
  const q=G.Save.data?G.Save.data.settings.quality:'auto';
  let scale=2;
  if(q==='high')scale=2.5;
  else if(q==='low')scale=1.6;
  else scale=w<600?1.9:2.2;
  Game.scale=scale;
  Game.vw=w*scale;Game.vh=h*scale;
  if(ctx)ctx.setTransform(dpr,0,0,dpr,0,0);
}

Game.init=function(){
  canvas=U.el('game');ctx=canvas.getContext('2d',{alpha:false});
  Game.enemies=G.Enemies.L;   // 稳定数组引用（reset 只清空内容）
  G.Save.load();
  G.Save.data.settings=G.Save.data.settings||{vol:70,music:true,dmgnum:true,shake:true,quality:'auto'};
  G.Audio.setVolume(G.Save.data.settings.vol/100);
  G.Audio.setMusic(G.Save.data.settings.music);
  resize();
  window.addEventListener('resize',resize);
  // 标题精灵
  drawTitleMon();
  G.UI.show('title');
  // 首次交互后初始化音频
  const boot=()=>{G.Audio.init();G.Audio.resume();G.Audio.playSong('menu');document.removeEventListener('pointerdown',boot);document.removeEventListener('keydown',boot);};
  document.addEventListener('pointerdown',boot);
  document.addEventListener('keydown',boot);
  // 云同步
  G.Save.pull().finally(()=>G.Menu.refresh());
  G.Menu.refresh();
  requestAnimationFrame(tick);
};

function drawTitleMon(){
  const cv=U.el('title-mon');if(!cv)return;
  const c=cv.getContext('2d');c.imageSmoothingEnabled=false;
  let t=0;
  (function anim(){
    t+=0.02;
    const sp=G.mon(G.Save.data.mon)||G.mon('flame1');
    const sheet=G.gfx.sheet(sp.sprite,G.Save.data.shiny);
    c.clearRect(0,0,64,64);
    if(sheet)c.drawImage(sheet,0,Math.sin(t)*2,64,64);
    if(!U.el('screen-title').classList.contains('hidden'))requestAnimationFrame(anim);
  })();
}

Game.startRun=function(){
  const s=G.Save.data;
  G.Audio.init();G.Audio.resume();
  if(!G.SPECIES[s.mon])s.mon='flame1';
  Game.rng=G.RNG((Math.random()*1e9)>>>0);
  G.World.reset((Math.random()*1e9)>>>0);
  G.Enemies.reset();G.Projectiles.reset();G.Pickups.reset();G.FX.reset();
  G.Spawner.reset();G.Boss.reset();G.LevelUp.reset();
  Game.save=s;
  Game.settings=s.settings;
  Game.quality=s.settings.quality==='low'?0:1;
  const p=G.Player.reset(s.mon,s.shiny);
  Game.player=p;
  Game.cam={x:p.x-Game.vw/2,y:p.y-Game.vh/2,w:Game.vw,h:Game.vh};
  Game.shake=0;
  Game.run={time:0,wave:1,kills:0,gold:0,dmg:0,bossMode:false,bossKills:[],bossKillsDone:0,
    legendsDone:0,win:false,ended:false};
  s.stats.runs++;
  Game.weather=null;Game.weatherT=40+Math.random()*40;
  G.Save.track('first',0);
  G.Save.save();
  G.UI.hideAll();
  U.el('screen-levelup').classList.add('hidden');
  U.el('screen-bless').classList.add('hidden');
  G.HUD.show(true);
  G.HUD.refreshMon();
  G.HUD.dirty=true;
  G.Audio.playSong('field');
  Game.state='playing';
  running=true;
};

Game.pause=function(){
  if(Game.state!=='playing')return;
  Game.state='pause';
  const gs=Game,p=gs.player;
  U.el('pause-stats').innerHTML=
    cell(U.fmtTime(gs.run.time),'生存时间')+cell(p.lv,'等级')+
    cell(gs.run.kills,'击杀')+cell('●'+gs.run.gold,'金币')+
    cell(gs.run.wave,'波次')+(G.Boss.active?cell(G.Boss.active.name,'头目进行中'):'');
  U.el('screen-pause').classList.remove('hidden');
  G.Audio.playSong('menu');
};
function cell(v,k){return '<div class="stat-cell"><div class="v">'+v+'</div><div class="k">'+k+'</div></div>';}
Game.resume=function(){
  U.el('screen-pause').classList.add('hidden');
  if(U.el('screen-settings').classList.contains('hidden')){}
  G.UI.hideAll();
  G.HUD.show(true);
  Game.state='playing';
  G.Audio.playSong(G.Boss.active?'boss':'field');
};

Game.onPlayerDeath=function(){
  if(Game.run.ended)return;
  G.Audio.sfx('lose');
  setTimeout(()=>Game.endRun(false),600);
};
Game.winLegend=function(){
  Game.save.stats.legends++;
  Game.save.gems+=30;
  Game.save.tickets+=2;
  G.Save.save();
  G.UI.toast('传说精灵讨伐奖励：◆30 ✦2','good');
};

Game.endRun=function(win){
  const gs=Game;
  if(gs.run.ended)return;
  gs.run.ended=true;
  gs.state='result';
  running=false;
  const s=gs.save,p=gs.player;
  const time=gs.run.time;
  // 最佳
  if(time>(s.stats.bestMs||0)){s.stats.bestMs=time;s.stats.bestMon=p.monId;}
  if(win)s.stats.wins=(s.stats.wins||0)+1;
  // 奖励
  const gems=Math.floor(time/60000*2)+gs.run.bossKillsDone*5+(win?50:0);
  const tickets=Math.floor(time/300000)+gs.run.bossKillsDone;
  s.gems+=gems;s.tickets+=tickets;
  s.coins+=gs.run.gold;
  G.Save.track('bestRunMs',time);
  G.Save.track('bestLv',p.lv);
  if(win)G.Save.track('win',1);
  G.Save.save();
  G.UI.hideLevelUp();G.UI.hideBless();
  // 结算界面
  U.el('result-title').textContent=win?'通关成功！':'冒险结束';
  const cv=U.el('result-face');
  const sheet=G.gfx.sheet(p.sprite,p.shiny);
  if(sheet){const c=cv.getContext('2d');c.clearRect(0,0,64,64);c.imageSmoothingEnabled=false;c.drawImage(sheet,0,0,64,64);}
  U.el('result-stats').innerHTML=
    cell(U.fmtTime(time),'生存时间')+cell(p.lv,'最终等级')+
    cell(gs.run.kills,'击杀')+cell(gs.run.bossKillsDone,'头目')+
    cell('●'+gs.run.gold,'金币获得')+cell(U.fmtNum(gs.run.dmg),'总伤害');
  U.el('result-reward').textContent='奖励：◆'+gems+' 钻石　✦'+tickets+' 扭蛋券'+(win?'　+50 通关':'');
  U.el('screen-result').classList.remove('hidden');
  G.HUD.show(false);
  G.Audio.playSong(win?'win':'menu');
  // 提交排行（单人）
  try{
    G.Save.api('/api/rank',{token:s.device,nick:s.nick||'幸存者',
      mon:G.SPECIES[p.monId]?G.SPECIES[p.monId].name:'',ms:Math.floor(time)}).catch(()=>{});
  }catch(e){}
};

// 暂停键由 input.js 置位 I.paused，这里统一消费（避免双重处理）
function checkPause(){
  if(G.Input.paused){
    G.Input.paused=false;
    if(Game.state==='playing')Game.pause();
    else if(Game.state==='pause')Game.resume();
  }
}

// ---------- 主循环 ----------
function tick(now){
  requestAnimationFrame(tick);
  const dt=Math.min(0.1,(now-last)/1000||0);
  last=now;
  checkPause();
  if(Game.state==='playing'&&running){
    update(dt);
  }
  if(Game.state==='playing'||Game.state==='pause'||Game.state==='result'){
    render();
  }
}

function update(dt){
  const gs=Game,p=gs.player;
  // 选择强化/祝福时暂停战斗模拟（画面继续渲染）
  if(G.LevelUp.open||!U.el('screen-bless').classList.contains('hidden'))return;
  G.Player.update(dt);
  G.Enemies.update(dt);
  G.Projectiles.update(dt);
  G.Pickups.update(dt);
  G.FX.update(dt);
  G.Spawner.update(dt);
  G.LevelUp.update(dt);
  // 天气
  gs.weatherT-=dt;
  if(gs.weatherT<=0){
    gs.weather=G.rng.pick(G.Types.WEATHER);
    gs.weatherT=45+Math.random()*50;
    G.UI.banner(gs.weather.icon+' '+gs.weather.n);
  }
  // 相机
  const lerp=1-Math.pow(0.001,dt);
  gs.cam.x+=(p.x-gs.cam.w/2-gs.cam.x)*lerp;
  gs.cam.y+=(p.y-gs.cam.h/2-gs.cam.y)*lerp;
  if(gs.shake>0){
    gs.shake=Math.max(0,gs.shake-dt*22);
    gs.cam.x+=(Math.random()*2-1)*gs.shake;
    gs.cam.y+=(Math.random()*2-1)*gs.shake;
  }
  // 通关判定
  if(gs.run.time>=15*60*1000&&!gs.run.win){
    gs.run.win=true;
    G.UI.banner('生存 15 分钟 · 通关！');
    G.Audio.sfx('win');
    G.Save.data.stats.wins=(G.Save.data.stats.wins||0)+0; // 通关计数在 endRun
  }
  G.HUD.update();
}

function render(){
  const gs=Game,p=gs.player,cam=gs.cam;
  cam.w=Game.vw;cam.h=Game.vh;
  const w=window.innerWidth,h=window.innerHeight;
  ctx.setTransform(1,0,0,1,0,0);
  const dpr=Math.min(2,window.devicePixelRatio||1);
  ctx.setTransform(dpr*Game.scale,0,0,dpr*Game.scale,0,0);
  // 背景
  ctx.fillStyle='#0d1226';
  ctx.fillRect(0,0,cam.w,cam.h);

  // 地形分块
  const TS=G.World.TS,CS=G.World.CS,CH=TS*CS;
  const x0=Math.floor(cam.x/CH)-1,y0=Math.floor(cam.y/CH)-1;
  const x1=Math.ceil((cam.x+cam.w)/CH)+1,y1=Math.ceil((cam.y+cam.h)/CH)+1;
  ctx.imageSmoothingEnabled=false;
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){
    const c=G.World.genChunk(cx,cy);
    const img=G.World.bake(c);
    if(img)ctx.drawImage(img,cx*CH-cam.x,cy*CH-cam.y);
  }

  // 世界物件（裂隙）
  G.Spawner.draw(ctx,cam);
  G.FX.drawGround(ctx,cam);
  G.Pickups.draw(ctx,cam);
  G.Enemies.draw(ctx,cam);
  if(p&&!p.dead)G.Player.draw(ctx,cam);
  G.Projectiles.draw(ctx,cam);
  G.FX.draw(ctx,cam);

  // 熔岩发光
  // （已包含在地块）

  // 小地图指示：屏幕外裂隙
  if(G.Spawner.rift){
    const rx=G.Spawner.rift.x,ry=G.Spawner.rift.y;
    const sx=rx-cam.x,sy=ry-cam.y;
    if(sx<0||sy<0||sx>cam.w||sy>cam.h){
      ctx.save();
      ctx.fillStyle='#a86cff';
      const cx=U.clamp(sx,10,cam.w-10),cy=U.clamp(sy,10,cam.h-10);
      ctx.beginPath();ctx.moveTo(cx,cy-8);ctx.lineTo(cx+7,cy+6);ctx.lineTo(cx-7,cy+6);ctx.closePath();ctx.fill();
      ctx.restore();
    }
  }
  // 闪光敌人箭头
  for(const e of G.Enemies.L){
    if(!e.isShiny||e.dead)continue;
    const sx=e.x-cam.x,sy=e.y-cam.y;
    if(sx<0||sy<0||sx>cam.w||sy>cam.h){
      ctx.save();ctx.fillStyle='#9ef';
      const cx=U.clamp(sx,12,cam.w-12),cy=U.clamp(sy,12,cam.h-12);
      ctx.beginPath();ctx.moveTo(cx,cy-7);ctx.lineTo(cx+6,cy+5);ctx.lineTo(cx-6,cy+5);ctx.closePath();ctx.fill();
      ctx.restore();
    }
  }
  // 进化/剧情时间停止画面提示
  if(gs.state==='result'){
    ctx.fillStyle='rgba(6,8,18,.6)';ctx.fillRect(0,0,cam.w,cam.h);
  }
}

// 启动
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',Game.init);
else Game.init();
})();

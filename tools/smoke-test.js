// 冒烟测试：在 Node 中模拟浏览器环境，加载全部脚本并模拟战斗
// 用法：node tools/smoke-test.js
'use strict';
const path=require('path');
const createEnv=require('./env');
const root=path.join(__dirname,'..');

const {ctxObj,window,document,elCache}=createEnv();
try{createEnv.loadScripts(ctxObj,root);}
catch(e){console.error('加载失败',e);process.exit(1);}
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
    createEnv.setRec([]);
    const c=G.World.genChunk(-3,2);
    c.dirty=true;c.img=null;
    G.World.bake(c);
    const rr=(createEnv.recSink()||[]).filter(o=>o.name==='fillRect');
    createEnv.setRec(null);
    if(!rr.length){console.error('分块烘焙未绘制任何内容');process.exit(1);}
    const bad=rr.filter(o=>o.a[0]<-0.01||o.a[1]<-0.01||o.a[0]+o.a[2]>258.01||o.a[1]+o.a[3]>258.01);
    if(bad.length){
      console.error('分块越界绘制',bad.slice(0,3),'共',bad.length);
      console.error('首个越界调用栈:\n'+bad[0].stack);
      process.exit(1);
    }
    console.log('✓ 分块烘焙坐标正确 (chunk -3,2，'+rr.length+' 次 fillRect)');

    // 断言 4：环绕技能弹体被对象池回收后必须自愈（历史 bug：castOrbit 每帧抛异常 → 画面冻结）
    try{
      const mdef=Object.values(G.MOVES).find(d=>d.kind==='orbit');
      if(!mdef)throw new Error('找不到 orbit 技能定义');
      const mp=G.game.player;
      const m={id:mdef.id,def:mdef,lv:1,cd:0,ang:0,evolved:false,evo:null};
      mp.moves.push(m);mp.active=mp.moves.length-1;
      G.Player.update(0.016);
      if(!m.orbs||!m.orbs.length)throw new Error('轨道弹未生成');
      const P=G.Projectiles;
      for(const o of m.orbs)if(o.p)o.p.dead=true;
      P.update(0.016);                    // 死亡 → 回收进对象池
      P.spawn({x:0,y:0,life:1,dmg:1});    // 复用对象（orbit 被重置为 null）
      m.cd=0;
      G.Player.update(0.016);             // 必须自愈，不得抛异常
      for(const o of m.orbs){
        if(!o.p||!o.p.orbit)throw new Error('轨道引用未修复');
        if(o.p.uid!==o.uid)throw new Error('uid 未同步');
      }
      console.log('✓ 环绕技能对象池回收自愈正常 ('+m.orbs.length+' orbs)');
    }catch(e){console.error('环绕技能回归失败',e);process.exit(1);}

    // 断言 5：冲刺必须走碰撞（历史 bug：冲刺直接改坐标穿进湖心 → 四面锁死 = 方向键失灵）
    try{
      const pl=G.game.player;
      pl.dead=false;if(pl.hp<=0)pl.hp=pl.hpMax;
      for(const k of ['up','down','left','right'])G.Input.keys[k]=false;
      pl.dashT=0;pl.dashCd=0;
      const sx=Math.floor(pl.x/16)*16,sy=Math.floor(pl.y/16)*16;
      let cor=null;
      outer:for(let gy=-24;gy<=24;gy++)for(let gx=-24;gx<=24;gx++){
        const bx=sx+gx*16,by=sy+gy*16;
        for(let k=0;k<4;k++){
          const t=G.World.tileAt(bx+k*16,by);
          if(t===2||t===4||G.World.objAt(bx+k*16,by)!==0)continue outer;
        }
        cor={x:bx+8,y:by+8};
      }
      if(!cor)throw new Error('找不到干燥走廊');
      pl.x=cor.x;pl.y=cor.y;
      G.World.setObj(cor.x+16,cor.y,1);
      pl.dashT=0.5;pl.dashVX=430;pl.dashVY=0;
      for(let k=0;k<40;k++)G.Player.update(1/60);
      if(G.World.hitSolid(pl.x,pl.y,pl.r*0.72))throw new Error('冲刺后卡进固体 ('+pl.x.toFixed(1)+','+pl.y.toFixed(1)+')');
      if(pl.x>cor.x+14)throw new Error('冲刺穿墙 x='+pl.x.toFixed(1)+' > '+(cor.x+14));
      pl.x=cor.x+16;pl.y=cor.y;
      if(!G.World.hitSolid(pl.x,pl.y,pl.r*0.72))throw new Error('测试布置失败：目标点不是固体');
      G.Player.update(1/60);
      if(G.World.hitSolid(pl.x,pl.y,pl.r*0.72))throw new Error('unstick 脱困失败');
      console.log('✓ 冲刺碰撞 + unstick 脱困正常 (最终 x='+pl.x.toFixed(1)+')');
    }catch(e){console.error('冲刺/脱困回归失败',e);process.exit(1);}

    // 断言 6：出生点搜索（历史 bug：种子随机 → (0,0) 可能是大片岩浆湖 → 开局即锁死）
    try{
      const blocked=[];
      for(let gx=-3;gx<=3;gx++)for(let gy=-3;gy<=3;gy++){
        const ox=gx*16+8,oy=gy*16+8;
        blocked.push([ox,oy]);
        G.World.setObj(ox,oy,1);
      }
      const p2=G.Player.reset('flame1',false);
      if(G.World.hitSolid(p2.x,p2.y,p2.r*0.72))throw new Error('出生点仍在固体里 ('+p2.x.toFixed(1)+','+p2.y.toFixed(1)+')');
      const d2=Math.hypot(p2.x,p2.y);
      if(d2>5*16*1.5+8)throw new Error('出生点搜索跑太远 d='+d2.toFixed(1));
      for(const[ox,oy]of blocked)G.World.setObj(ox,oy,0);
      console.log('✓ 出生点搜索正常 (0,0) 被封时出生于 ('+p2.x.toFixed(0)+','+p2.y.toFixed(0)+')');
    }catch(e){console.error('出生点回归失败',e);process.exit(1);}
  }catch(e){console.error('开局失败',e);process.exit(1);}

  // 手动驱动主循环（game.js 的 tick 通过 rAF 走 setTimeout）
  let frames=0,errs=0;
  const iv=setInterval(()=>{
    try{
      // 模拟移动输入
      ctxObj.G.Input.move.x=0.6;ctxObj.G.Input.move.y=0.3;
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

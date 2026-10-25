(function(){
'use strict';
const G=window.G,U=G.U;
const L=G.LevelUp={queue:0,open:false,items:[]};

L.reset=function(){L.queue=0;L.open=false;L.items=[];};
L.enqueue=function(n){L.queue+=n;};

L.addItem=function(itemId){
  const gs=G.game,p=gs.player;
  const it=G.item(itemId);if(!it)return;
  const cur=p.items[itemId]||0;
  if(cur>=it.maxLv){G.UI.toast(it.name+' 已满级');return;}
  G.Player.addItem(p,itemId);
  G.UI.toast('获得道具：'+it.name+' Lv.'+(cur+1),'good');
  G.HUD.refreshItems();
};

L.update=function(dt){
  if(L.queue>0&&!L.open&&!G.game.player.dead){
    open();
  }
};

function open(){
  const gs=G.game,p=gs.player;
  L.open=true;L.queue--;
  const opts=buildOptions();
  G.UI.showLevelUp(opts,choose);
  function choose(opt){
    L.open=false;
    apply(opt);
    G.UI.hideLevelUp();
    if(L.queue>0)setTimeout(()=>{if(!G.game.player.dead)open();},80);
  }
  function apply(opt){
    if(opt.kind==='move'){
      const m=p.moves.find(m=>m.id===opt.moveId);
      if(m){
        if(opt.evolve){
          m.evolved=true;
          m.evo=Object.assign({},m.def.lv[m.def.maxLv-1],opt.moveDef.evo);
          m.evo.kind=opt.moveDef.kind;
          G.UI.banner('武器进化：'+opt.moveDef.evo.name);
          G.Audio.sfx('evolve');
          G.FX.ring(p.x,p.y,50,'#7ad8ff',0.6,4);
          G.FX.burst(p.x,p.y,'#7ad8ff',18,160);
        }else{
          m.lv=Math.min(m.def.maxLv,m.lv+1);
          G.Audio.sfx('levelup');
        }
        G.HUD.refreshMoves();
      }
    }else if(opt.kind==='item'){
      G.Player.addItem(p,opt.itemId);
      G.Audio.sfx('levelup');
      G.HUD.refreshItems();
    }else if(opt.kind==='moveNew'){
      G.Player.addMove(p,opt.moveId);
      p.active=Math.max(0,p.moves.length-1);
      G.Audio.sfx('levelup');
      G.HUD.refreshMoves();
    }else if(opt.kind==='heal'){
      p.hp=Math.min(p.hpMax,p.hp+Math.round(p.hpMax*0.35));
      G.FX.num(p.x,p.y-30,'+35%','#7ef57e',14);
      G.Audio.sfx('pickup');
    }
  }
}

function buildOptions(){
  const gs=G.game,p=gs.player;
  const rng=gs.rng;
  const opts=[];

  // 1) 升级已有技能
  for(const m of p.moves){
    if(m.evolved)continue;
    if(m.lv>=m.def.maxLv){
      // 检查武器进化
      const need=m.def.evo&&m.def.evo.need;
      if(need&&(p.items[need]||0)>0){
        opts.push({kind:'move',moveId:m.id,moveDef:m.def,evolve:true,
          icon:m.def.evo.icon||m.def.icon,name:m.def.evo.name,
          desc:m.def.evo.desc||'武器进化',tag:'武器进化',w:3});
      }
      continue;
    }
    const next=m.def.lv[m.lv];
    opts.push({kind:'move',moveId:m.id,moveDef:m.def,icon:m.def.icon,
      name:m.def.name+' Lv.'+(m.lv+1),
      desc:moveDesc(m.def,next),
      w:2});
  }
  // 2) 新技能（若未满 4 个）
  if(p.moves.length<4){
    const have=p.moves.map(m=>m.id);
    const pool=Object.keys(G.MOVES).filter(id=>have.indexOf(id)<0);
    // 优先同属性
    const same=pool.filter(id=>p.types.indexOf(G.MOVES[id].type)>=0);
    const cand=rng.shuffle(same.length>=2?same:pool).slice(0,2);
    for(const id of cand){
      const md=G.MOVES[id];
      opts.push({kind:'moveNew',moveId:id,icon:md.icon,name:'新技能：'+md.name,desc:md.desc+'（'+md.type+'系）',w:1});
    }
  }
  // 3) 被动道具
  const items=Object.keys(G.ITEMS).filter(id=>(p.items[id]||0)<G.ITEMS[id].maxLv);
  for(const id of rng.shuffle(items).slice(0,3)){
    const it=G.ITEMS[id];
    const lv=(p.items[id]||0)+1;
    opts.push({kind:'item',itemId:id,icon:it.icon,name:it.name+' Lv.'+lv,desc:it.desc,w:1});
  }
  // 4) 治疗
  opts.push({kind:'heal',icon:'💗',name:'紧急治疗',desc:'立即回复 35% 生命',w:0.5});

  // 随机取 3 个（进化优先）
  opts.sort((a,b)=>(b.w||1)-(a.w||1));
  const picked=rng.shuffle(opts.slice(0,6)).slice(0,3);
  // 确保至少 3 个
  while(picked.length<3&&opts.length){
    const o=opts.shift();
    if(picked.indexOf(o)<0)picked.push(o);
  }
  return picked;
}
function moveDesc(def,lv){
  const bits=[];
  if(lv.dmg)bits.push('伤害 '+lv.dmg);
  if(lv.n)bits.push('×'+lv.n);
  if(lv.cd)bits.push('冷却 '+(lv.cd/1000).toFixed(2)+'s');
  if(lv.r)bits.push('范围 '+lv.r);
  if(lv.pierce)bits.push('穿透 '+lv.pierce);
  if(lv.slow)bits.push('减速 '+Math.round(lv.slow*100)+'%');
  if(lv.jump)bits.push('连锁 '+lv.jump);
  if(lv.len)bits.push('长度 '+lv.len);
  return bits.join(' · ');
}

// Boss 祝福
L.openBless=function(){
  const gs=G.game,p=gs.player;
  const rng=gs.rng;
  const pool=rng.shuffle(G.BLESS).slice(0,3);
  G.UI.showBless(pool.map(b=>({icon:b.icon,name:b.n,desc:b.d,apply:b.apply})),opt=>{
    opt.apply(p);
    G.Audio.sfx('levelup');
    G.UI.hideBless();
  });
};
})();

(function(){
'use strict';
const G=window.G,U=G.U;
const KEY='pms_save_v1';
const S=G.Save={data:null,cloudOk:false,cloudMsg:'离线模式',pending:false};

function def(){
  return {
    v:1, nick:'', device:U.uuid(),
    mon:'flame1', shiny:false,
    coins:0, gems:0, tickets:3,
    collection:{flame1:{n:1,sh:0},sprout1:{n:1,sh:0},ripple1:{n:1,sh:0}},
    meta:{dmg:0,hp:0,spd:0,pick:0,regen:0,start:0,crit:0},
    stats:{runs:0,bestMs:0,bestMon:'',kills:0,legends:0,wins:0,gacha:0,dmg:0},
    missions:{date:'',list:{}},
    achievements:{},
    settings:{vol:70,music:true,dmgnum:true,shake:true,quality:'auto'},
    cloudAt:0
  };
}
function merge(base,ext){
  if(typeof ext!=='object'||ext===null)return base;
  for(const k in ext){
    if(ext[k]&&typeof ext[k]==='object'&&!Array.isArray(ext[k])){
      if(typeof base[k]!=='object'||base[k]===null)base[k]={};
      merge(base[k],ext[k]);
    }else base[k]=ext[k];
  }
  return base;
}
S.load=function(){
  let raw=null;
  try{raw=localStorage.getItem(KEY);}catch(e){}
  let d=def();
  if(raw){try{merge(d,JSON.parse(raw));}catch(e){}}
  S.data=d;
  S.rollMissions();
  return d;
};
S.save=function(){
  try{localStorage.setItem(KEY,JSON.stringify(S.data));}catch(e){}
  S.scheduleCloud();
};
S.reset=function(){
  S.data=def();S.rollMissions();
  try{localStorage.removeItem(KEY);}catch(e){}
  S.save();
};

// ---------- 每日任务 ----------
const MISSION_POOL=[
  {id:'m_kill',n:'击败 300 只精灵',t:'kills',goal:300,r:{coins:200,tickets:1}},
  {id:'m_time',n:'单局生存 5 分钟',t:'bestRunMs',goal:300000,r:{gems:10,tickets:1}},
  {id:'m_gold',n:'累计获得 3000 金币',t:'gold',goal:3000,r:{coins:300,gems:5}},
  {id:'m_gacha',n:'扭蛋召唤 5 次',t:'gacha',goal:5,r:{gems:15}},
  {id:'m_boss',n:'击败 2 名头目',t:'boss',goal:2,r:{tickets:2,gems:10}},
  {id:'m_legend',n:'击败 1 只传说精灵',t:'legend',goal:1,r:{gems:30,tickets:2}},
  {id:'m_evo',n:'让精灵进化 1 次',t:'evo',goal:1,r:{coins:250,gems:8}},
  {id:'m_dash',n:'使用冲刺 50 次',t:'dash',goal:50,r:{coins:150}},
  {id:'m_lv',n:'单局达到 12 级',t:'bestLv',goal:12,r:{gems:12,tickets:1}},
  {id:'m_win',n:'坚持 15 分钟通关',t:'win',goal:1,r:{gems:50,tickets:3}},
];
S.rollMissions=function(){
  const d=S.data,today=U.today();
  if(d.missions.date===today)return;
  // 保留跨天仍进行中的进度？这里重置为新任务
  const rng=G.RNG(hashStr(today));
  const pool=rng.shuffle(MISSION_POOL).slice(0,4);
  const list={};
  for(const m of pool)list[m.id]=0;
  d.missions={date:today,list:list,pool:pool.map(m=>m.id)};
  // 成就进度不重置
};
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
S.MISSIONS=MISSION_POOL;
S.missionDef=id=>MISSION_POOL.find(m=>m.id===id);

// 事件计数：击杀/金币等累加；best* 类任务取最大值
S.track=function(key,amount){
  const d=S.data;
  amount=amount==null?1:amount;
  const pool=d.missions&&d.missions.pool;
  if(pool){
    for(const id of pool){
      const md=S.missionDef(id);
      if(!md||md.t!==key)continue;
      const cur=d.missions.list[id]||0;
      if(key.indexOf('best')===0)d.missions.list[id]=Math.max(cur,amount);
      else d.missions.list[id]=Math.min(md.goal,cur+amount);
    }
  }
  // 汇总到 stats
  if(key==='kills')d.stats.kills+=amount;
  if(key==='gold')d.stats.gold=(d.stats.gold||0)+amount;
  if(key==='gacha')d.stats.gacha+=amount;
  if(key==='dash')d.stats.dash=(d.stats.dash||0)+amount;
  // 成就
  G.Achievements.check(key,amount);
};

// ---------- 成就 ----------
const ACH=[
  {id:'a_first',n:'初次启程',d:'完成第一次冒险',c:()=>S.data.stats.runs>=1,r:{gems:5}},
  {id:'a_kill100',n:'百人斩',d:'累计击败 100 只精灵',c:()=>S.data.stats.kills>=100,r:{coins:200}},
  {id:'a_kill1k',n:'千人斩',d:'累计击败 1000 只精灵',c:()=>S.data.stats.kills>=1000,r:{gems:20,tickets:1}},
  {id:'a_time10',n:'十分钟奇迹',d:'单局生存 10 分钟',c:()=>S.data.stats.bestMs>=600000,r:{gems:25}},
  {id:'a_win',n:'幸存者',d:'坚持 15 分钟通关',c:()=>S.data.stats.wins>=1,r:{gems:60,tickets:3}},
  {id:'a_legend',n:'传说猎手',d:'击败 1 只传说精灵',c:()=>S.data.stats.legends>=1,r:{gems:40}},
  {id:'a_dex5',n:'图鉴新手',d:'收集 5 种精灵',c:()=>Object.keys(S.data.collection).length>=5,r:{gems:15}},
  {id:'a_dex12',n:'图鉴达人',d:'收集 12 种精灵',c:()=>Object.keys(S.data.collection).length>=12,r:{gems:40,tickets:2}},
  {id:'a_shiny',n:'闪光时刻',d:'获得 1 只闪光精灵',c:()=>Object.keys(S.data.collection).some(k=>S.data.collection[k].sh>0),r:{gems:30,tickets:2}},
  {id:'a_gacha50',n:'扭蛋专家',d:'累计扭蛋 50 次',c:()=>S.data.stats.gacha>=50,r:{gems:25}},
  {id:'a_meta10',n:'强化之路',d:'永久强化累计 10 级',c:()=>{const m=S.data.meta;let s=0;for(const k in m)s+=m[k];return s>=10;},r:{gems:20}},
  {id:'a_lv20',n:'高速成长',d:'单局达到 20 级',c:()=>S.data.stats.bestLv>=20,r:{gems:25}},
];
S.ACH=ACH;
G.Achievements={
  check(){for(const a of ACH){if(!S.data.achievements[a.id]&&a.c()){
    S.data.achievements[a.id]=1;G.UI.toast('成就达成：'+a.n+'　'+(a.r.gems?'◆'+a.r.gems:'')+(a.r.tickets?' ✦'+a.r.tickets:''),'good');
    if(a.r.gems)S.data.gems+=a.r.gems;if(a.r.tickets)S.data.tickets+=a.r.tickets;
    S.save();}}}
};

// ---------- 云存档 ----------
S.api=async function(path,body){
  const opt=body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{method:'GET'};
  const r=await fetch(path,opt);
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.json();
};
S.sync=async function(){
  const d=S.data;
  try{
    S.cloudMsg='同步中...';
    const res=await S.api('/api/save',{token:d.device,nick:d.nick||'幸存者',data:d});
    S.cloudOk=true;S.cloudMsg='云存档已同步 '+new Date().toLocaleTimeString();
    d.cloudAt=Date.now();S.save();
  }catch(e){
    S.cloudOk=false;S.cloudMsg='离线模式（本地存档）';
  }
  return S.cloudOk;
};
S.pull=async function(){
  const d=S.data;
  try{
    const res=await S.api('/api/load?token='+encodeURIComponent(d.device));
    if(res&&res.data){
      const local=JSON.parse(JSON.stringify(d));
      merge(local,res.data);
      local.device=d.device;
      S.data=local;S.rollMissions();S.save();
      S.cloudOk=true;S.cloudMsg='已从云端恢复存档';
      return true;
    }
    S.cloudOk=true;S.cloudMsg='云端暂无存档，已保留本地';
    return false;
  }catch(e){
    S.cloudOk=false;S.cloudMsg='离线模式（本地存档）';
    return false;
  }
};
S.scheduleCloud=U.debounce(function(){
  if(S.pending)return;
  if(!S.cloudOk&&!S.data.cloudAt)return; // 从未成功过则不打扰
  S.pending=true;
  S.sync().finally(()=>{S.pending=false;});
},2500);

// 获得精灵（图鉴）
S.gainMon=function(id,shiny){
  const c=S.data.collection;
  if(!c[id])c[id]={n:0,sh:0};
  c[id].n++;
  if(shiny)c[id].sh++;
  S.save();
};
S.hasMon=function(id){return !!(S.data.collection[id]&&S.data.collection[id].n>0);};

S.export=function(){return JSON.stringify(S.data);};
S.import=function(txt){
  try{const o=JSON.parse(txt);if(!o||typeof o!=='object')return false;
    const d=def();merge(d,o);d.device=S.data.device;S.data=d;S.rollMissions();S.save();return true;
  }catch(e){return false;}
};
})();

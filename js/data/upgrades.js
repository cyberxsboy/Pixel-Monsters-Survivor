(function(){
'use strict';
const G=window.G;
// ---------- 局内被动道具 ----------
const P={};
function def(id,o){o.id=id;P[id]=o;}

def('power',{name:'力量护符',icon:'⚔',maxLv:6,desc:'攻击力 +8%/级',
  apply:(p,l)=>{p.dmgMul*=1+0.08*l;}});
def('vital',{name:'生命羽饰',icon:'❤',maxLv:6,desc:'生命上限 +12%/级，并回复等量生命',
  apply:(p,l)=>{const b=1+0.12*l;p.hpMax=Math.round(p.hpMax*b);p.hp=Math.min(p.hpMax,p.hp+Math.round(p.hpMax*0.12*l));}});
def('swift',{name:'疾风之靴',icon:'👟',maxLv:5,desc:'移动速度 +7%/级',
  apply:(p,l)=>{p.spdMul*=1+0.07*l;}});
def('haste',{name:'冷却指环',icon:'⏱',maxLv:5,desc:'技能冷却 -6%/级',
  apply:(p,l)=>{p.cdMul*=1-0.06*l;}});
def('magnet',{name:'幸运磁石',icon:'🧲',maxLv:5,desc:'拾取范围 +30%/级',
  apply:(p,l)=>{p.pickMul*=1+0.3*l;}});
def('regen',{name:'再生果实',icon:'🍒',maxLv:5,desc:'每秒回复 +0.6/级',
  apply:(p,l)=>{p.regen+=0.6*l;}});
def('crit',{name:'会心手套',icon:'🎯',maxLv:5,desc:'暴击率 +5%/级，暴击 ×1.8',
  apply:(p,l)=>{p.crit+=0.05*l;}});
def('greed',{name:'贪婪护符',icon:'💰',maxLv:5,desc:'金币获取 +15%/级，经验 +5%/级',
  apply:(p,l)=>{p.goldMul*=1+0.15*l;p.xpMul*=1+0.05*l;}});
def('armor',{name:'荆棘铠甲',icon:'🛡',maxLv:5,desc:'受伤 -6%/级，并反弹伤害',
  apply:(p,l)=>{p.dmgTaken*=1-0.06*l;p.thorn+=4*l;}});

// 武器进化所需道具
def('ring',{name:'火焰戒指',icon:'💍',maxLv:1,desc:'烈火系进化的关键道具',
  apply:()=>{}});
def('orb',{name:'熔岩核心',icon:'🟠',maxLv:1,desc:'炎环进化的关键道具',
  apply:()=>{}});
def('lens',{name:'水滴透镜',icon:'🔮',maxLv:1,desc:'水系进化的关键道具',
  apply:()=>{}});
def('shell',{name:'玄武贝壳',icon:'🐢',maxLv:1,desc:'护盾进化的关键道具',
  apply:()=>{}});
def('quiver',{name:'叶刃箭袋',icon:'🪶',maxLv:1,desc:'草系进化的关键道具',
  apply:()=>{}});
def('thorn',{name:'荆棘种子',icon:'🌰',maxLv:1,desc:'藤蔓进化的关键道具',
  apply:()=>{}});
def('coil',{name:'雷电线圈',icon:'🔋',maxLv:1,desc:'电系进化的关键道具',
  apply:()=>{}});
def('prism',{name:'寒冰棱镜',icon:'🔷',maxLv:1,desc:'冰系进化的关键道具',
  apply:()=>{}});
def('brace',{name:'大地护腕',icon:'⚙',maxLv:1,desc:'岩系进化的关键道具',
  apply:()=>{}});
def('feather',{name:'风之羽',icon:'🪽',maxLv:1,desc:'飞行进化的关键道具',
  apply:()=>{}});
def('soul',{name:'灵魂灯笼',icon:'🏮',maxLv:1,desc:'幽灵进化的关键道具',
  apply:()=>{}});
def('web',{name:'银丝线轴',icon:'🧵',maxLv:1,desc:'虫系进化的关键道具',
  apply:()=>{}});
def('fang',{name:'龙之牙',icon:'🦷',maxLv:1,desc:'龙系进化的关键道具',
  apply:()=>{}});
def('charm',{name:'幸运星',icon:'⭐',maxLv:1,desc:'一般系进化的关键道具',
  apply:()=>{}});

G.ITEMS=P;
G.item=id=>P[id];

// ---------- 永久强化（钻石） ----------
const META=[
  {id:'dmg',n:'攻击强化',icon:'⚔',max:20,per:0.03,cost:l=>10+l*8,d:'全体伤害 +3%/级'},
  {id:'hp',n:'体魄强化',icon:'❤',max:20,per:0.04,cost:l=>10+l*8,d:'生命上限 +4%/级'},
  {id:'spd',n:'身法强化',icon:'👟',max:15,per:0.02,cost:l=>12+l*10,d:'移动速度 +2%/级'},
  {id:'pick',n:'拾取强化',icon:'🧲',max:10,per:0.08,cost:l=>8+l*6,d:'拾取范围 +8%/级'},
  {id:'regen',n:'恢复强化',icon:'🍒',max:10,per:0.25,cost:l=>15+l*12,d:'每秒回复 +0.25/级'},
  {id:'start',n:'开局强化',icon:'🎖',max:5,per:1,cost:l=>30+l*30,d:'开局等级 +1/级'},
  {id:'crit',n:'会心强化',icon:'🎯',max:10,per:0.015,cost:l=>15+l*12,d:'暴击率 +1.5%/级'},
];
G.META=META;

// ---------- Boss 祝福 ----------
const BLESS=[
  {id:'b_dmg',n:'狂怒',icon:'🔥',d:'本局伤害 +20%',apply:p=>{p.dmgMul*=1.2;}},
  {id:'b_hp',n:'巨躯',icon:'❤',d:'生命上限 +30% 并回满',apply:p=>{p.hpMax=Math.round(p.hpMax*1.3);p.hp=p.hpMax;}},
  {id:'b_spd',n:'迅捷',icon:'💨',d:'移速 +15%，冲刺冷却 -30%',apply:p=>{p.spdMul*=1.15;p.dashCdMul*=0.7;}},
  {id:'b_cd',n:'急速',icon:'⏱',d:'技能冷却 -20%',apply:p=>{p.cdMul*=0.8;}},
  {id:'b_pick',n:'聚宝',icon:'🧲',d:'拾取范围 +80%，金币 +40%',apply:p=>{p.pickMul*=1.8;p.goldMul*=1.4;}},
  {id:'b_regen',n:'再生',icon:'🍒',d:'每秒回复 +2.5',apply:p=>{p.regen+=2.5;}},
  {id:'b_crit',n:'致命',icon:'🎯',d:'暴击率 +15%',apply:p=>{p.crit+=0.15;}},
  {id:'b_armor',n:'磐石',icon:'🛡',d:'受伤 -20%',apply:p=>{p.dmgTaken*=0.8;}},
  {id:'b_xp',n:'顿悟',icon:'📖',d:'经验获取 +60%',apply:p=>{p.xpMul*=1.6;}},
  {id:'b_lifesteal',n:'噬血',icon:'🩸',d:'攻击回复 4% 伤害的生命',apply:p=>{p.lifesteal+=0.04;}},
  {id:'b_thorn',n:'荆棘',icon:'🌵',d:'受击反弹 12 点伤害',apply:p=>{p.thorn+=12;}},
  {id:'b_magnet2',n:'引力',icon:'⭐',d:'经验宝石 +15% 伤害',apply:p=>{p.xpDmgMul=(p.xpDmgMul||1)*1.15;}},
];
G.BLESS=BLESS;
})();

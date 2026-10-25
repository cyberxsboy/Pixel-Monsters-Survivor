(function(){
'use strict';
const G=window.G;
const P={};
function def(id,o){o.id=id;P[id]=o;}

// rarity: 1 常见 / 2 稀有 / 3 史诗 / 4 传说
// learn: [{lv,move}] 初始技能在 lv1
// evo: {lv, into}

def('flame1',{name:'小焰狐',types:['火'],rarity:1,sprite:'flame1',
  base:{hp:100,dmg:1,spd:1,regen:0.4},learn:[{lv:1,m:'ember'}],evo:{lv:8,into:'flame2'},
  desc:'尾尖燃着不灭的小火苗，性格活泼好动。'});
def('flame2',{name:'炽焰狐',types:['火'],rarity:2,sprite:'flame2',
  base:{hp:140,dmg:1.08,spd:1.04,regen:0.5},learn:[{lv:1,m:'ember'},{lv:6,m:'flameWave'}],evo:{lv:18,into:'flame3'},
  desc:'火焰变得旺盛，能操纵火流冲击敌人。'});
def('flame3',{name:'焚天狐',types:['火','龙'],rarity:3,sprite:'flame3',
  base:{hp:190,dmg:1.2,spd:1.08,regen:0.7},learn:[{lv:1,m:'ember'},{lv:6,m:'flameWave'},{lv:14,m:'dragonBreath'}],
  desc:'传说中能焚烧天际的神狐，周身环绕苍炎。'});

def('ripple1',{name:'溪豆',types:['水'],rarity:1,sprite:'ripple1',
  base:{hp:110,dmg:0.95,spd:0.96,regen:0.6},learn:[{lv:1,m:'bubble'}],evo:{lv:8,into:'ripple2'},
  desc:'生活在清溪中的软软精灵，随身带着水珠。'});
def('ripple2',{name:'潮汐龟',types:['水'],rarity:2,sprite:'ripple2',
  base:{hp:165,dmg:1.0,spd:0.94,regen:0.9},learn:[{lv:1,m:'bubble'},{lv:6,m:'tidalShell'}],evo:{lv:18,into:'ripple3'},
  desc:'甲壳能积蓄潮汐之力，防御出众。'});
def('ripple3',{name:'沧海龟',types:['水','冰'],rarity:3,sprite:'ripple3',
  base:{hp:230,dmg:1.1,spd:0.96,regen:1.3},learn:[{lv:1,m:'bubble'},{lv:6,m:'tidalShell'},{lv:14,m:'frostAura'}],
  desc:'背负着古老海洋记忆的巨龟，掌控寒潮。'});

def('sprout1',{name:'芽芽鹿',types:['草'],rarity:1,sprite:'sprout1',
  base:{hp:105,dmg:1.0,spd:1.05,regen:0.55},learn:[{lv:1,m:'needle'}],evo:{lv:8,into:'sprout2'},
  desc:'头顶嫩芽会随心情摇摆，奔跑迅捷。'});
def('sprout2',{name:'叶角鹿',types:['草'],rarity:2,sprite:'sprout2',
  base:{hp:145,dmg:1.06,spd:1.1,regen:0.75},learn:[{lv:1,m:'needle'},{lv:6,m:'vine'}],evo:{lv:18,into:'sprout3'},
  desc:'枝角能催生藤蔓，是森林的守护者。'});
def('sprout3',{name:'森林鹿',types:['草','飞'],rarity:3,sprite:'sprout3',
  base:{hp:185,dmg:1.18,spd:1.16,regen:1.0},learn:[{lv:1,m:'needle'},{lv:6,m:'vine'},{lv:14,m:'windBlade'}],
  desc:'踏风而行的森之王者，叶角如冠。'});

def('spark1',{name:'雷羽雀',types:['电','飞'],rarity:2,sprite:'spark1',
  base:{hp:95,dmg:1.05,spd:1.12,regen:0.5},learn:[{lv:1,m:'bolt'}],evo:{lv:14,into:'spark2'},
  desc:'羽毛摩擦会积聚静电，叫声清脆。'});
def('spark2',{name:'闪电隼',types:['电','飞'],rarity:3,sprite:'spark2',
  base:{hp:130,dmg:1.18,spd:1.2,regen:0.7},learn:[{lv:1,m:'bolt'},{lv:8,m:'sparkRing'},{lv:14,m:'windBlade'}],
  desc:'翼尖缠绕雷光，俯冲时快如闪电。'});

def('frost1',{name:'雪团貂',types:['冰'],rarity:2,sprite:'frost1',
  base:{hp:100,dmg:1.02,spd:1.06,regen:0.6},learn:[{lv:1,m:'shard'}],evo:{lv:14,into:'frost2'},
  desc:'毛皮终年冰凉，喜欢在雪地打滚。'});
def('frost2',{name:'霜刃貂',types:['冰','恶'],rarity:3,sprite:'frost2',
  base:{hp:135,dmg:1.16,spd:1.12,regen:0.85},learn:[{lv:1,m:'shard'},{lv:8,m:'frostAura'},{lv:14,m:'darkBite'}],
  desc:'爪刃凝结霜华，动作狡黠难测。'});

def('stone1',{name:'石丸',types:['岩'],rarity:2,sprite:'stone1',
  base:{hp:140,dmg:1.04,spd:0.88,regen:0.5},learn:[{lv:1,m:'rockOrbit'}],evo:{lv:14,into:'stone2'},
  desc:'圆滚滚的岩石精灵，滚动起来势不可挡。'});
def('stone2',{name:'岩甲犀',types:['岩','一般'],rarity:3,sprite:'stone2',
  base:{hp:210,dmg:1.15,spd:0.9,regen:0.8},learn:[{lv:1,m:'rockOrbit'},{lv:8,m:'rockThrow'},{lv:14,m:'tackle'}],
  desc:'身披玄武岩甲，冲撞如山崩。'});

def('wind1',{name:'风灵蝶',types:['飞','虫'],rarity:2,sprite:'wind1',
  base:{hp:90,dmg:1.08,spd:1.15,regen:0.55},learn:[{lv:1,m:'windBlade'}],
  desc:'翅膀由凝固的风构成，飞行无声。'});

def('ghost1',{name:'影夜猫',types:['幽','恶'],rarity:3,sprite:'ghost1',
  base:{hp:120,dmg:1.12,spd:1.08,regen:0.7},learn:[{lv:1,m:'shadowOrb'},{lv:8,m:'nightmare'}],
  desc:'只在满月之夜现身，脚步没有声音。'});

def('dragon1',{name:'幼龙崽',types:['龙'],rarity:3,sprite:'dragon1',
  base:{hp:130,dmg:1.14,spd:1.02,regen:0.65},learn:[{lv:1,m:'dragonClaw'}],evo:{lv:18,into:'dragon2'},
  desc:'刚孵化不久的龙，还不会飞，但野心不小。'});
def('dragon2',{name:'苍穹龙',types:['龙','飞'],rarity:4,sprite:'dragon2',
  base:{hp:180,dmg:1.3,spd:1.1,regen:0.9},learn:[{lv:1,m:'dragonClaw'},{lv:8,m:'dragonBreath'},{lv:14,m:'windBlade'}],
  desc:'传说级精灵，展翅可遮蔽天空。'});

def('bug1',{name:'蜘蛛球',types:['虫'],rarity:1,sprite:'bug1',
  base:{hp:95,dmg:0.98,spd:1.04,regen:0.55},learn:[{lv:1,m:'webShot'}],
  desc:'吐出的丝能粘住任何东西，圆滚滚很可爱。'});

def('dark1',{name:'暗噬狼',types:['恶'],rarity:3,sprite:'dark1',
  base:{hp:150,dmg:1.16,spd:1.1,regen:0.75},learn:[{lv:1,m:'darkBite'},{lv:10,m:'nightmare'}],
  desc:'从阴影中现身的猎手，以噩梦为食。'});

G.SPECIES=P;
G.mon=id=>P[id];
G.STARTERS=['flame1','ripple1','sprout1'];
G.RARITY_NAME={1:'常见',2:'稀有',3:'史诗',4:'传说'};
G.RARITY_COLOR={1:'#9aa3cc',2:'#7ad8ff',3:'#c88fff',4:'#ffd257'};
})();

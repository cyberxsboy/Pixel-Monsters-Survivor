(function(){
'use strict';
const G=window.G;
// 技能定义
// kind: bullet 直线弹 / spread 扇形 / orbit 环绕 / aura 范围脉冲 / chain 连锁 /
//       beam 激光束 / boomerang 回旋 / mine 地雷 / pulse 场扩散 / shield 护盾
const M={};
function def(id,o){o.id=id;M[id]=o;}

// ---------- 火 ----------
def('ember',{name:'火花',icon:'🔥',type:'火',kind:'bullet',maxLv:8,
  desc:'发射火球，命中后小范围爆炸。',
  lv:[
    {dmg:10,cd:900,n:1,spd:220,size:5,blast:26},
    {dmg:12,cd:880,n:1,spd:225,size:5,blast:28},
    {dmg:15,cd:850,n:2,spd:230,size:5,blast:30},
    {dmg:18,cd:820,n:2,spd:235,size:6,blast:32},
    {dmg:22,cd:780,n:3,spd:240,size:6,blast:36},
    {dmg:27,cd:740,n:3,spd:250,size:7,blast:40},
    {dmg:33,cd:700,n:4,spd:260,size:7,blast:46},
    {dmg:40,cd:650,n:4,spd:270,size:8,blast:54},
  ],evo:{need:'ring',name:'爆燃风暴',icon:'☄',kind:'bullet',nAdd:2,blastAdd:24,dmgMul:1.25,desc:'火球数量+2，爆炸范围大幅提升'}});

def('flameWave',{name:'烈焰波',icon:'🌊',type:'火',kind:'pulse',maxLv:8,
  desc:'以自身为中心扩散火环，灼烧沿途敌人。',
  lv:[
    {dmg:8,cd:1800,r:70},{dmg:10,cd:1700,r:78},{dmg:13,cd:1600,r:86},
    {dmg:16,cd:1500,r:96},{dmg:20,cd:1400,r:108},{dmg:24,cd:1300,r:120},
    {dmg:29,cd:1200,r:134},{dmg:35,cd:1100,r:150},
  ],evo:{need:'orb',name:'炼狱炎环',icon:'⭕',kind:'pulse',rAdd:60,dmgMul:1.4,rateMul:0.7,desc:'炎环范围与伤害大幅提升'}});

// ---------- 水 ----------
def('bubble',{name:'泡沫',icon:'🫧',type:'水',kind:'bullet',maxLv:8,
  desc:'发射泡泡弹，命中减速敌人。',
  lv:[
    {dmg:9,cd:820,n:1,spd:200,size:5,slow:0.35,slowT:1200},
    {dmg:11,cd:800,n:1,spd:205,size:5,slow:0.38,slowT:1300},
    {dmg:14,cd:770,n:2,spd:210,size:6,slow:0.4,slowT:1400},
    {dmg:17,cd:740,n:2,spd:215,size:6,slow:0.42,slowT:1500},
    {dmg:21,cd:700,n:3,spd:220,size:7,slow:0.45,slowT:1600},
    {dmg:25,cd:660,n:3,spd:230,size:7,slow:0.48,slowT:1700},
    {dmg:30,cd:620,n:4,spd:240,size:8,slow:0.5,slowT:1800},
    {dmg:36,cd:580,n:4,spd:250,size:9,slow:0.55,slowT:2000},
  ],evo:{need:'lens',name:'深渊潮涌',icon:'💠',kind:'bullet',nAdd:2,slow:0.6,slowT:2400,dmgMul:1.3,desc:'泡泡+2并大幅强化减速'}});

def('tidalShell',{name:'潮甲',icon:'🛡',type:'水',kind:'shield',maxLv:8,
  desc:'召唤水环护盾，抵挡伤害并反弹。',
  lv:[
    {dmg:14,cd:6000,r:26,hp:20},{dmg:17,cd:5800,r:28,hp:26},
    {dmg:21,cd:5500,r:30,hp:34},{dmg:26,cd:5200,r:32,hp:44},
    {dmg:31,cd:4800,r:34,hp:56},{dmg:37,cd:4400,r:36,hp:70},
    {dmg:44,cd:4000,r:38,hp:88},{dmg:52,cd:3600,r:42,hp:110},
  ],evo:{need:'shell',name:'沧海结界',icon:'🌀',kind:'shield',rAdd:16,hpMul:2,dmgMul:1.5,desc:'护盾更厚更大，反弹伤害提升'}});

// ---------- 草 ----------
def('needle',{name:'飞叶针',icon:'🌵',type:'草',kind:'spread',maxLv:8,
  desc:'向前方扇形发射多枚叶针。',
  lv:[
    {dmg:7,cd:700,n:3,spd:260,size:4,arc:0.5},
    {dmg:9,cd:680,n:3,spd:265,size:4,arc:0.55},
    {dmg:11,cd:650,n:4,spd:270,size:4,arc:0.6},
    {dmg:14,cd:620,n:4,spd:280,size:5,arc:0.7},
    {dmg:17,cd:580,n:5,spd:290,size:5,arc:0.8},
    {dmg:20,cd:540,n:6,spd:300,size:5,arc:0.9},
    {dmg:25,cd:500,n:7,spd:310,size:6,arc:1.0},
    {dmg:30,cd:460,n:8,spd:320,size:6,arc:1.2},
  ],evo:{need:'quiver',name:'森罗万叶',icon:'🍃',kind:'spread',nAdd:4,dmgMul:1.35,spdAdd:60,desc:'叶针+4且射速更快'}});

def('vine',{name:'藤蔓缠绕',icon:'🌿',type:'草',kind:'orbit',maxLv:8,
  desc:'藤蔓环绕自身，持续切割敌人。',
  lv:[
    {dmg:8,cd:100,r:44,n:2,rot:2.4},
    {dmg:10,cd:100,r:48,n:2,rot:2.6},
    {dmg:13,cd:100,r:52,n:3,rot:2.8},
    {dmg:16,cd:100,r:56,n:3,rot:3.0},
    {dmg:20,cd:100,r:60,n:4,rot:3.2},
    {dmg:24,cd:100,r:66,n:4,rot:3.5},
    {dmg:29,cd:100,r:72,n:5,rot:3.8},
    {dmg:35,cd:100,r:80,n:6,rot:4.2},
  ],evo:{need:'thorn',name:'荆棘领域',icon:'🌹',kind:'orbit',nAdd:3,rAdd:24,dmgMul:1.4,desc:'藤蔓+3，范围大幅提升'}});

// ---------- 电 ----------
def('bolt',{name:'电光',icon:'⚡',type:'电',kind:'chain',maxLv:8,
  desc:'闪电命中后跳向附近敌人。',
  lv:[
    {dmg:11,cd:950,jump:2,jrange:90,size:3},
    {dmg:13,cd:920,jump:2,jrange:95,size:3},
    {dmg:16,cd:880,jump:3,jrange:100,size:4},
    {dmg:20,cd:840,jump:3,jrange:110,size:4},
    {dmg:24,cd:790,jump:4,jrange:120,size:4},
    {dmg:29,cd:740,jump:4,jrange:130,size:5},
    {dmg:35,cd:690,jump:5,jrange:140,size:5},
    {dmg:42,cd:640,jump:6,jrange:160,size:6},
  ],evo:{need:'coil',name:'雷霆风暴',icon:'🌩',kind:'chain',jumpAdd:4,dmgMul:1.35,cdMul:0.6,desc:'连锁次数+4，冷却缩短'}});

def('sparkRing',{name:'电环',icon:'💥',type:'电',kind:'pulse',maxLv:8,
  desc:'释放电环脉冲，短暂眩晕敌人。',
  lv:[
    {dmg:7,cd:2000,r:66,stun:400},{dmg:9,cd:1950,r:72,stun:450},
    {dmg:12,cd:1850,r:80,stun:500},{dmg:15,cd:1750,r:88,stun:550},
    {dmg:18,cd:1650,r:98,stun:600},{dmg:22,cd:1550,r:108,stun:650},
    {dmg:27,cd:1450,r:120,stun:700},{dmg:33,cd:1350,r:134,stun:800},
  ],evo:{need:'coil',name:'超载电域',icon:'⚡',rAdd:50,stun:1100,dmgMul:1.4,desc:'范围与眩晕大幅提升'}});

// ---------- 冰 ----------
def('shard',{name:'冰晶',icon:'❄',type:'冰',kind:'spread',maxLv:8,
  desc:'发射穿透冰晶。',
  lv:[
    {dmg:9,cd:850,n:2,spd:250,size:5,pierce:1,arc:0.35},
    {dmg:11,cd:830,n:2,spd:255,size:5,pierce:1,arc:0.4},
    {dmg:14,cd:800,n:3,spd:260,size:5,pierce:2,arc:0.5},
    {dmg:17,cd:770,n:3,spd:270,size:6,pierce:2,arc:0.6},
    {dmg:21,cd:730,n:4,spd:280,size:6,pierce:2,arc:0.7},
    {dmg:26,cd:690,n:4,spd:290,size:7,pierce:3,arc:0.8},
    {dmg:31,cd:650,n:5,spd:300,size:7,pierce:3,arc:1.0},
    {dmg:38,cd:600,n:6,spd:310,size:8,pierce:4,arc:1.2},
  ],evo:{need:'prism',name:'极寒晶雨',icon:'🧊',kind:'spread',nAdd:3,pierceAdd:3,dmgMul:1.3,desc:'冰晶+3，穿透+3'}});

def('frostAura',{name:'霜冻领域',icon:'🥶',type:'冰',kind:'aura',maxLv:8,
  desc:'持续冻结周围敌人并造成伤害。',
  lv:[
    {dmg:4,tick:350,r:60,slow:0.3},{dmg:5,tick:340,r:64,slow:0.32},
    {dmg:7,tick:320,r:70,slow:0.36},{dmg:9,tick:300,r:76,slow:0.4},
    {dmg:11,tick:280,r:84,slow:0.44},{dmg:14,tick:260,r:92,slow:0.48},
    {dmg:17,tick:240,r:102,slow:0.52},{dmg:21,tick:220,r:114,slow:0.6},
  ],evo:{need:'prism',name:'绝对零度',icon:'💠',rAdd:44,dmgMul:1.5,slow:0.75,desc:'领域范围与伤害质变'}});

// ---------- 岩 ----------
def('rockOrbit',{name:'浮岩石',icon:'🪨',type:'岩',kind:'orbit',maxLv:8,
  desc:'岩石环绕自身，撞击敌人。',
  lv:[
    {dmg:12,cd:100,r:40,n:2,rot:1.8},{dmg:14,cd:100,r:44,n:2,rot:2.0},
    {dmg:18,cd:100,r:48,n:3,rot:2.2},{dmg:22,cd:100,r:52,n:3,rot:2.4},
    {dmg:27,cd:100,r:56,n:4,rot:2.6},{dmg:33,cd:100,r:62,n:4,rot:2.9},
    {dmg:39,cd:100,r:68,n:5,rot:3.2},{dmg:47,cd:100,r:76,n:6,rot:3.6},
  ],evo:{need:'brace',name:'山岳轮转',icon:'⛰',kind:'orbit',nAdd:3,rAdd:20,dmgMul:1.45,desc:'浮石+3，伤害大增'}});

def('rockThrow',{name:'投石',icon:'🪨',type:'岩',kind:'bullet',maxLv:8,
  desc:'投掷巨石，击退并眩晕敌人。',
  lv:[
    {dmg:16,cd:1400,n:1,spd:180,size:6,knock:60,stun:300},
    {dmg:19,cd:1350,n:1,spd:185,size:6,knock:65,stun:320},
    {dmg:23,cd:1300,n:2,spd:190,size:7,knock:70,stun:350},
    {dmg:28,cd:1240,n:2,spd:195,size:7,knock:80,stun:380},
    {dmg:34,cd:1180,n:3,spd:200,size:8,knock:90,stun:420},
    {dmg:40,cd:1100,n:3,spd:210,size:8,knock:100,stun:460},
    {dmg:48,cd:1020,n:4,spd:220,size:9,knock:120,stun:520},
    {dmg:56,cd:940,n:4,spd:230,size:10,knock:140,stun:600},
  ],evo:{need:'brace',name:'天崩地裂',icon:'💥',kind:'bullet',nAdd:2,blast:40,dmgMul:1.3,desc:'巨石+2并引发崩塌'}});

// ---------- 飞 ----------
def('windBlade',{name:'风刃',icon:'🌀',type:'飞',kind:'boomerang',maxLv:8,
  desc:'回旋风刃，往返切割敌人。',
  lv:[
    {dmg:10,cd:1100,r:110,n:1,size:6},{dmg:12,cd:1070,r:118,n:1,size:6},
    {dmg:15,cd:1030,r:126,n:2,size:7},{dmg:19,cd:990,r:134,n:2,size:7},
    {dmg:23,cd:940,r:144,n:3,size:8},{dmg:28,cd:890,r:154,n:3,size:8},
    {dmg:34,cd:830,r:166,n:4,size:9},{dmg:40,cd:770,r:180,n:4,size:10},
  ],evo:{need:'feather',name:'苍穹风轮',icon:'🌪',kind:'boomerang',nAdd:2,rAdd:60,dmgMul:1.35,desc:'风刃+2，射程大增'}});

// ---------- 幽 ----------
def('shadowOrb',{name:'暗影球',icon:'🔮',type:'幽',kind:'homing',maxLv:8,
  desc:'追踪敌人的幽能弹。',
  lv:[
    {dmg:12,cd:1000,n:1,spd:170,size:5,turn:4},{dmg:14,cd:970,n:1,spd:175,size:5,turn:4.4},
    {dmg:18,cd:930,n:2,spd:180,size:6,turn:4.8},{dmg:22,cd:890,n:2,spd:185,size:6,turn:5.2},
    {dmg:27,cd:840,n:3,spd:190,size:7,turn:5.6},{dmg:32,cd:790,n:3,spd:200,size:7,turn:6},
    {dmg:39,cd:740,n:4,spd:210,size:8,turn:6.5},{dmg:46,cd:690,n:4,spd:220,size:9,turn:7},
  ],evo:{need:'soul',name:'百鬼夜行',icon:'👻',kind:'homing',nAdd:3,turnAdd:4,dmgMul:1.3,desc:'暗影球+3，追踪更强'}});

def('nightmare',{name:'噩梦波',icon:'🌑',type:'幽',kind:'beam',maxLv:8,
  desc:'向前方发射持续光束。',
  lv:[
    {dmg:6,tick:120,len:120,w:14},{dmg:7,tick:115,len:130,w:14},
    {dmg:9,tick:110,len:140,w:16},{dmg:11,tick:105,len:155,w:16},
    {dmg:13,tick:100,len:170,w:18},{dmg:16,tick:95,len:185,w:20},
    {dmg:19,tick:90,len:205,w:22},{dmg:23,tick:85,len:230,w:24},
  ],evo:{need:'soul',name:'冥府光柱',icon:'🕳',kind:'beam',lenAdd:80,wAdd:12,dmgMul:1.4,desc:'光束更长更宽更痛'}});

// ---------- 虫 ----------
def('webShot',{name:'蛛网',icon:'🕸',type:'虫',kind:'bullet',maxLv:8,
  desc:'喷射蛛网，大幅减速敌人。',
  lv:[
    {dmg:8,cd:900,n:1,spd:210,size:5,slow:0.5,slowT:1600},
    {dmg:10,cd:880,n:1,spd:215,size:5,slow:0.52,slowT:1700},
    {dmg:12,cd:850,n:2,spd:220,size:6,slow:0.55,slowT:1800},
    {dmg:15,cd:820,n:2,spd:225,size:6,slow:0.58,slowT:1900},
    {dmg:18,cd:780,n:3,spd:230,size:7,slow:0.6,slowT:2000},
    {dmg:22,cd:740,n:3,spd:240,size:7,slow:0.63,slowT:2200},
    {dmg:26,cd:700,n:4,spd:250,size:8,slow:0.66,slowT:2400},
    {dmg:32,cd:660,n:4,spd:260,size:9,slow:0.7,slowT:2600},
  ],evo:{need:'web',name:'天罗地网',icon:'🕸',kind:'bullet',nAdd:2,slow:0.8,slowT:3000,dmgMul:1.4,desc:'蛛网+2，强力减速'}});

// ---------- 龙 ----------
def('dragonBreath',{name:'龙息',icon:'🐉',type:'龙',kind:'beam',maxLv:8,
  desc:'喷射龙炎光束。',
  lv:[
    {dmg:7,tick:110,len:110,w:16},{dmg:8,tick:105,len:120,w:16},
    {dmg:10,tick:100,len:130,w:18},{dmg:13,tick:95,len:145,w:18},
    {dmg:16,tick:90,len:160,w:20},{dmg:19,tick:85,len:175,w:22},
    {dmg:23,tick:80,len:195,w:24},{dmg:28,tick:75,len:220,w:28},
  ],evo:{need:'fang',name:'苍穹灭世息',icon:'🐲',kind:'beam',lenAdd:90,wAdd:16,dmgMul:1.45,desc:'毁灭级龙息'}});

def('dragonClaw',{name:'龙爪',icon:'⚔',type:'龙',kind:'boomerang',maxLv:8,
  desc:'投掷回旋龙爪。',
  lv:[
    {dmg:14,cd:1200,r:100,n:1,size:7},{dmg:17,cd:1160,r:106,n:1,size:7},
    {dmg:21,cd:1110,r:112,n:2,size:8},{dmg:25,cd:1060,r:120,n:2,size:8},
    {dmg:31,cd:1000,r:128,n:3,size:9},{dmg:37,cd:940,r:136,n:3,size:9},
    {dmg:44,cd:880,r:146,n:4,size:10},{dmg:52,cd:820,r:158,n:4,size:11},
  ],evo:{need:'fang',name:'苍穹裂空爪',icon:'💥',kind:'boomerang',nAdd:2,rAdd:50,dmgMul:1.4,desc:'龙爪+2，撕裂一切'}});

// ---------- 恶 ----------
def('darkBite',{name:'暗袭',icon:'🗡',type:'恶',kind:'homing',maxLv:8,
  desc:'暗影之牙追踪敌人，吸血。',
  lv:[
    {dmg:11,cd:950,n:1,spd:190,size:5,steal:0.08,turn:4},
    {dmg:13,cd:920,n:1,spd:195,size:5,steal:0.09,turn:4.2},
    {dmg:16,cd:880,n:2,spd:200,size:6,steal:0.1,turn:4.5},
    {dmg:20,cd:840,n:2,spd:205,size:6,steal:0.11,turn:4.8},
    {dmg:24,cd:800,n:3,spd:210,size:7,steal:0.12,turn:5},
    {dmg:29,cd:750,n:3,spd:220,size:7,steal:0.13,turn:5.4},
    {dmg:35,cd:700,n:4,spd:230,size:8,steal:0.15,turn:5.8},
    {dmg:42,cd:650,n:4,spd:240,size:9,steal:0.18,turn:6.2},
  ],evo:{need:'fang',name:'深渊噬魂',icon:'🕳',kind:'homing',nAdd:2,steal:0.25,dmgMul:1.35,desc:'暗牙+2，吸血大增'}});

// ---------- 一般 ----------
def('tackle',{name:'冲撞',icon:'💫',type:'一般',kind:'bullet',maxLv:8,
  desc:'发射冲击波并击退。',
  lv:[
    {dmg:10,cd:880,n:1,spd:240,size:5,knock:30},
    {dmg:12,cd:860,n:1,spd:245,size:5,knock:32},
    {dmg:15,cd:830,n:2,spd:250,size:5,knock:35},
    {dmg:18,cd:800,n:2,spd:255,size:6,knock:38},
    {dmg:22,cd:760,n:3,spd:260,size:6,knock:42},
    {dmg:26,cd:720,n:3,spd:270,size:7,knock:48},
    {dmg:31,cd:680,n:4,spd:280,size:7,knock:54},
    {dmg:37,cd:630,n:4,spd:290,size:8,knock:62},
  ],evo:{need:'charm',name:'彗星冲锋',icon:'☄',kind:'bullet',nAdd:2,blast:34,dmgMul:1.35,desc:'冲击+2并引发爆炸'}});

G.MOVES=M;
G.move=id=>M[id];
})();

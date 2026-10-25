(function(){
'use strict';
const G=window.G;
// 敌人定义
const E={};
function def(id,o){o.id=id;E[id]=o;}

// ai: chaser 追击 / shooter 远程 / bomber 自爆 / healer 治疗 / shielder 护盾 / summoner 召唤 / orbiter 绕圈 / charger 冲锋
def('slime',{name:'草团子',sprite:'e_slime',hp:14,spd:52,dmg:8,xp:1,r:8,ai:'chaser',tier:1});
def('slime2',{name:'剧毒团子',sprite:'e_slime',hp:34,spd:58,dmg:12,xp:2,r:9,ai:'chaser',tier:2,tint:'#a84fd0'});
def('slime3',{name:'熔岩团子',sprite:'e_slime',hp:80,spd:62,dmg:18,xp:4,r:10,ai:'chaser',tier:3,tint:'#ff6b2d'});

def('bat',{name:'暗夜蝠',sprite:'e_bat',hp:10,spd:88,dmg:7,xp:1,r:7,ai:'orbiter',tier:1});
def('bat2',{name:'血翼蝠',sprite:'e_bat',hp:26,spd:96,dmg:11,xp:2,r:8,ai:'orbiter',tier:2,tint:'#ff3d5a'});
def('bat3',{name:'噬魂蝠',sprite:'e_bat',hp:60,spd:104,dmg:16,xp:4,r:9,ai:'orbiter',tier:3,tint:'#8f4fff'});

def('plant',{name:'食人花',sprite:'e_plant',hp:20,spd:36,dmg:10,xp:1,r:9,ai:'shooter',tier:1,shot:{cd:2200,spd:140,size:5,dmg:9}});
def('plant2',{name:'毒蔓花',sprite:'e_plant',hp:48,spd:40,dmg:14,xp:3,r:10,ai:'shooter',tier:2,tint:'#8fd830',shot:{cd:1900,spd:160,size:5,dmg:13}});
def('plant3',{name:'地狱花',sprite:'e_plant',hp:110,spd:44,dmg:20,xp:6,r:11,ai:'shooter',tier:3,tint:'#ff5d6c',shot:{cd:1600,spd:180,size:6,dmg:18}});

def('imp',{name:'小恶魔',sprite:'e_imp',hp:16,spd:70,dmg:11,xp:2,r:8,ai:'charger',tier:1,charge:{range:150,speed:260,wind:500}});
def('imp2',{name:'烈焰魔',sprite:'e_imp',hp:40,spd:76,dmg:16,xp:3,r:9,ai:'charger',tier:2,tint:'#ffd93d',charge:{range:160,speed:290,wind:450}});
def('imp3',{name:'毁灭魔',sprite:'e_imp',hp:95,spd:82,dmg:24,xp:6,r:10,ai:'charger',tier:3,tint:'#ff2d6a',charge:{range:180,speed:320,wind:400}});

def('golem',{name:'石像鬼',sprite:'e_golem',hp:50,spd:34,dmg:14,xp:3,r:11,ai:'shielder',tier:2,shield:30});
def('golem2',{name:'玄武岩像',sprite:'e_golem',hp:130,spd:36,dmg:22,xp:6,r:12,ai:'shielder',tier:3,tint:'#7ad8ff',shield:70});

def('ghost',{name:'怨灵',sprite:'e_ghost',hp:18,spd:60,dmg:12,xp:2,r:8,ai:'chaser',tier:1,phase:true});
def('ghost2',{name:'夜叉',sprite:'e_ghost',hp:46,spd:66,dmg:17,xp:3,r:9,ai:'chaser',tier:2,tint:'#ff5d8a',phase:true});
def('ghost3',{name:'鬼神',sprite:'e_ghost',hp:110,spd:72,dmg:25,xp:7,r:10,ai:'chaser',tier:3,tint:'#ffd93d',phase:true});

def('eye',{name:'魔眼',sprite:'e_eye',hp:22,spd:48,dmg:13,xp:3,r:9,ai:'shooter',tier:2,shot:{cd:2000,spd:200,size:5,dmg:12,homing:true}});
def('eye2',{name:'毁灭之眼',sprite:'e_eye',hp:58,spd:52,dmg:18,xp:5,r:10,ai:'shooter',tier:3,tint:'#ff3d5a',shot:{cd:1700,spd:230,size:6,dmg:17,homing:true}});

def('skull',{name:'骷髅兵',sprite:'e_skull',hp:26,spd:64,dmg:13,xp:2,r:9,ai:'chaser',tier:2});
def('skull2',{name:'骷髅将',sprite:'e_skull',hp:70,spd:70,dmg:20,xp:5,r:10,ai:'chaser',tier:3,tint:'#ff5d3a'});

def('mush',{name:'毒菇',sprite:'e_mush',hp:30,spd:30,dmg:11,xp:2,r:9,ai:'bomber',tier:2,blast:{r:44,dmg:20,wind:700}});
def('mush2',{name:'爆裂菇',sprite:'e_mush',hp:80,spd:34,dmg:16,xp:5,r:10,ai:'bomber',tier:3,tint:'#ffd93d',blast:{r:60,dmg:32,wind:600}});

def('mage',{name:'咒术师',sprite:'e_mage',hp:36,spd:46,dmg:15,xp:4,r:9,ai:'summoner',tier:2,summon:{cd:5000,what:'slime2',max:4}});
def('mage2',{name:'深渊法师',sprite:'e_mage',hp:90,spd:50,dmg:22,xp:7,r:10,ai:'summoner',tier:3,tint:'#8f4fff',summon:{cd:4200,what:'ghost2',max:4}});

def('healer',{name:'治愈精灵',sprite:'e_ghost',hp:40,spd:50,dmg:6,xp:4,r:9,ai:'healer',tier:2,tint:'#7ef57e',heal:{cd:2500,amt:8,r:90}});
def('healer2',{name:'大治愈者',sprite:'e_ghost',hp:100,spd:54,dmg:10,xp:8,r:10,ai:'healer',tier:3,tint:'#7ad8ff',heal:{cd:2200,amt:18,r:110}});

G.ENEMIES=E;
G.enemy=id=>E[id];
})();

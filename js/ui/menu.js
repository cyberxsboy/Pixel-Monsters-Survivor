(function(){
'use strict';
const G=window.G,U=G.U;
const M=G.Menu={gachaT:0};

M.refresh=function(){
  const s=G.Save.data;
  const sp=G.SPECIES[s.mon];
  U.el('menu-gold').textContent='● '+s.coins;
  U.el('menu-gem').textContent='◆ '+s.gems;
  U.el('menu-tick').textContent='✦ '+s.tickets;
  U.el('menu-mon-name').textContent=sp?sp.name+' '+(s.shiny?'✦':''):'选择伙伴';
  const cv=U.el('menu-face');
  const sheet=sp?G.gfx.sheet(sp.sprite,s.shiny):null;
  if(sheet){const c=cv.getContext('2d');c.clearRect(0,0,40,40);c.imageSmoothingEnabled=false;
    G.gfx.fit(c,sheet,40,40);}
  const best=s.stats.bestMs;
  U.el('menu-best').textContent=best?('历史最佳：'+U.fmtTime(best)+' · '+
    (G.SPECIES[s.stats.bestMon]?G.SPECIES[s.stats.bestMon].name:'')+' · 总击杀 '+U.fmtNum(s.stats.kills)):
    '还没有冒险记录，开始你的第一次冒险吧！';
  U.el('title-cloud').textContent=G.Save.cloudMsg;
};

M.action=function(act){
  switch(act){
    case 'start':G.Game.startRun();break;
    case 'menu':M.refresh();G.UI.show('menu');break;
    case 'collection':G.UI.renderCollection('all');G.UI.show('collection');break;
    case 'partner':G.UI.renderPartners();G.UI.show('partner');break;
    case 'gacha':G.UI.renderGacha();U.el('gacha-result').innerHTML='';G.UI.show('gacha');break;
    case 'upgrades':G.UI.renderUpgrades();G.UI.show('upgrades');break;
    case 'missions':G.UI.renderMissions();G.UI.show('missions');break;
    case 'rank':G.UI.renderRank();G.UI.show('rank');break;
    case 'settings':G.UI.bindSettings();G.UI.show('settings');break;
    case 'help':G.UI.show('help');break;
    case 'resume':G.Game.resume();break;
    case 'settings-pause':G.UI.bindSettings();G.UI.show('settings');break;
    case 'quit':G.Game.endRun(false);break;
    case 'retry':G.Game.startRun();break;
    case 'backToMenu':M.refresh();G.UI.show('menu');break;
  }
  G.Audio.sfx('click');
};

// 扭蛋按钮
document.addEventListener('DOMContentLoaded',()=>{
  const x1=U.el('gacha-x1'),x10=U.el('gacha-x10');
  if(x1)x1.onclick=()=>{const r=G.Gacha.pull(1);G.UI.gachaResult(r);};
  if(x10)x10.onclick=()=>{const r=G.Gacha.pull(10);G.UI.gachaResult(r);};
});
// 扭蛋机动画循环
(function loop(){
  const cv=U.el('gacha-machine');
  if(cv&&!U.el('screen-gacha').classList.contains('hidden')){
    const ctx=cv.getContext('2d');
    G.Gacha.drawMachine(ctx,cv.width,cv.height,performance.now()/1000);
  }
  requestAnimationFrame(loop);
})();
})();

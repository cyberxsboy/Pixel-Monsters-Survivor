(function(){
'use strict';
const G=window.G,U=G.U;
const keys=Object.create(null);
const I=G.Input={
  keys,
  move:{x:0,y:0},
  dash:false, dashQueued:false,
  slot:-1,          // 请求切换技能槽 (−1 无)
  cycle:0,          // +1 / −1
  paused:false,
  isTouch:('ontouchstart' in window)||navigator.maxTouchPoints>0,
  _joy:{active:false,id:null,cx:0,cy:0,x:0,y:0},
};

const KEYMAP={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',
  KeyD:'right',ArrowRight:'right',Space:'dash',ShiftLeft:'dash',ShiftRight:'dash',Escape:'pause',KeyP:'pause',
  Digit1:'slot1',Digit2:'slot2',Digit3:'slot3',Digit4:'slot4',KeyQ:'prev',KeyE:'next'};

window.addEventListener('keydown',e=>{
  if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT'))return;
  const a=KEYMAP[e.code];if(!a)return;
  if(a==='dash'||a.startsWith('slot')||a==='pause'||a==='prev'||a==='next'){if(e.repeat)return;}
  keys[a]=true;
  if(a==='dash')I.dashQueued=true;
  if(a==='pause')I.paused=!I.paused;
  if(a==='slot1')I.slot=0; if(a==='slot2')I.slot=1; if(a==='slot3')I.slot=2; if(a==='slot4')I.slot=3;
  if(a==='prev')I.cycle=-1; if(a==='next')I.cycle=1;
  if(a!=='pause')e.preventDefault();
},{passive:false});

window.addEventListener('keyup',e=>{const a=KEYMAP[e.code];if(a)keys[a]=false;});
window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});

// ---- 触屏摇杆 ----
const joyEl=U.el('joystick'), knob=U.el('joystick-knob'), dashBtn=U.el('btn-dash');
function joyPos(t){const r=joyEl.getBoundingClientRect();return {x:t.clientX-(r.left+r.width/2),y:t.clientY-(r.top+r.height/2)};}
function joyStart(t){
  if(I._joy.active)return;I._joy.active=true;I._joy.id=t.identifier;
  const r=joyEl.getBoundingClientRect();I._joy.cx=r.left+r.width/2;I._joy.cy=r.top+r.height/2;
  joyEl.style.display='block';
  joyEl.style.left=(t.clientX-60)+'px';joyEl.style.top=(t.clientY-60)+'px';
  joyEl.style.bottom='auto';joyEl.style.right='auto';
  joyMove(t);
}
function joyMove(t){
  if(!I._joy.active||t.identifier!==I._joy.id)return;
  let dx=t.clientX-I._joy.cx,dy=t.clientY-I._joy.cy;
  const d=Math.hypot(dx,dy),max=54;
  if(d>max){dx=dx/d*max;dy=dy/d*max;}
  knob.style.transform='translate('+dx+'px,'+dy+'px)';
  I._joy.x=dx/max;I._joy.y=dy/max;
}
function joyEnd(t){
  if(!I._joy.active||(t&&t.identifier!==I._joy.id))return;
  I._joy.active=false;I._joy.x=0;I._joy.y=0;knob.style.transform='';
  joyEl.style.display='none';
}
if(joyEl){
  const area=U.el('app');
  area.addEventListener('touchstart',e=>{
    if(U.el('touch-ui').classList.contains('hidden'))return;
    // 只在左半屏 / 摇杆附近启动
    for(const t of e.changedTouches){
      if(t.clientX<window.innerWidth*0.55&&!joyEnd.hitBtn(t)){joyStart(t);e.preventDefault();break;}
    }
  },{passive:false});
  window.addEventListener('touchmove',e=>{for(const t of e.changedTouches)joyMove(t);},{passive:false});
  window.addEventListener('touchend',e=>{for(const t of e.changedTouches)joyEnd(t);},{passive:false});
  window.addEventListener('touchcancel',e=>{for(const t of e.changedTouches)joyEnd(t);},{passive:false});
  joyEnd.hitBtn=t=>{const el=document.elementFromPoint(t.clientX,t.clientY);return el&&(el.id==='btn-dash'||el.closest('#btn-dash'));};
}
if(dashBtn){
  dashBtn.addEventListener('touchstart',e=>{e.preventDefault();I.dashQueued=true;},{passive:false});
  dashBtn.addEventListener('mousedown',e=>{e.preventDefault();I.dashQueued=true;});
}

// 每帧汇总移动向量
I.update=function(){
  let x=0,y=0;
  if(keys.left)x-=1; if(keys.right)x+=1;
  if(keys.up)y-=1; if(keys.down)y+=1;
  if(I._joy.active){x+=I._joy.x;y+=I._joy.y;}
  const d=Math.hypot(x,y);
  if(d>1){x/=d;y/=d;}
  I.move.x=x;I.move.y=y;
  return I.move;
};
I.consumeDash=function(){const v=I.dashQueued;I.dashQueued=false;return v;};
I.consumeSlot=function(){const v=I.slot;I.slot=-1;return v;};
I.consumeCycle=function(){const v=I.cycle;I.cycle=0;return v;};
})();

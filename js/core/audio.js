(function(){
'use strict';
const G=window.G,U=G.U;
const A=G.Audio={ready:false,ctx:null,master:null,musicGain:null,sfxGain:null,
  muted:false,volume:0.7,musicOn:true,_song:null,_nextT:0,_timer:null,_sfxCount:0};

const NOTE={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function hz(midi){return 440*Math.pow(2,(midi-69)/12);}
function m(name,oct){ // "C4" -> midi
  const n=name.replace(/\d/g,''),o=parseInt(name.replace(/[A-Z]/g,''),10);
  return 12*(o+1)+NOTE[n];
}

A.init=function(){
  if(A.ready)return;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  A.ctx=new AC();
  A.master=A.ctx.createGain();A.master.gain.value=A.volume;A.master.connect(A.ctx.destination);
  A.musicGain=A.ctx.createGain();A.musicGain.gain.value=0.34;A.musicGain.connect(A.master);
  A.sfxGain=A.ctx.createGain();A.sfxGain.gain.value=0.55;A.sfxGain.connect(A.master);
  // 简易混响
  A.rev=A.ctx.createConvolver();
  const len=A.ctx.sampleRate*1.4,buf=A.ctx.createBuffer(2,len,A.ctx.sampleRate);
  for(let c=0;c<2;c++){const d=buf.getChannelData(c);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);}
  A.rev.buffer=buf;
  const rg=A.ctx.createGain();rg.gain.value=0.2;A.rev.connect(rg);rg.connect(A.master);
  A._revIn=A.ctx.createGain();A._revIn.connect(A.rev);
  A.ready=true;
  A._startScheduler();
};
A.resume=function(){if(A.ctx&&A.ctx.state==='suspended')A.ctx.resume();};
A.setVolume=v=>{A.volume=U.clamp(v,0,1);if(A.master)A.master.gain.value=A.muted?0:A.volume;};
A.setMusic=on=>{A.musicOn=on;if(A.musicGain)A.musicGain.gain.value=on?0.34:0;};
A.toggleMute=function(){A.muted=!A.muted;if(A.master)A.master.gain.value=A.muted?0:A.volume;return A.muted;};

// ---------- 合成音色 ----------
function env(g,t,a,d,s,r,peak){
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);
  g.gain.linearRampToValueAtTime(peak*s,t+a+d);g.gain.linearRampToValueAtTime(0.0001,t+a+d+r);
}
function tone(o){
  const c=A.ctx,t=c.currentTime+(o.at||0);
  const osc=c.createOscillator();osc.type=o.type||'square';osc.frequency.setValueAtTime(o.f,t);
  if(o.f2)osc.frequency.exponentialRampToValueAtTime(Math.max(20,o.f2),t+(o.dur||0.15));
  const g=c.createGain();env(g,t,o.a||0.005,o.dur||0.15,o.s||0.3,o.r||0.08,o.vol||0.2);
  osc.connect(g);g.connect(A.sfxGain);
  if(o.rev){const h=c.createGain();h.gain.value=o.rev;g.connect(h);h.connect(A._revIn);}
  osc.start(t);osc.stop(t+(o.dur||0.15)+(o.r||0.08)+0.05);
}
function noiseHit(o){
  const c=A.ctx,t=c.currentTime+(o.at||0);
  const len=Math.floor(c.sampleRate*(o.dur||0.12));
  const b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);
  const s=c.createBufferSource();s.buffer=b;
  const f=c.createBiquadFilter();f.type=o.type||'lowpass';f.frequency.setValueAtTime(o.cut||1800,t);
  if(o.cut2)f.frequency.exponentialRampToValueAtTime(o.cut2,t+(o.dur||0.12));
  const g=c.createGain();g.gain.setValueAtTime(o.vol||0.3,t);g.gain.exponentialRampToValueAtTime(0.001,t+(o.dur||0.12));
  s.connect(f);f.connect(g);g.connect(A.sfxGain);s.start(t);
}

// ---------- 音效 ----------
A.sfx=function(name){
  if(!A.ready||A.muted)return;
  if(++A._sfxCount>18)return; // 防止刷屏
  setTimeout(()=>{A._sfxCount--;},60);
  switch(name){
    case 'shoot': tone({f:620,f2:220,dur:0.08,type:'square',vol:0.09}); break;
    case 'shoot2': tone({f:880,f2:440,dur:0.07,type:'triangle',vol:0.1}); break;
    case 'ice': tone({f:1400,f2:700,dur:0.1,type:'triangle',vol:0.09}); break;
    case 'fire': noiseHit({dur:0.14,cut:900,cut2:300,vol:0.16}); tone({f:300,f2:120,dur:0.12,type:'sawtooth',vol:0.06}); break;
    case 'hit': noiseHit({dur:0.05,cut:2400,vol:0.1}); break;
    case 'crit': tone({f:1200,f2:300,dur:0.1,type:'square',vol:0.14}); noiseHit({dur:0.08,cut:3200,vol:0.12}); break;
    case 'kill': tone({f:200,f2:70,dur:0.16,type:'square',vol:0.11}); break;
    case 'hurt': tone({f:180,f2:80,dur:0.22,type:'sawtooth',vol:0.2}); break;
    case 'pickup': tone({f:880,f2:1320,dur:0.07,type:'triangle',vol:0.09}); break;
    case 'coin': tone({f:1320,dur:0.05,type:'square',vol:0.08}); tone({f:1760,at:0.05,dur:0.06,type:'square',vol:0.08}); break;
    case 'gem': tone({f:1046,dur:0.06,type:'triangle',vol:0.07}); break;
    case 'levelup': [0,4,7,12,16].forEach((n,i)=>tone({f:hz(72+n),at:i*0.07,dur:0.14,type:'square',vol:0.13,rev:0.2})); break;
    case 'evolve': [0,7,12,16,19,24].forEach((n,i)=>tone({f:hz(60+n),at:i*0.1,dur:0.4,type:'triangle',vol:0.16,rev:0.4})); break;
    case 'boss': [0,1,2,3].forEach(i=>tone({f:hz(40+i*2),at:i*0.22,dur:0.5,type:'sawtooth',vol:0.18,rev:0.3})); noiseHit({at:0.9,dur:0.6,cut:600,cut2:80,vol:0.25}); break;
    case 'win': [0,4,7,12,16,19,24].forEach((n,i)=>tone({f:hz(72+n),at:i*0.11,dur:0.3,type:'square',vol:0.15,rev:0.3})); break;
    case 'lose': [12,7,3,0].forEach((n,i)=>tone({f:hz(60+n),at:i*0.2,dur:0.5,type:'sawtooth',vol:0.15,rev:0.4})); break;
    case 'dash': tone({f:300,f2:900,dur:0.1,type:'triangle',vol:0.09}); break;
    case 'chest': [0,5,9,12].forEach((n,i)=>tone({f:hz(72+n),at:i*0.08,dur:0.16,type:'square',vol:0.12})); break;
    case 'gacha': for(let i=0;i<10;i++)tone({f:hz(64+((i*5)%12)),at:i*0.05,dur:0.08,type:'square',vol:0.08}); break;
    case 'gachaBig': [0,4,7,12,16,19,24,28].forEach((n,i)=>tone({f:hz(72+n),at:i*0.06,dur:0.22,type:'square',vol:0.14,rev:0.3})); break;
    case 'click': tone({f:700,dur:0.04,type:'square',vol:0.05}); break;
    case 'error': tone({f:200,f2:140,dur:0.18,type:'square',vol:0.1}); break;
    case 'teleport': tone({f:200,f2:1400,dur:0.25,type:'sine',vol:0.14,rev:0.4}); break;
    case 'legendary': [0,7,12,19,24].forEach((n,i)=>tone({f:hz(48+n),at:i*0.14,dur:0.8,type:'sawtooth',vol:0.16,rev:0.5})); break;
  }
};

// ---------- BGM 调度器 ----------
// 曲目：和弦进行 + 旋律（由种子确定性生成）
const SONGS={
  menu:{bpm:96,prog:[[0,'Am'],[4,'F'],[8,'C'],[12,'G']],scale:'minor',lead:'soft',drums:false},
  field:{bpm:118,prog:[[0,'C'],[4,'G'],[8,'Am'],[12,'F']],scale:'major',lead:'pluck',drums:true},
  boss:{bpm:138,prog:[[0,'Dm'],[2,'Dm'],[4,'Bb'],[6,'C'],[8,'Dm'],[10,'Gm'],[12,'A'],[14,'A']],scale:'minor',lead:'saw',drums:true},
  legend:{bpm:150,prog:[[0,'Em'],[2,'C'],[4,'G'],[6,'D'],[8,'Am'],[10,'Em'],[12,'F'],[14,'B7']],scale:'minor',lead:'saw',drums:true},
  win:{bpm:104,prog:[[0,'C'],[4,'G'],[8,'Am'],[12,'F']],scale:'major',lead:'bell',drums:false},
};
const CHORDS={C:[0,4,7],G:[-1,2,7],Am:[0,3,7],F:[-3,0,4],Dm:[-2,2,5],Bb:[-3,0,5],A:[-4,0,4],Gm:[-5,-1,2],Em:[-5,-1,2],B7:[-5,-2,0]};
const SCALES={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10]};

A.playSong=function(name,loop){
  if(!A.ready)return;
  A._song=name||null;A._songLoop=loop!==false;A._nextT=A.ctx.currentTime+0.1;A._step=0;
  if(A.musicGain)A.musicGain.gain.value=A.musicOn?0.34:0;
};
A.stopSong=function(){A._song=null;};

function chordAt(song,step){
  const bars=song.prog;const barLen=16;
  let cur=bars[0];
  for(let i=0;i<bars.length;i++){if(step%16===bars[i][0]%16||step>=bars[i][0])cur=bars[i];}
  // 简化：按 16 步小节循环，找当前所在和弦
  const pos=step%16;let ch=bars[0][1];
  for(let i=0;i<bars.length;i++){if(bars[i][0]<=pos)ch=bars[i][1];}
  return ch;
}
function scheduleStep(song,step,t){
  const spb=60/song.bpm/4; // 十六分
  const root=48; // C3
  const ch=chordAt(song,step);
  const iv=CHORDS[ch]||CHORDS.C;
  const sc=SCALES[song.scale]||SCALES.major;
  const barPos=step%16;
  const c=A.ctx;
  // 低音
  if(barPos%4===0){
    const bn=root+iv[0]-12;
    const o=c.createOscillator();o.type='triangle';o.frequency.value=hz(bn);
    const g=c.createGain();env(g,t,0.01,0.22,0.5,0.1,0.16);o.connect(g);g.connect(A.musicGain);
    o.start(t);o.stop(t+0.5);
  }
  // 琶音
  const arpNote=iv[step%iv.length]+root;
  if(song.lead!=='bell'){
    const o=c.createOscillator();o.type=song.lead==='saw'?'sawtooth':'square';
    o.frequency.value=hz(arpNote+12);
    const g=c.createGain();env(g,t,0.004,0.1,0.25,0.05,0.05);
    const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=song.lead==='saw'?1400:2600;
    o.connect(f);f.connect(g);g.connect(A.musicGain);o.start(t);o.stop(t+0.2);
  }
  // 主旋律（每 4 步音）
  if(barPos%4===0){
    const deg=sc[(Math.floor(step/4)*3+((step/4|0)%2))%sc.length];
    const oct=12*((step/16|0)%2===0?2:2);
    const leadHz=hz(root+deg+oct);
    const o=c.createOscillator();
    o.type=song.lead==='saw'?'sawtooth':(song.lead==='bell'?'sine':(song.lead==='soft'?'sine':'triangle'));
    o.frequency.value=leadHz;
    const g=c.createGain();env(g,t,0.01,0.18,0.4,0.12,song.lead==='bell'?0.1:0.07);
    if(song.lead==='saw'){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=2000;o.connect(f);f.connect(g);}
    else o.connect(g);
    g.connect(A.musicGain);
    const h=c.createGain();h.gain.value=0.25;g.connect(h);h.connect(A._revIn);
    o.start(t);o.stop(t+0.5);
  }
  // 鼓
  if(song.drums&&barPos%4===0){
    const s=c.createBuffer(1,Math.floor(c.sampleRate*0.09),c.sampleRate);
    const d=s.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);
    const src=c.createBufferSource();src.buffer=s;
    const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=7000;
    const g=c.createGain();g.gain.value=barPos===0?0.14:0.07;
    src.connect(f);f.connect(g);g.connect(A.musicGain);src.start(t);
  }
  if(song.drums&&(barPos===4||barPos===12)){
    const o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(140,t);
    o.frequency.exponentialRampToValueAtTime(45,t+0.1);
    const g=c.createGain();env(g,t,0.002,0.1,0.1,0.03,0.2);o.connect(g);g.connect(A.musicGain);
    o.start(t);o.stop(t+0.2);
  }
}
A._startScheduler=function(){
  if(A._timer)return;
  A._timer=setInterval(()=>{
    if(!A.ready||!A._song||!A.musicOn){if(A.ctx)A._nextT=A.ctx.currentTime+0.1;return;}
    const song=SONGS[A._song];if(!song)return;
    const spb=60/song.bpm/4;
    const horizon=A.ctx.currentTime+0.35;
    let guard=0;
    while(A._nextT<horizon&&guard++<32){
      scheduleStep(song,A._step,A._nextT);
      A._step++;A._nextT+=spb;
      if(A._step>=64){A._step=0;} // 4 小节循环
    }
  },40);
};
A.SONGS=SONGS;
})();

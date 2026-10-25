const path=require('path');
const createEnv=require('./env');
const root=path.join(__dirname,'..');
const {ctxObj}=createEnv();
createEnv.loadScripts(ctxObj,root);
const G=ctxObj.G;
const ids=['flame1','flame2','flame3','ripple1','ripple2','ripple3','sprout1','sprout2','sprout3','spark1','spark2','frost1','frost2','stone1','stone2','wind1','ghost1','dragon1','dragon2','bug1','dark1'];
let bad=0;
for(const id of ids){
  const sheet=G.gfx.sheet(id);
  if(!sheet){console.log('MISSING',id);bad++;continue;}
  console.log(id.padEnd(8),sheet.width+'x'+sheet.height);
  if(sheet.width<12||sheet.height<10){console.log('  TOO SMALL');bad++;}
}
console.log('checked:',ids.length,'| bad:',bad,'| SPRITE_IDS total:',G.SPRITE_IDS.length);
process.exit(bad?1:0);

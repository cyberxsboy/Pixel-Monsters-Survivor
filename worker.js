// Cloudflare Worker：静态资源 + 云存档(KV 缓存 / D1 主存) + 排行榜
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type'};

function json(data,status){
  return new Response(JSON.stringify(data),{status:status||200,
    headers:Object.assign({'Content-Type':'application/json; charset=utf-8'},CORS)});
}
function today(){
  const d=new Date();
  const p=n=>(n<10?'0':'')+n;
  return d.getUTCFullYear()+'-'+p(d.getUTCMonth()+1)+'-'+p(d.getUTCDate());
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const path=url.pathname;

    if(request.method==='OPTIONS')return new Response(null,{headers:CORS});

    try{
      if(path.startsWith('/api/'))return await api(request,env,url);
    }catch(e){
      return json({error:String(e&&e.message||e)},500);
    }
    // 其余走静态资源
    return env.ASSETS.fetch(request);
  }
};

async function api(request,env,url){
  const path=url.pathname;
  if(path==='/api/health')return json({ok:true,t:Date.now()});

  if(path==='/api/save'&&request.method==='POST'){
    const body=await request.json();
    const token=String(body.token||'').slice(0,64);
    if(!token)return json({error:'bad token'},400);
    const nick=String(body.nick||'幸存者').slice(0,16);
    const data=JSON.stringify(body.data||{});
    if(data.length>120000)return json({error:'too large'},413);
    await env.DB.prepare('INSERT INTO saves(token,nick,data,updated) VALUES(?1,?2,?3,?4) '+
      'ON CONFLICT(token) DO UPDATE SET nick=?2,data=?3,updated=?4')
      .bind(token,nick,data,Date.now()).run();
    if(env.SESSION)await env.SESSION.put('save:'+token,data,{expirationTtl:86400});
    return json({ok:true});
  }

  if(path==='/api/load'){
    const token=(url.searchParams.get('token')||'').slice(0,64);
    if(!token)return json({error:'bad token'},400);
    let raw=null;
    if(env.SESSION){
      raw=await env.SESSION.get('save:'+token);
    }
    if(!raw){
      const row=await env.DB.prepare('SELECT data FROM saves WHERE token=?1').bind(token).first();
      if(row)raw=row.data;
      if(raw&&env.SESSION)await env.SESSION.put('save:'+token,raw,{expirationTtl:86400});
    }
    if(!raw)return json({data:null});
    return json({data:JSON.parse(raw)});
  }

  if(path==='/api/rank'){
    const scope=url.searchParams.get('scope')||'today';
    if(request.method==='POST'){
      const body=await request.json();
      const token=String(body.token||'').slice(0,64);
      const nick=String(body.nick||'幸存者').slice(0,16);
      const mon=String(body.mon||'').slice(0,16);
      const ms=Math.max(0,Math.floor(+body.ms||0));
      if(!token||ms<=0)return json({error:'bad'},400);
      // 同一 token 只保留最好成绩
      const best=await env.DB.prepare('SELECT ms FROM ranks WHERE token=?1 AND scope=?2').bind(token,scope).first();
      if(best&&best.ms>=ms)return json({ok:true,kept:best.ms});
      await env.DB.prepare('DELETE FROM ranks WHERE token=?1 AND scope=?2').bind(token,scope).run();
      await env.DB.prepare('INSERT INTO ranks(token,nick,mon,ms,scope,created) VALUES(?1,?2,?3,?4,?5,?6)')
        .bind(token,nick,mon,ms,scope,Date.now()).run();
      if(env.SESSION)await env.SESSION.delete('rank:'+scope);
      return json({ok:true});
    }
    const cacheKey='rank:'+scope;
    if(env.SESSION){
      const hit=await env.SESSION.get(cacheKey);
      if(hit)return json({rows:JSON.parse(hit)});
    }
    let rows;
    if(scope==='today'){
      rows=await env.DB.prepare('SELECT nick,mon,ms FROM ranks WHERE scope=?1 AND created>=?2 ORDER BY ms DESC LIMIT 20')
        .bind('today',Date.now()-86400000).all();
    }else{
      rows=await env.DB.prepare('SELECT nick,mon,ms FROM ranks ORDER BY ms DESC LIMIT 20').all();
    }
    const list=rows.results||[];
    if(env.SESSION)await env.SESSION.put(cacheKey,JSON.stringify(list),{expirationTtl:60});
    return json({rows:list});
  }

  return json({error:'not found'},404);
}

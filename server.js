// 本地静态服务器（无需 Cloudflare 也可游玩）：node server.js
const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json',
  '.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
const port=process.env.PORT||8788;
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/')p='/index.html';
  const f=path.join(root,p);
  if(!f.startsWith(root)){res.writeHead(403);return res.end('forbidden');}
  fs.readFile(f,(e,buf)=>{
    if(e){res.writeHead(404);return res.end('not found');}
    res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(buf);
  });
}).listen(port,()=>console.log('精灵幸存者已启动: http://127.0.0.1:'+port+'/'));

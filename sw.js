const C='q4app-v18',A='q4audio-v1';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html','./style.css','./app.js','./data.js','./vocab.js','./exam.js','./gexam.js','./grammar.js','./manifest.json'])));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C&&k!==A&&!k.startsWith('q4tts-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
/* 录音：已离线下载的优先用缓存（并支持 Range，iOS/Safari 播放音频需要） */
async function audioResp(req){
 const m=await caches.match(req.url);
 if(!m)return fetch(req);
 const rg=req.headers.get('range');
 if(!rg)return m;
 const b=await m.blob(),r=/bytes=(\d*)-(\d*)/.exec(rg);
 let s=r&&r[1]?+r[1]:0,e=r&&r[2]?+r[2]:b.size-1;
 if(r&&!r[1]&&r[2]){s=Math.max(0,b.size-+r[2]);e=b.size-1;}
 e=Math.min(e,b.size-1);
 return new Response(b.slice(s,e+1),{status:206,headers:{'Content-Type':'audio/mpeg','Content-Range':'bytes '+s+'-'+e+'/'+b.size,'Content-Length':String(e-s+1)}});
}
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(/\/(audio|tts)\/.+\.mp3$/.test(u.pathname)){e.respondWith(audioResp(e.request));return;}
 if(e.request.headers.has('range'))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.status===200){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));}return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});

(function(){
'use strict';
var KEY='q4app_v1';
var GROUP=11; // 现行真题一次 11 题
var INT=[1,2,4,7,15];
var D=window.Q4||{papers:[],missing:[]};
var S;
function load(){try{S=JSON.parse(localStorage.getItem(KEY));}catch(e){S=null;}
 if(!S)S={};S.log=S.log||{};S.wrong=S.wrong||{};S.prefs=S.prefs||{};
 if(S.prefs.once===undefined)S.prefs.once=true;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
function dayNum(){var d=new Date();return Math.floor((d.getTime()-d.getTimezoneOffset()*60000)/86400000);}
function $(s,r){return (r||document).querySelector(s);}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}

/* ===== 数据索引 ===== */
var PAP={},ALL=[];
D.papers.forEach(function(p){PAP[p.id]=p;p.clips.forEach(function(c){c.id=p.id;c.pn=p.name;c.key=p.id+':'+c.k;ALL.push(c);});});
var BYKEY={};ALL.forEach(function(c){BYKEY[c.key]=c;});
var PLIST=D.papers.slice().reverse(); // 新的在前

/* ===== 进度 ===== */
function stat(){var n=0,ok=0,u=0;ALL.forEach(function(c){var l=S.log[c.key];if(l){n++;if(l.ok)ok++;if(l.u)u++;}});return {n:n,ok:ok,u:u,total:ALL.length};}
function wrongOpen(){return Object.keys(S.wrong).filter(function(k){var w=S.wrong[k];return BYKEY[k]&&w&&w.box<5;});}
function wrongDue(){var t=dayNum();return wrongOpen().filter(function(k){return S.wrong[k].due<=t;});}
function addWrong(k){S.wrong[k]={box:0,due:dayNum()+1};}
function advWrong(k){var w=S.wrong[k];if(!w)return;w.box++;if(w.box>=5){delete S.wrong[k];return;}w.due=dayNum()+INT[Math.min(w.box,INT.length-1)];}

/* ===== 页面框架 ===== */
var app=$('#app');
function nav(){return '<nav><a href="#/home">🏡 首页</a><a href="#/review">🔁 重听('+wrongOpen().length+')</a><a href="#/vocab">📚 背词('+vDue().length+')</a><a href="#/check">🔍 抽查清单</a></nav>';}
var audioEl=null;
function stopAudio(){if(audioEl){try{audioEl.pause();}catch(e){}audioEl=null;}}
var APPV='v5 · 11-06 12:25';
function render(h){stopAudio();try{speechSynthesis.cancel();}catch(e){}app.innerHTML=nav()+'<div class=ver>版本 '+APPV+'</div><main>'+h+'</main>';window.scrollTo(0,0);}
var KEYH=null;
function setKeys(f){KEYH=f;}
document.addEventListener('keydown',function(e){if(KEYH&&!e.metaKey&&!e.ctrlKey&&!e.altKey)KEYH(e);});

/* ===== 进度备份：导出 / 导入（听力进度 + 背词进度，一个 JSON 文件） ===== */
function bkExport(msgEl){
 vLoad();var t=JSON.stringify({app:'q4',ver:1,time:new Date().toISOString(),S:S,V:V}),d=new Date(),
  nm='q4-进度-'+d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2)+'.json';
 try{var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'application/json'}));a.download=nm;document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);msgEl.textContent='已导出：'+nm+'（含听力进度和背词进度）';}
 catch(e){if(navigator.clipboard){navigator.clipboard.writeText(t).then(function(){msgEl.textContent='下载失败，已改为复制到剪贴板。';});}else{msgEl.textContent='导出失败。';}}
}
function bkImport(file,msgEl,done){
 var fr=new FileReader();fr.onload=function(){var o;try{o=JSON.parse(String(fr.result||''));}catch(e){}
  if(!o||o.app!=='q4'||!o.S||!o.V||!o.V.cards){msgEl.textContent='这不是有效的进度文件。';return;}
  if(!confirm('导入会用文件里的进度覆盖这台设备上的听力进度和背词进度，确定吗？\n（文件时间：'+(o.time||'未知')+'）'))return;
  S=o.S;S.log=S.log||{};S.wrong=S.wrong||{};S.prefs=S.prefs||{};save();V=o.V;vSave();msgEl.textContent='导入完成。';done();};
 fr.readAsText(file,'utf-8');
}
/* ===== 首页 ===== */
function home(){
 setKeys(null);
 var st=stat(),due=wrongDue().length,open=wrongOpen().length;
 var h='<h1>即时应答 · 真题特训</h1><p class=note>JLPT N2 听解「问题4 即时应答」。按真题方式：只放一遍、不显示选项文字，听完选 1 / 2 / 3；选完才给原文、译文和解说，最后自评有没有听懂。</p>';
 h+='<div class=hero><div class=trow><b>进度</b><span class=chip>共 '+st.total+' 题 · '+D.papers.length+' 套</span></div>'+
  '<div class=kv><span>已作答 <b>'+st.n+'</b> / '+st.total+'</span><span>答对 <b>'+st.ok+'</b>'+(st.n?'（'+Math.round(st.ok/st.n*100)+'%）':'')+'</span><span>自评听懂 <b>'+st.u+'</b></span></div>'+
  '<div class=todo><p style="margin:0 0 8px">'+(due?'有 <b>'+due+'</b> 题到期要重听':'今天没有到期的重听')+'（错题/没听懂共 '+open+' 题）</p>'+
  '<a class="btn go" href="#/drill/rand">🎯 随机一组（'+GROUP+' 题，和真题一样）</a>'+
  (due?'<a class="btn go" style="margin-top:8px" href="#/drill/due">🔁 先练到期重听（'+due+'）</a>':'')+'</div></div>';
 h+='<div class=hero id=offbox><div class=trow><b>📥 离线录音</b><span class=chip id=offchip>检查中…</span></div><p class=note style="margin:6px 0 8px">把全部录音存到本机，之后没有网络也能练（约 25 MB，只需下载一次）。</p><div id=offbar class=obar style="display:none"><i></i></div><p><button class="btn go" id=offbtn>下载全部录音</button> <button class=btn id=offdel style="display:none">清除离线录音</button></p><p id=offmsg class=note></p></div>';
 h+='<h2>按卷子练习</h2><div class=grid>';
 PLIST.forEach(function(p){var a=0,o=0;p.clips.forEach(function(c){var l=S.log[c.key];if(l){a++;if(l.ok)o++;}});
  h+='<a class=card href="#/paper/'+p.id+'"><b>'+esc(p.name)+'</b><span>已练 '+a+' / '+p.clips.length+(a?' · 答对 '+o:'')+'</span></a>';});
 h+='</div>';
 if(D.missing&&D.missing.length){h+='<h2>暂缺</h2>';D.missing.forEach(function(m){h+='<p class=note>· '+esc(m.name)+'：'+esc(m.why)+'</p>';});}
 h+='<details class=more><summary>设置与数据</summary>'+
  '<p><label><input type=checkbox id=once '+(S.prefs.once?'checked':'')+' style="width:auto"> 真题模式：题目只播放一遍（答题前不能重听）</label></p>'+
  '<p><button class=btn id=exp>导出进度</button> <label class=btn style="display:inline-block;cursor:pointer">导入进度<input type=file id=imp accept=".json,application/json" style="display:none"></label> <button class="btn bad" id=rst>清除全部进度</button></p><p class=note style="margin:0">导出的文件包含听力作答记录和背词进度，换手机/电脑时导入即可。</p><p id=msg class=note></p></details>';
 render(h);
 offInit();
 $('#once').onchange=function(){S.prefs.once=this.checked;save();};
 $('#exp').onclick=function(){bkExport($('#msg'));};
 $('#imp').onchange=function(){if(this.files[0])bkImport(this.files[0],$('#msg'),home);};
 $('#rst').onclick=function(){if(confirm('确定清除全部作答记录和重听列表？')){S.log={};S.wrong={};save();home();}};
}

/* ===== 离线录音 ===== */
var OFFC='q4audio-v1',OFFBUSY=false;
function allAudio(){var r=[];D.papers.forEach(function(p){p.clips.forEach(function(c){r.push(c.f);});});return r;}
function offCount(){if(!window.caches)return Promise.resolve(-1);return caches.open(OFFC).then(function(c){return Promise.all(allAudio().map(function(f){return c.match(f);}));}).then(function(a){return a.filter(Boolean).length;});}
function offInit(){
 var chip=$('#offchip'),btn=$('#offbtn'),del=$('#offdel'),msg=$('#offmsg');if(!chip)return;
 if(!window.caches||location.protocol.indexOf('http')!==0){chip.textContent='不支持';btn.style.display='none';msg.textContent='当前浏览器或打开方式不支持离线存储（需通过网址访问）。';return;}
 function refresh(){offCount().then(function(n){var t=allAudio().length;if(!$('#offchip'))return;
  chip.textContent=n>=t?'已全部下载':n+' / '+t;btn.textContent=n>=t?'重新检查':(n?'继续下载（剩 '+(t-n)+' 个）':'下载全部录音');
  del.style.display=n>0?'':'none';});}
 refresh();
 btn.onclick=function(){if(OFFBUSY)return;OFFBUSY=true;btn.disabled=true;msg.textContent='';
  var bar=$('#offbar');bar.style.display='';var fill=bar.firstChild;
  caches.open(OFFC).then(function(c){var L=allAudio(),done=0,fail=0,i=0;
   function tick(){fill.style.width=Math.round(done/L.length*100)+'%';chip.textContent='下载中 '+done+' / '+L.length;}
   function one(){if(i>=L.length)return Promise.resolve();var f=L[i++];
    return c.match(f).then(function(m){if(m)return;return fetch(f).then(function(r){if(!r.ok||r.status!==200)throw 0;return c.put(f,r);});}).catch(function(){fail++;}).then(function(){done++;tick();return one();});}
   tick();
   return Promise.all([one(),one(),one(),one()]).then(function(){OFFBUSY=false;btn.disabled=false;bar.style.display='none';
    msg.textContent=fail?('有 '+fail+' 个没下载成功（网络问题），可再点一次继续。'):'完成。之后没有网络也能听录音；页面本身也已缓存。';refresh();});
  }).catch(function(e){OFFBUSY=false;btn.disabled=false;msg.textContent='下载失败：'+e;});};
 del.onclick=function(){if(confirm('清除已下载的离线录音？（不影响作答记录）'))caches.delete(OFFC).then(function(){msg.textContent='已清除。';refresh();});};
}

/* ===== 卷子页 ===== */
function paper(id){
 setKeys(null);
 var p=PAP[id];if(!p){home();return;}
 var h='<h1>'+esc(p.name)+' · 即时应答</h1><p class=note>共 '+p.clips.length+' 题。绿色=答对，红色=答错，描边=在重听列表里。</p><p><a class="btn go" href="#/drill/paper/'+id+'">从第 1 题开始练</a></p><div class=pbtns>';
 p.clips.forEach(function(c){var l=S.log[c.key],w=S.wrong[c.key],cls='btn';if(l)cls+=l.ok?' ok':' ng';if(w&&w.box<5)cls+=' wk';
  h+='<a class="'+cls+'" href="#/clip/'+id+'/'+c.k+'">'+c.q+'</a>';});
 h+='</div><p><a class=btn href="#/home">返回</a></p>';
 render(h);
}

/* ===== 练习（一组） ===== */
var DRILL=null;
function startDrill(mode,arg){
 var q=[];
 if(mode==='paper'){q=PAP[arg]?PAP[arg].clips.map(function(c){return c.key;}):[];}
 else if(mode==='due'){q=shuffle(wrongDue()).slice(0,GROUP);}
 else{
  var due=shuffle(wrongDue()).slice(0,3);
  var unseen=shuffle(ALL.filter(function(c){return !S.log[c.key]&&due.indexOf(c.key)<0;}).map(function(c){return c.key;}));
  var rest=shuffle(ALL.filter(function(c){return S.log[c.key]&&due.indexOf(c.key)<0;}).map(function(c){return c.key;}));
  q=due.concat(unseen).concat(rest).slice(0,GROUP);
  q=shuffle(q);
 }
 if(!q.length){render('<h1>没有题目</h1><p class=note>这个范围里没有可练的题。</p><a class=btn href="#/home">返回</a>');return;}
 DRILL={q:q,i:0,ok:0,no:0,u:0,mode:mode,arg:arg};
 gotoClip(q[0]);
}
function gotoClip(key){var c=BYKEY[key];location.hash='#/clip/'+c.id+'/'+c.k;}
function drillNext(){
 if(!DRILL)return;DRILL.i++;
 if(DRILL.i>=DRILL.q.length){var d=DRILL;DRILL=null;setKeys(null);
  render('<h1>🎉 这组练完了</h1><p>共 '+d.q.length+' 题：答对 <b>'+d.ok+'</b>，答错 <b>'+d.no+'</b>；自评没听懂的已加入重听。</p>'+
   '<p><a class="btn go" href="#/drill/'+(d.mode==='paper'?'rand':d.mode)+(d.mode==='paper'?'':'')+'">再来一组</a> <a class=btn href="#/home">回首页</a></p>');return;}
 gotoClip(DRILL.q[DRILL.i]);
}

/* ===== 单题（真题方式） ===== */
function clip(id,k){
 var p=PAP[id],c=null;if(p)p.clips.forEach(function(x){if(x.k===k)c=x;});
 if(!c){home();return;}
 var dr=DRILL&&DRILL.q[DRILL.i]===c.key;
 var prevc=null,nextc=null;if(!dr){var i=p.clips.indexOf(c);prevc=p.clips[i-1];nextc=p.clips[i+1];}
 var once=!!S.prefs.once;
 var h=(dr?'<p class=note>🎯 第 '+(DRILL.i+1)+' / '+DRILL.q.length+' 题</p>':'')+
  '<h1>'+esc(c.pn)+' 即时应答 第'+c.q+'题</h1>'+
  '<p class=note>先听一遍，不看文字。听完选 1 / 2 / 3（键盘 1 2 3 也可以）。</p>'+
  '<div class="flash playbox"><button id=play class="btn go">▶ 播放</button><div id=pst class=note style="margin-top:8px"></div></div>'+
  '<div class=opts3 id=ch><button class=opt data-n=1>1</button><button class=opt data-n=2>2</button><button class=opt data-n=3>3</button></div>'+
  '<div id=rev></div>';
 render(h);
 var au=new Audio();audioEl=au;au.preload='auto';au.src=c.f;
 var played=false,done=false;
 function pst(t){$('#pst').textContent=t;}
 $('#play').onclick=function(){
  if(done)return;
  if(played&&once)return;
  played=true;au.currentTime=0;au.play().catch(function(){pst('无法播放，请检查网络后重试');played=false;});
  this.disabled=once;this.textContent=once?'🔊 播放中……':'▶ 重播';pst(once?'真题模式：只播放一遍':'');
 };
 au.onended=function(){if(!done){pst('播放结束，请选择 1 / 2 / 3');$('#play').textContent=once?'已播放':'▶ 重播';if(!once)$('#play').disabled=false;}};
 au.onerror=function(){pst('音频加载失败，请检查网络');};
 function choose(n){
  if(done)return;done=true;try{au.pause();}catch(e){}
  var ok=n===c.a,t=dayNum(),l=S.log[c.key]||{n:0};
  l.n=(l.n||0)+1;l.c=n;l.ok=ok?1:0;l.t=t;S.log[c.key]=l;
  if(!ok){addWrong(c.key);}
  save();
  [].forEach.call(document.querySelectorAll('#ch .opt'),function(b){b.disabled=true;var m=+b.getAttribute('data-n');if(m===c.a)b.className='opt right';else if(m===n)b.className='opt wrong';});
  var pb=$('.playbox');if(pb)pb.style.display='none';
  reveal(c,n,ok,dr,prevc,nextc);
 }
 [].forEach.call(document.querySelectorAll('#ch .opt'),function(b){b.onclick=function(){choose(+b.getAttribute('data-n'));};});
 setKeys(function(e){
  if(e.key==='1'||e.key==='2'||e.key==='3')choose(+e.key);
  else if((e.key===' '||e.key==='Enter')&&!done){e.preventDefault();$('#play').click();}
 });
}
function srcTag(kind,v){
 if(kind==='a'){if(v==='pdf')return '<span class=tag>答案：真题 PDF</span>';if(v==='proj')return '<span class="tag ai">答案：项目里的整理版（待抽查）</span>';return '<span class="tag ai">答案：AI 判断（待抽查）</span>';}
 if(v==='pdf')return '<span class=tag>译文：真题 PDF（OCR 后校正）</span>';
 if(v==='old')return '<span class=tag>译文：沿用 riyukaoshi 现有译文</span>';
 return '<span class="tag ai">译文：AI 翻译（待抽查）</span>';
}
function reveal(c,n,ok,dr,prevc,nextc){
 var h='<div class=verdict>'+(ok?'<span class=ok>✔ 正确</span>':'<span class=ng>✘ 不对，正确答案是 '+c.a+'</span>')+'</div>'+
  '<p class=note>你选了 '+n+(ok?'':'，应选 '+c.a)+'。</p>'+
  '<audio id=au2 controls preload=auto style="width:100%" src="'+esc(c.f)+'"></audio>'+
  '<p><button class="btn small" data-r=0.8>0.8×</button><button class="btn small" data-r=1>1×</button><button class="btn small" data-r=1.2>1.2×</button></p>'+
  '<h2>原文</h2><div class=noteb><div class=pline>'+esc(c.p)+'</div><div class=olist>';
 c.o.forEach(function(t,i){var m=i+1,cls='oline'+(m===c.a?' right':(m===n?' wrong':''));
  h+='<div class="'+cls+'"><b>'+m+'.</b><span>'+esc(t)+(m===c.a?' ✔':'')+(m===n&&m!==c.a?' ✘（你选的）':'')+'<span class=zh>'+esc(c.zo[i]||'')+'</span></span></div>';});
 h+='</div></div><h2>译文</h2><div class=noteb lang=zh><div>'+esc(c.zp)+'</div></div>'+
  '<h2>解说</h2><div class=noteb><b>答案 '+c.a+'：</b>'+esc(c.ex)+'</div>'+
  '<div class=src>'+srcTag('a',c.as)+srcTag('z',c.zs)+'</div>'+
  '<h2>你听懂了吗？</h2><div class=rrow><button id=ok class="btn good">听懂了</button><button id=no class="btn bad">没听懂</button><button id=nx class="btn go" disabled>下一题 →</button></div><p class=note>「没听懂」会加入重听，明天再出现。</p><div id=after></div>';
 $('#rev').innerHTML=h;
 var a2=$('#au2');audioEl=a2;
 [].forEach.call(document.querySelectorAll('[data-r]'),function(b){b.onclick=function(){a2.playbackRate=+b.getAttribute('data-r');};});
 var rated=false;
 function rate(u){
  if(rated)return;rated=true;
  var l=S.log[c.key];l.u=u?1:0;
  if(!u)addWrong(c.key);else if(ok&&S.wrong[c.key])advWrong(c.key);
  if(dr){if(ok)DRILL.ok++;else DRILL.no++;if(u)DRILL.u++;}
  save();
  $('#ok').disabled=$('#no').disabled=true;
  var nv=$('nav a:nth-child(2)');if(nv)nv.textContent='🔁 重听('+wrongOpen().length+')';
  var nx=$('#nx'),msg='<p class=note>已记录'+(u?' ✓':'，会在明天再次出现')+'</p>';
  nx.disabled=false;
  if(dr){
   nx.textContent=(DRILL.i+1>=DRILL.q.length?'完成':'下一题 →');nx.onclick=drillNext;
   $('#after').innerHTML=msg;
   setKeys(function(e){if(e.key==='Enter'||e.key==='ArrowRight')drillNext();});
  }else{
   if(nextc){nx.onclick=function(){location.hash='#/clip/'+c.id+'/'+nextc.k;};}
   else{nx.textContent='回目录';nx.onclick=function(){location.hash='#/paper/'+c.id;};}
   $('#after').innerHTML=msg+'<p>'+(prevc?'<a class=btn href="#/clip/'+c.id+'/'+prevc.k+'">← 上一题</a> ':'')+'<a class=btn href="#/paper/'+c.id+'">目录</a></p>';
   setKeys(function(e){if(e.key==='Enter'||e.key==='ArrowRight')nx.click();});
  }
 }
 $('#ok').onclick=function(){rate(true);};
 $('#no').onclick=function(){rate(false);};
 setKeys(null);
}

/* ===== 重听 ===== */
function review(){
 setKeys(null);
 var open=wrongOpen(),due=wrongDue(),t=dayNum();
 var h='<h1>🔁 重听 / 错题</h1><p class=note>答错或自评「没听懂」的题会进来，按 1→2→4→7→15 天的间隔再出现；之后答对且自评听懂就会逐步移出。</p>';
 if(!open.length)h+='<p>目前没有需要重听的题 ✓</p>';
 else{
  if(due.length)h+='<p><a class="btn go" href="#/drill/due">开始练到期的（'+due.length+'）</a></p>';
  h+='<p class=note>共 '+open.length+' 题（到期 '+due.length+'）</p><div class=pbtns style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">';
  open.sort().forEach(function(k){var c=BYKEY[k],w=S.wrong[k];h+='<a class="btn'+(w.due<=t?' wk':'')+'" href="#/clip/'+c.id+'/'+c.k+'">'+esc(c.pn.replace('年','.').replace('月',''))+' #'+c.q+'</a>';});
  h+='</div>';
 }
 h+='<p><a class=btn href="#/home">返回</a></p>';
 render(h);
}

/* ===== 抽查清单 ===== */
function check(){
 setKeys(null);
 var h='<h1>🔍 抽查清单</h1><p class=note>哪些答案、译文是真题 PDF 里的，哪些是我自己判断/翻译的（红色标记），方便你重点抽查。</p>'+
  '<div class=tw><table class=mtab><tr><th>卷</th><th>题数</th><th>答案来源</th><th>译文来源</th></tr>';
 PLIST.forEach(function(p){
  var aa={},zz={};p.clips.forEach(function(c){aa[c.as]=(aa[c.as]||0)+1;zz[c.zs]=(zz[c.zs]||0)+1;});
  function lab(o,kind){return Object.keys(o).map(function(k){var nm=kind==='a'?(k==='pdf'?'真题 PDF':k==='proj'?'项目整理版':'AI 判断'):(k==='pdf'?'真题 PDF':k==='old'?'沿用现有':'AI 翻译');return (k==='pdf'||k==='old'?'':'<span class=ng>')+nm+(k==='pdf'||k==='old'?'':'</span>')+' ×'+o[k];}).join('，');}
  h+='<tr><td><a href="#/paper/'+p.id+'">'+esc(p.name)+'</a></td><td>'+p.clips.length+'</td><td>'+lab(aa,'a')+'</td><td>'+lab(zz,'z')+'</td></tr>';});
 h+='</table></div><p class=note>说明：「AI 判断」的答案没有对应的官方答案表，是我根据原文逻辑判断的；「AI 翻译」是没有现成中文译文时我自己翻的。每题的页面底部也会标出来源。</p><p><a class=btn href="#/home">返回</a></p>';
 render(h);
}

/* ===== 背词（词表由你自己导入，只存在本机） ===== */
var VKEY='q4vocab_v1',V=null;
function vLoad(){try{V=JSON.parse(localStorage.getItem(VKEY));}catch(e){V=null;}if(!V||!V.cards)V={cards:[]};
 if(window.Q4V&&V.seed!==Q4V.ver){var r=vParse(Q4V.text);V.cards=V.cards.concat(r.add);V.seed=Q4V.ver;vSave();}}
function vSave(){try{localStorage.setItem(VKEY,JSON.stringify(V));}catch(e){}}
function vDue(){if(!V)vLoad();var t=dayNum();return V.cards.filter(function(c){return c.n&&c.due<=t;});}
function vNew(){return V.cards.filter(function(c){return !c.n;});}
function vParse(t){var add=[],upd=0,idx={};V.cards.forEach(function(c){idx[c.w]=c;});
 t.split(/\r?\n/).forEach(function(l){l=l.trim();if(!l)return;
  var a=(/[|｜\t]/.test(l)?l.split(/\s*[|｜\t]\s*/):l.split(/[，,]/)).map(function(x){return x.trim();});
  if(!a[0])return;if(a.length===2)a=[a[0],'',a[1]];
  var o={w:a[0],r:a[1]||'',m:a[2]||'',x:(a[3]||'').replace(/¶/g,'\n')};
  var ex=idx[o.w];if(ex){if(o.r)ex.r=o.r;if(o.m)ex.m=o.m;if(o.x)ex.x=o.x;upd++;return;}
  o.n=0;o.box=0;o.due=0;idx[o.w]=o;add.push(o);});return {add:add,upd:upd};}
var VQ=null;
function vocab(){
 setKeys(null);vLoad();var d=vDue().length,nw=vNew().length,tot=V.cards.length;
 var h='<h1>背词</h1><p class=note>已内置高频词表，进度只保存在这台设备的浏览器里，不会上传；也可以在下面再导入自己的词表。用「上一个 / 下一个」翻看单词（可点 🔊 听读音和例句），每看 5 个词出 5 道选择题（用例句或真题句考读音、意思）；答错的词自动加到队尾重背，答对的词按你的作答情况自适应安排复习间隔（答得快就拉长，答错就缩短）。</p>';
 h+='<div class=hero><div class=trow><b>词库</b><span class=chip>共 '+tot+' 词</span></div><div class=kv><span>到期复习 <b>'+d+'</b></span><span>还没背过 <b>'+nw+'</b></span></div>'+
  '<div class=todo>'+(tot?'<a class="btn go" id=vgo href="#/vocab/go">开始背词（到期 + 新词最多 10 个）</a>':'<p class=note style="margin:0">词库是空的，先在下面导入。</p>')+'</div></div>';
 h+='<h2>导入词表</h2><p class=note>每行一个词，用 | 分隔：<b>单词 | 读音 | 意思 | 例句和讲解</b>（例句里的换行用 ¶ 表示）。只写前两三列也可以。已有的词会更新读音、意思和例句，背词进度保留。</p>'+
  '<textarea id=vtx rows=7 style="width:100%;box-sizing:border-box" placeholder="例：&#10;譲る | ゆずる | 让；让给 | 席を～ （让座）"></textarea>'+
  '<p><label class="btn go" style="display:inline-block;cursor:pointer">选择词表文件（.txt）<input type=file id=vfile accept=".txt,text/plain" style="display:none"></label></p><p><button class="btn go" id=vimp>导入</button> <button class=btn id=vexp>复制词库文本</button> <button class="btn bad" id=vclr>清空词库</button></p><p id=vmsg class=note></p>'+
  ttsBox()+
  '<h2>背词进度备份</h2><p class=note>把听力和背词的进度导出成文件，换设备或清缓存前先备份；导入会覆盖当前进度。</p><p><button class="btn go" id=bkx>导出进度（文件）</button> <label class=btn style="display:inline-block;cursor:pointer">导入进度<input type=file id=bki accept=".json,application/json" style="display:none"></label></p><p id=bkm class=note></p>';
 render(h);
 ttsBoxBind();
 $('#bkx').onclick=function(){bkExport($('#bkm'));};
 $('#bki').onchange=function(){if(this.files[0])bkImport(this.files[0],$('#bkm'),vocab);};
 $('#vimp').onclick=function(){var r=vParse($('#vtx').value);if(!r.add.length&&!r.upd){$('#vmsg').textContent='没有读到词。';return;}V.cards=V.cards.concat(r.add);vSave();vocab();$('#vmsg').textContent='新增 '+r.add.length+' 个词，更新 '+r.upd+' 个。';};
 $('#vfile').onchange=function(){var f=this.files[0];if(!f)return;var fr=new FileReader();fr.onload=function(){$('#vtx').value=String(fr.result||'');$('#vimp').click();};fr.readAsText(f,'utf-8');};
 $('#vexp').onclick=function(){var t=V.cards.map(function(c){return [c.w,c.r,c.m,(c.x||'').replace(/\n/g,'¶')].join(' | ');}).join('\n');if(navigator.clipboard){navigator.clipboard.writeText(t).then(function(){$('#vmsg').textContent='已复制 '+V.cards.length+' 个词到剪贴板。';});}else{$('#vtx').value=t;}};
 $('#vclr').onclick=function(){if(confirm('确定清空词库和背词进度？')){V={cards:[],seed:window.Q4V?Q4V.ver:0};vSave();vocab();}};
}
function vocabGo(){
 vLoad();var q=shuffle(vDue()).concat(vNew().slice(0,10));
 if(!q.length){render('<h1>今天背完了</h1><p class=note>没有到期的词，也没有新词了。</p><a class=btn href="#/vocab">返回</a>');return;}
 VQ={q:q,i:0,start:0,fl:{},batch:[],qz:0,qzok:0};vCard();
}
/* ===== 朗读（浏览器自带日语 TTS） ===== */
var TTSV=null,TKEY='q4tts_v1',TP={};
try{TP=JSON.parse(localStorage.getItem(TKEY))||{};}catch(e){TP={};}
function jaVoices(){try{return speechSynthesis.getVoices().filter(function(v){return /^ja/i.test(v.lang);});}catch(e){return [];}}
function vScore(v){var n=v.name||'';return (/natural|neural|online|premium|enhanced|高品质|高品質|拡張/i.test(n)?10:0)+(/Google|Kyoko|Otoya|O-Ren|Nanami|Keita|Haruka|Ayumi|Sayaka|Ichiro|Mizuki/i.test(n)?5:0)+(v.localService?0:1);}
function ttsInit(){var vs=jaVoices();TTSV=null;
 if(TP.v)TTSV=vs.filter(function(v){return v.voiceURI===TP.v;})[0]||null;
 if(!TTSV)TTSV=vs.slice().sort(function(a,b){return vScore(b)-vScore(a);})[0]||null;}
if(window.speechSynthesis){ttsInit();try{speechSynthesis.onvoiceschanged=ttsInit;}catch(e){}}
function say(t){if(!window.speechSynthesis||!t)return;try{speechSynthesis.cancel();if(!/[。！？!?]$/.test(t))t+='。';var u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';if(TTSV)u.voice=TTSV;u.rate=TP.r||.9;speechSynthesis.speak(u);}catch(e){}}
function ttsBox(){var vs=jaVoices().sort(function(a,b){return vScore(b)-vScore(a);});
 var o=vs.map(function(v){return '<option value="'+esc(v.voiceURI)+'"'+(TTSV&&TTSV.voiceURI===v.voiceURI?' selected':'')+'>'+esc(v.name)+(vScore(v)>=10?' ★':'')+'</option>';}).join('');
 var rs=[.7,.8,.9,1,1.1].map(function(r){return '<option value="'+r+'"'+((TP.r||.9)===r?' selected':'')+'>'+r+'x</option>';}).join('');
 return '<h2>朗读声音</h2><p class=note>声音由你的设备/浏览器提供，不同设备差别很大。带 ★ 的是自然度较高的（一般是 Natural / Neural / Enhanced / Google / Kyoko 之类）。'+
  (vs.length?'':'<b>这台设备没有检测到日语语音，</b>请在系统里安装日语语音包。')+'</p>'+
  '<p><select id=tvoice style="max-width:100%">'+o+'</select> <select id=trate>'+rs+'</select> <button class=btn id=ttest type=button>🔊 试听</button></p>';}
function ttsBoxBind(){var v=$('#tvoice'),r=$('#trate'),t=$('#ttest');if(!v)return;
 v.onchange=function(){TP.v=this.value;try{localStorage.setItem(TKEY,JSON.stringify(TP));}catch(e){}ttsInit();say('先生に謝る');};
 r.onchange=function(){TP.r=+this.value;try{localStorage.setItem(TKEY,JSON.stringify(TP));}catch(e){}say('先生に謝る');};
 t.onclick=function(){say('先生に謝る。ゆっくり話すようにします。');};}
function spk(s){return '<button class=tts type=button data-say="'+esc(s)+'" title="朗读">🔊</button>';}
function ttsBind(){var b=document.querySelectorAll('.tts');for(var j=0;j<b.length;j++)b[j].onclick=function(e){e.stopPropagation();say(this.getAttribute('data-say'));};}

/* ===== 例句 / 真题句 ===== */
function wMain(c){return String(c.w).split(/[・\/]/)[0];}
var NOKANJI={'傾らか':1,'辿々しい':1,'図図しい':1,'水々しい':1,'弱々しい':1,'辛い':1,'偶々':1,'着々':1,'喧しい':1};
/* 单词朗读：用汉字形式（语音引擎能判断词性和声调，比孤立的假名自然得多）；个别多读音/特殊写法的词才退回假名 */
function wordSay(c){var w=wMain(c);return (hasKanji(w)&&!NOKANJI[w])?w:(c.r||c.w);}
function exLines(c){return (c.x||'').replace(/([）)。])\s*\/\s*/g,'$1\n').split('\n').map(function(s){return s.trim();}).filter(Boolean);}
function exParts(l){var m=l.match(/^(.*?)\s*[（(]([^）)]*)[）)]\s*$/);return m?{jp:m[1].trim(),zh:m[2]}:{jp:l,zh:''};}
function exSay(c,jp){return jp.replace(/～/g,c.r||c.w).replace(/\s+/g,'');}
var EXAM=null;
function examList(){if(EXAM)return EXAM;EXAM=[];D.papers.forEach(function(p){p.clips.forEach(function(c){
 var cl=function(s){return String(s).replace(/^[男女]：\s*/,'');};
 EXAM.push({t:cl(c.p),zh:cl(c.zp||''),src:p.name+' 第'+c.q+'题'});
 (c.o||[]).forEach(function(o,i){EXAM.push({t:cl(o),zh:cl((c.zo||[])[i]||''),src:p.name+' 第'+c.q+'题选项'+(i+1)});});});});return EXAM;}
function examFor(c){var w=wMain(c);if(!hasKanji(w))return null;var forms=[w];
 if(w.length>2&&/[うくぐすつぬぶむるい]$/.test(w)&&hasKanji(w.slice(0,-1)))forms.push(w.slice(0,-1));
 var hits=examList().filter(function(e){return forms.some(function(f){return f.length>=2&&e.t.indexOf(f)>=0;});});
 if(!hits.length)return null;var e=hits[Math.floor(Math.random()*hits.length)];
 var f=forms.filter(function(f){return e.t.indexOf(f)>=0;})[0];return {jp:e.t,zh:e.zh,src:e.src,hit:f,say:e.t};}
/* 随机取一个带该词的句子：例句优先，也可能是真题句 */
function vCtx(c){var wm=wMain(c),o=[];
 exLines(c).forEach(function(l){var p=exParts(l);
  if(p.jp.indexOf('～')>=0)o.push({jp:p.jp,zh:p.zh,say:exSay(c,p.jp),src:'例句',blank:true});
  else if(p.jp.indexOf(wm)>=0)o.push({jp:p.jp,zh:p.zh,say:p.jp,src:'例句',hit:wm});});
 var e=examFor(c);if(e)o.push({jp:e.jp,zh:e.zh,say:e.say,src:'真题 '+e.src,hit:e.hit},{jp:e.jp,zh:e.zh,say:e.say,src:'真题 '+e.src,hit:e.hit});
 return o.length?o[Math.floor(Math.random()*o.length)]:null;}
function ctxHtml(c,x){var wm=wMain(c),s=esc(x.jp);
 if(x.blank)return s.replace(/～/g,'<b>'+esc(wm)+'</b>');
 return s.split(esc(x.hit)).join('<b>'+esc(x.hit)+'</b>');}

function vBack(c){var h='<div style="font-size:1.3em">'+(c.r&&c.r!==c.w?esc(c.r)+' ':'')+spk(wordSay(c))+'</div><div style="margin-top:6px">'+esc(c.m)+'</div>';
 exLines(c).forEach(function(l){var p=exParts(l);h+='<div style="margin-top:4px;text-align:left;font-size:.92em;opacity:.9">'+esc(l)+' '+spk(exSay(c,p.jp))+'</div>';});
 return h;}

/* ===== 学习卡：上一个 / 下一个，每 5 个词出一轮选择题 ===== */
function vCard(){
 var Q=VQ;
 if(Q.i>=Q.q.length){if(Q.batch.length){vQuiz();return;}
  setKeys(null);render('<h1>这一组完成</h1><p class=note>小题答对 '+Q.qzok+' / '+Q.qz+'。答错的词已自动重背，并按记忆曲线安排之后的复习。</p><p><a class="btn go" href="#/vocab/go">再来一组</a> <a class=btn href="#/vocab">返回</a></p>');return;}
 var c=Q.q[Q.i],shown=!!Q.fl[Q.i];
 var inB=Q.batch.indexOf(c)>=0,last=(inB?Q.batch.length:Q.batch.length+1)>=5||Q.i+1>=Q.q.length;
 render('<p class=note>'+(Q.i+1)+' / '+Q.q.length+(c.n?'':' · 新词')+'　本轮第 '+(Q.i-Q.start+1)+' / 5 个</p><div class=hero style="text-align:center"><div style="font-size:2.2em;margin:18px 0">'+esc(c.w)+'</div><div id=vback style="min-height:72px">'+(shown?vBack(c):'')+'</div></div>'+
  '<p id=vrow>'+(shown?'':'<button class="btn go" id=vflip style="width:100%">翻面（空格）</button>')+'</p>'+
  '<div class=rrow><button class=btn id=vprev'+(Q.i>Q.start?'':' disabled')+'>◀ 上一个</button><button class="btn go" id=vnext>'+(last?'做小测 ▶':'下一个 ▶')+'</button></div>');
 ttsBind();
 function flip(){if(Q.fl[Q.i])return;Q.fl[Q.i]=1;$('#vback').innerHTML=vBack(c);$('#vrow').innerHTML='';ttsBind();say(wordSay(c));}
 function next(){if(Q.batch.indexOf(c)<0)Q.batch.push(c);Q.i++;if(Q.batch.length>=5||Q.i>=Q.q.length)vQuiz();else vCard();}
 function prev(){if(Q.i>Q.start){Q.i--;vCard();}}
 if($('#vflip'))$('#vflip').onclick=flip;
 $('#vnext').onclick=next;$('#vprev').onclick=prev;
 setKeys(function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!Q.fl[Q.i])flip();else next();}
  else if(e.key==='ArrowRight'){next();}else if(e.key==='ArrowLeft'){prev();}else if(e.key==='s'||e.key==='S'){say(wordSay(c));}});
}
/* —— 每 5 个词的小测：用例句 / 真题句选读音或意思 —— */
function hasKanji(w){return /[一-鿿]/.test(w);}
function pick(c,key,n,same){var pool=V.cards.filter(function(o){return o!==c&&o[key]&&o[key]!==c[key]&&(!same||same(o));});
 if(pool.length<n)pool=V.cards.filter(function(o){return o!==c&&o[key]&&o[key]!==c[key];});
 return shuffle(pool).slice(0,n).map(function(o){return o[key];});}
function mFirst(m){return String(m).replace(/[①-⑨⓪]/g,'').trim().split('；')[0].replace(/^\d[）)]\s*/,'').trim();}
function vMake(c){
 var T=['mean','mean'];if(c.r&&c.r!==c.w){T.push('read','read');if(hasKanji(c.w))T.push('kanji');}
 var ex=exLines(c).filter(function(l){return l.indexOf('～')>=0;})[0];if(ex)T.push('cloze','cloze');
 var t=T[Math.floor(Math.random()*T.length)],last=function(k){return function(o){return String(o[k]).slice(-1)===String(c[k]).slice(-1);};};
 var q,ans,ops,ctx=null,wm=wMain(c);
 if(t==='read'||t==='mean'){ctx=vCtx(c);
  var head=ctx?ctxHtml(c,ctx):'「'+esc(c.w)+'」';
  if(t==='read'){q=(ctx?'句中的 <b>'+esc(wm)+'</b> 怎么读？<br>':'「'+esc(c.w)+'」怎么读？')+(ctx?head:'');ans=c.r;ops=pick(c,'r',3,last('r'));}
  else{q=(ctx?'句中的 <b>'+esc(wm)+'</b> 是什么意思？<br>':'「'+esc(c.w)+'」（'+esc(c.r)+'）是什么意思？')+(ctx?head:'');ans=mFirst(c.m);ops=pick(c,'m',3).map(mFirst);}}
 else if(t==='kanji'){q='「'+esc(c.r)+'」用汉字怎么写？';ans=c.w;ops=pick(c,'w',3,function(o){return hasKanji(o.w)&&String(o.w).slice(-1)===String(c.w).slice(-1);});}
 else{var p=exParts(ex);ctx={jp:p.jp,zh:p.zh,say:exSay(c,p.jp),src:'例句'};q='选一个填进 ＿＿ ：<br>'+esc(p.jp).replace(/～/g,'＿＿');ans=c.w;ops=pick(c,'w',3,function(o){return o.w.slice(-1)===c.w.slice(-1);});}
 ops=ops.filter(function(x,i){return x&&x!==ans&&ops.indexOf(x)===i;});
 return {c:c,t:t,q:q,ctx:ctx,ans:ans,ops:shuffle([ans].concat(ops))};
}
function vQuiz(){
 var Q=VQ;if(V.cards.length<2){Q.batch=[];Q.start=Q.i;vCard();return;}
 var qs=Q.batch.map(vMake),i=0,ok=0;Q.batch=[];
 function show(){
  if(i>=qs.length){Q.qz+=qs.length;Q.qzok+=ok;Q.start=Q.i;setKeys(null);vSave();
   render('<h1>小测 '+ok+' / '+qs.length+'</h1>'+qs.filter(function(x){return !x.right;}).map(function(x){return '<div class=hero style="text-align:left"><b>'+esc(x.c.w)+'</b>'+vBack(x.c)+'</div>';}).join('')+(ok<qs.length?'<p class=note>答错的词已加到队尾，马上重背，之后按记忆曲线再复习。</p>':'<p class=note>全对！</p>')+'<p><button class="btn go" id=vnext2>继续背词 →</button></p>');
   ttsBind();$('#vnext2').onclick=vCard;setKeys(function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();vCard();}});return;}
  var x=qs[i];x.t0=Date.now();
  /* 读音题答前不给朗读（会泄露答案），其他题可以先听句子 */
  var pre=(x.ctx&&x.t==='mean')?' '+spk(x.ctx.say):'';
  render('<p class=note>小测 '+(i+1)+' / '+qs.length+'</p><div class=hero><div style="font-size:1.15em;line-height:1.8">'+x.q+pre+'</div></div>'+
   x.ops.map(function(o,k){return '<p><button class="btn vop" data-k="'+k+'" style="width:100%;text-align:left">'+(k+1)+'. '+esc(o)+'</button></p>';}).join('')+'<div id=vres></div>');
  ttsBind();
  var done=false;
  function choose(k){if(done)return;done=true;var good=x.ops[k]===x.ans,c=x.c,t=dayNum();x.right=good;
   var ms=Date.now()-(x.t0||Date.now()),nxt;
   if(good){ok++;var iv0=c.iv||(c.box>0?INT[Math.min(c.box,INT.length)-1]:0),e=c.e||2.3;
    if(!iv0)c.iv=ms<5000?2:1;
    else{if(ms<5000)e=Math.min(3,e+.1);else if(ms>15000)e=Math.max(1.3,e-.1);c.e=e;c.iv=Math.min(180,Math.max(iv0+1,Math.round(iv0*e)));}
    c.box=(c.box||0)+1;c.due=t+c.iv;nxt='下次复习：'+c.iv+' 天后';}
   else{c.e=Math.max(1.3,(c.e||2.3)-.2);c.lp=(c.lp||0)+1;c.iv=0;c.box=0;c.due=t;Q.q.push(c);nxt='已加到本组队尾重背，今天还会再出现';}
   c.n=1;vSave();
   var bs=document.querySelectorAll('.vop');for(var j=0;j<bs.length;j++){bs[j].disabled=true;if(x.ops[j]===x.ans)bs[j].className+=' good';else if(j===k)bs[j].className+=' bad';}
   var src=x.ctx?'<p class=note style="text-align:left">'+esc(x.ctx.src)+'：'+esc(x.ctx.jp.replace(/～/g,wMain(c)))+' '+spk(x.ctx.say)+(x.ctx.zh?'<br>'+esc(x.ctx.zh):'')+'</p>':'';
   $('#vres').innerHTML='<p><b>'+(good?'答对了':'答错了，正确答案：'+esc(x.ans))+'</b> <span class=note>'+nxt+'</span></p>'+src+'<div class=hero style="text-align:left"><b>'+esc(c.w)+'</b>'+vBack(c)+'</div><p><button class="btn go" id=vnq>'+(i+1<qs.length?'下一题 →':'看结果')+'</button></p>';
   ttsBind();say(x.ctx?x.ctx.say:wordSay(c));
   $('#vnq').onclick=function(){i++;show();};}
  var bs=document.querySelectorAll('.vop');for(var j=0;j<bs.length;j++)bs[j].onclick=function(){choose(+this.getAttribute('data-k'));};
  setKeys(function(e){var n=parseInt(e.key,10);if(!done&&n>=1&&n<=x.ops.length)choose(n-1);else if(done&&(e.key==='Enter'||e.key===' ')){e.preventDefault();i++;show();}});
 }
 show();
}

/* ===== 路由 ===== */
function route(){
 var p=(location.hash||'#/home').replace(/^#\/?/,'').split('/');
 var v=p[0]||'home';
 if(v==='clip')clip(p[1],p[2]);
 else if(v==='paper'){DRILL=null;paper(p[1]);}
 else if(v==='drill'){startDrill(p[1],p[2]);}
 else if(v==='review'){DRILL=null;review();}
 else if(v==='check'){DRILL=null;check();}
 else if(v==='vocab'){DRILL=null;if(p[1]==='go')vocabGo();else vocab();}
 else{DRILL=null;home();}
}
load();
window.addEventListener('hashchange',route);
route();
if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0)navigator.serviceWorker.register('sw.js').catch(function(){});
})();

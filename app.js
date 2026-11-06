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
function nav(){return '<nav><a href="#/home">🏡 首页</a><a href="#/listen">🎧 听力</a><a href="#/vocab">📚 单词('+vDue().length+')</a><a href="#/gram">📖 语法('+gDue().length+')</a><a href="#/review">🔁 重听('+wrongOpen().length+')</a><a href="#/check">🔍 抽查清单</a></nav>';}
var audioEl=null;
function stopAudio(){if(audioEl){try{audioEl.pause();}catch(e){}audioEl=null;}}
var APPV='v12 · 11-06 13:51';
function render(h){stopAudio();QT++;try{if(AU)AU.pause();}catch(e){}try{speechSynthesis.cancel();}catch(e){}app.innerHTML=nav()+topBar()+'<main>'+h+'</main>';window.scrollTo(0,0);topBind();}
var KEYH=null;
function setKeys(f){KEYH=f;}
document.addEventListener('keydown',function(e){if(KEYH&&!e.metaKey&&!e.ctrlKey&&!e.altKey)KEYH(e);});

/* ===== 进度备份：导出 / 导入（听力进度 + 背词进度，一个 JSON；可文件，也可复制粘贴文本） ===== */
function bkText(){vLoad();gLoad();return JSON.stringify({app:'q4',ver:2,time:new Date().toISOString(),S:S,V:V,G:GP});}
function bkApply(txt,msgEl,done){var o;try{o=JSON.parse(String(txt||'').trim());}catch(e){}
 if(!o||o.app!=='q4'||!o.S||!o.V||!o.V.cards){msgEl.textContent='这不是有效的进度内容。';return;}
 if(!confirm('导入会用这份进度覆盖这台设备上的听力进度和背词进度，确定吗？\n（导出时间：'+(o.time||'未知')+'）'))return;
 S=o.S;S.log=S.log||{};S.wrong=S.wrong||{};S.prefs=S.prefs||{};save();V=o.V;vSave();if(o.G&&o.G.c){GP=o.G;gSave();}msgEl.textContent='导入完成。';done();}
function bkBox(){return '<textarea id=bktx rows=4 style="width:100%;box-sizing:border-box" placeholder="点「导出到文本框」后进度文本会出现在这里，可复制保存；换设备时把文本粘贴到这里，再点「从文本框导入」"></textarea>'+
 '<p><button class="btn go" id=bkx>导出进度（文件）</button> <button class=btn id=bkc>导出到文本框并复制</button></p>'+
 '<p><label class=btn style="display:inline-block;cursor:pointer">从文件导入<input type=file id=bki accept=".json,application/json,text/plain" style="display:none"></label> <button class=btn id=bkt>从文本框导入</button></p><p id=bkm class=note></p>';}
function dlFile(name,text,type){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type||'text/plain'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);}
function bkBind(done){var m=$('#bkm');
 $('#bkx').onclick=function(){var d=new Date();try{dlFile('q4-进度-'+d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2)+'.json',bkText(),'application/json');m.textContent='已导出文件（含听力进度和背词进度）。';}catch(e){m.textContent='下载失败，请用「导出到文本框」。';}};
 $('#bkc').onclick=function(){var t=bkText();$('#bktx').value=t;$('#bktx').select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}
  if(navigator.clipboard){navigator.clipboard.writeText(t).then(function(){m.textContent='已复制到剪贴板，也在文本框里。';},function(){m.textContent=ok?'已复制。':'已放进文本框，请手动全选复制。';});}else{m.textContent=ok?'已复制。':'已放进文本框，请手动全选复制。';}};
 $('#bki').onchange=function(){var f=this.files[0];if(!f)return;var fr=new FileReader();fr.onload=function(){bkApply(fr.result,m,done);};fr.readAsText(f,'utf-8');};
 $('#bkt').onclick=function(){bkApply($('#bktx').value,m,done);};}
/* ===== 首页 ===== */
function home(){/* 听力即时应答首页 */
 setKeys(null);
 var st=stat(),due=wrongDue().length,open=wrongOpen().length;
 var h='<h1>即时应答 · 真题特训</h1><p class=note>JLPT N2 听解「问题4 即时应答」。按真题方式：只放一遍、不显示选项文字，听完选 1 / 2 / 3；选完才给原文、译文和解说，最后自评有没有听懂。</p>';
 h+='<div class=hero><div class=trow><b>进度</b><span class=chip>共 '+st.total+' 题 · '+D.papers.length+' 套</span></div>'+
  '<div class=kv><span>已作答 <b>'+st.n+'</b> / '+st.total+'</span><span>答对 <b>'+st.ok+'</b>'+(st.n?'（'+Math.round(st.ok/st.n*100)+'%）':'')+'</span><span>自评听懂 <b>'+st.u+'</b></span></div>'+
  '<div class=todo><p style="margin:0 0 8px">'+(due?'有 <b>'+due+'</b> 题到期要重听':'今天没有到期的重听')+'（错题/没听懂共 '+open+' 题）</p>'+
  '<a class="btn go" href="#/drill/rand">🎯 随机一组（'+GROUP+' 题，和真题一样）</a>'+
  (due?'<a class="btn go" style="margin-top:8px" href="#/drill/due">🔁 先练到期重听（'+due+'）</a>':'')+'</div></div>';
 h+=offBox('','📥 离线录音','把全部真题录音存到本机，之后没有网络也能练（约 25 MB，只需下载一次）。','下载全部录音');
 h+='<h2>按卷子练习</h2><div class=grid>';
 PLIST.forEach(function(p){var a=0,o=0;p.clips.forEach(function(c){var l=S.log[c.key];if(l){a++;if(l.ok)o++;}});
  h+='<a class=card href="#/paper/'+p.id+'"><b>'+esc(p.name)+'</b><span>已练 '+a+' / '+p.clips.length+(a?' · 答对 '+o:'')+'</span></a>';});
 h+='</div>';
 if(D.missing&&D.missing.length){h+='<h2>暂缺</h2>';D.missing.forEach(function(m){h+='<p class=note>· '+esc(m.name)+'：'+esc(m.why)+'</p>';});}
 h+='<details class=more><summary>设置与数据</summary>'+
  '<p><label><input type=checkbox id=once '+(S.prefs.once?'checked':'')+' style="width:auto"> 真题模式：题目只播放一遍（答题前不能重听）</label></p>'+
  '<p><button class="btn bad" id=rst>清除听力作答记录</button></p></details>';
 render(h);
 offInit('',allAudio,OFFC,'录音');
 $('#once').onchange=function(){S.prefs.once=this.checked;save();};
 $('#rst').onclick=function(){if(confirm('确定清除全部作答记录和重听列表？')){S.log={};S.wrong={};save();home();}};
}

/* ===== 离线录音 / 离线语音（同一套下载逻辑，按前缀区分） ===== */
var OFFC='q4audio-v1',OFFBUSY=false;
function allAudio(){var r=[];D.papers.forEach(function(p){p.clips.forEach(function(c){r.push(c.f);});});return r;}
function replayBtn(){return '<button class=btn id=replay style="width:100%">🔊 重新朗读（单词 + 全部例句）</button>';}
function replayBind(f){var b=document.getElementById('replay');if(b)b.onclick=f;}
function ttsList(){var o={},r=[];if(window.Q4T)Object.keys(Q4T).forEach(function(k){var f='tts/'+Q4T[k];if(!o[f]){o[f]=1;r.push(f);}});return r;}
function offBox(p,title,desc,btn){return '<div class=hero id='+p+'offbox><div class=trow><b>'+title+'</b><span class=chip id='+p+'offchip>检查中…</span></div><p class=note style="margin:6px 0 8px">'+desc+'</p><div id='+p+'offbar class=obar style="display:none"><i></i></div><p><button class="btn go" id='+p+'offbtn>'+btn+'</button> <button class=btn id='+p+'offdel style="display:none">清除离线内容</button></p><p id='+p+'offmsg class=note></p></div>';}
function offInit(p,list,cn,noun){
 p=p||'';list=list||allAudio;cn=cn||OFFC;noun=noun||'录音';
 var chip=$('#'+p+'offchip'),btn=$('#'+p+'offbtn'),del=$('#'+p+'offdel'),msg=$('#'+p+'offmsg');if(!chip)return;
 if(!window.caches||location.protocol.indexOf('http')!==0){chip.textContent='不支持';btn.style.display='none';msg.textContent='当前浏览器或打开方式不支持离线存储（需通过网址访问）。';return;}
 function cnt(){return caches.open(cn).then(function(c){return Promise.all(list().map(function(f){return c.match(f);}));}).then(function(a){return a.filter(Boolean).length;});}
 function refresh(){cnt().then(function(n){var t=list().length;if(!$('#'+p+'offchip'))return;
  chip.textContent=n>=t?'已全部下载':n+' / '+t;btn.textContent=n>=t?'重新检查':(n?'继续下载（剩 '+(t-n)+' 个）':'下载全部'+noun);
  del.style.display=n>0?'':'none';});}
 refresh();
 btn.onclick=function(){if(OFFBUSY)return;OFFBUSY=true;btn.disabled=true;msg.textContent='';
  var bar=$('#'+p+'offbar');bar.style.display='';var fill=bar.firstChild;
  caches.open(cn).then(function(c){var L=list(),done=0,fail=0,i=0;
   function tick(){fill.style.width=Math.round(done/L.length*100)+'%';chip.textContent='下载中 '+done+' / '+L.length;}
   function one(){if(i>=L.length)return Promise.resolve();var f=L[i++];
    return c.match(f).then(function(m){if(m)return;return fetch(f).then(function(r){if(!r.ok||r.status!==200)throw 0;return c.put(f,r);});}).catch(function(){fail++;}).then(function(){done++;tick();return one();});}
   tick();
   return Promise.all([one(),one(),one(),one()]).then(function(){OFFBUSY=false;btn.disabled=false;bar.style.display='none';
    msg.textContent=fail?('有 '+fail+' 个没下载成功（网络问题），可再点一次继续。'):'完成。之后没有网络也能听'+noun+'；页面本身也已缓存。';refresh();});
  }).catch(function(e){OFFBUSY=false;btn.disabled=false;msg.textContent='下载失败：'+e;});};
 del.onclick=function(){if(confirm('清除已下载的离线'+noun+'？（不影响作答记录和背词进度）'))caches.delete(cn).then(function(){msg.textContent='已清除。';refresh();});};
}

/* ===== 卷子页 ===== */
function paper(id){
 setKeys(null);
 var p=PAP[id];if(!p){home();return;}
 var h='<h1>'+esc(p.name)+' · 即时应答</h1><p class=note>共 '+p.clips.length+' 题。绿色=答对，红色=答错，描边=在重听列表里。</p><p><a class="btn go" href="#/drill/paper/'+id+'">从第 1 题开始练</a></p><div class=pbtns>';
 p.clips.forEach(function(c){var l=S.log[c.key],w=S.wrong[c.key],cls='btn';if(l)cls+=l.ok?' ok':' ng';if(w&&w.box<5)cls+=' wk';
  h+='<a class="'+cls+'" href="#/clip/'+id+'/'+c.k+'">'+c.q+'</a>';});
 h+='</div><p><a class=btn href="#/listen">返回</a></p>';
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
 if(!q.length){render('<h1>没有题目</h1><p class=note>这个范围里没有可练的题。</p><a class=btn href="#/listen">返回</a>');return;}
 DRILL={q:q,i:0,ok:0,no:0,u:0,mode:mode,arg:arg};
 gotoClip(q[0]);
}
function gotoClip(key){var c=BYKEY[key];location.hash='#/clip/'+c.id+'/'+c.k;}
function drillNext(){
 if(!DRILL)return;DRILL.i++;
 if(DRILL.i>=DRILL.q.length){var d=DRILL;DRILL=null;setKeys(null);
  render('<h1>🎉 这组练完了</h1><p>共 '+d.q.length+' 题：答对 <b>'+d.ok+'</b>，答错 <b>'+d.no+'</b>；自评没听懂的已加入重听。</p>'+
   '<p><a class="btn go" href="#/drill/'+(d.mode==='paper'?'rand':d.mode)+(d.mode==='paper'?'':'')+'">再来一组</a> <a class=btn href="#/listen">回首页</a></p>');return;}
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
 h+='<p><a class=btn href="#/listen">返回</a></p>';
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
 h+='</table></div><p class=note>说明：「AI 判断」的答案没有对应的官方答案表，是我根据原文逻辑判断的；「AI 翻译」是没有现成中文译文时我自己翻的。每题的页面底部也会标出来源。</p><p><a class=btn href="#/listen">返回</a></p>';
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
 var h='<h1>背词</h1><p class=note>内置高频词表，进度只保存在这台设备上。每天按周计划学习 + 复习，🔊 可听读音和例句。</p>';
 h+=planBox(VT)+'<div class=hero><div class=trow><b>自由练习</b><span class=chip>词库共 '+tot+' 词</span></div><p class=note style="margin:6px 0">不计入周计划的学习进度（单纯测验的结果仍会更新复习安排）。</p><div class=rrow><a class=btn href="#/vocab/study">📖 单纯背词</a><a class=btn href="#/vocab/quiz">🎯 单纯测验</a></div></div>';
 h+='<h2>词表</h2><p class=note>文件格式：每行一个词，用 | 分隔：<b>单词 | 读音 | 意思 | 例句和讲解</b>（例句里的换行用 ¶ 表示），只写前两三列也行。导入时已有的词会更新读音、意思和例句，背词进度保留。</p>'+
  '<p><label class="btn go" style="display:inline-block;cursor:pointer">导入词表文件（.txt）<input type=file id=vfile accept=".txt,text/plain" style="display:none"></label> <button class=btn id=vexp>导出词表文件</button> <button class="btn bad" id=vclr>清空词库</button></p><p id=vmsg class=note></p>'+
  '';
 render(h);planBind(VT);
  $('#vfile').onchange=function(){var f=this.files[0];if(!f)return;var fr=new FileReader();fr.onload=function(){var r=vParse(String(fr.result||''));if(!r.add.length&&!r.upd){$('#vmsg').textContent='没有读到词。';return;}V.cards=V.cards.concat(r.add);vSave();vocab();$('#vmsg').textContent='新增 '+r.add.length+' 个词，更新 '+r.upd+' 个。';};fr.readAsText(f,'utf-8');};
 $('#vexp').onclick=function(){var t=V.cards.map(function(c){return [c.w,c.r,c.m,(c.x||'').replace(/\n/g,'¶')].join(' | ');}).join('\n');try{dlFile('q4-词表.txt',t+'\n');$('#vmsg').textContent='已导出 '+V.cards.length+' 个词。';}catch(e){$('#vmsg').textContent='导出失败。';}};
 $('#vclr').onclick=function(){if(confirm('确定清空词库和背词进度？')){V={cards:[],seed:window.Q4V?Q4V.ver:0};vSave();vocab();}};
}
function vocabGo(){
 vLoad();var q=shuffle(vDue()).concat(shuffle(vNew()).slice(0,10));
 if(!q.length){render('<h1>今天背完了</h1><p class=note>没有到期的词，也没有新词了。</p><a class=btn href="#/vocab">返回</a>');return;}
 VQT='all';VQ={q:q,i:0,start:0,fl:{},batch:[],qz:0,qzok:0,mode:'full'};vCard();
}
var VQT='all',VQS='due';
function vocabStudy(){
 vLoad();var q=shuffle(vDue()).concat(shuffle(vNew()).slice(0,10));
 if(!q.length){q=shuffle(V.cards).slice(0,10);}
 if(!q.length){render('<h1>词库是空的</h1><a class=btn href="#/vocab">返回</a>');return;}
 VQ={q:q,i:0,start:0,fl:{},batch:[],qz:0,qzok:0,mode:'study'};vCard();
}
function vocabQuizSetup(){
 setKeys(null);vLoad();
 render('<h1>单纯测验</h1><p class=note>只做选择题，不看单词卡。答对按自适应间隔安排复习，答错的词会安排今天重测。每轮 10 题。</p>'+
  '<h2>题型</h2><p><label><input type=radio name=qt value=all '+(VQT==='all'?'checked':'')+' style="width:auto"> 全部题型（读音 / 意思 / 汉字 / 例句填空）</label></p><p><label><input type=radio name=qt value=read '+(VQT==='read'?'checked':'')+' style="width:auto"> 仅测读音（只考汉字词，句中词怎么读）</label></p>'+
  '<h2>范围</h2><p><label><input type=radio name=qs value=due '+(VQS==='due'?'checked':'')+' style="width:auto"> 到期复习 + 新词（没有到期的就随机抽）</label></p><p><label><input type=radio name=qs value=all '+(VQS==='all'?'checked':'')+' style="width:auto"> 全部词随机</label></p>'+
  '<p><button class="btn go" id=qgo style="width:100%">开始测验</button> <a class=btn href="#/vocab">返回</a></p>');
 $('#qgo').onclick=function(){VQT=document.querySelector('input[name=qt]:checked').value;VQS=document.querySelector('input[name=qs]:checked').value;location.hash='#/vocab/quizgo';};
}
function vocabQuizGo(){
 vLoad();var pool=VQS==='all'?V.cards.slice():vDue().concat(vNew());
 if(VQT==='read')pool=pool.filter(function(c){return c.r&&c.r!==c.w&&hasKanji(c.w);});
 if(VQS==='due'&&pool.length<10){var more=V.cards.filter(function(c){return pool.indexOf(c)<0&&(VQT!=='read'||(c.r&&c.r!==c.w&&hasKanji(c.w)));});pool=pool.concat(shuffle(more));}
 pool=shuffle(pool).slice(0,10);
 if(pool.length<2){render('<h1>没有可测的词</h1><p class=note>词库里可考的词太少。</p><a class=btn href="#/vocab">返回</a>');return;}
 VQ={q:pool,i:pool.length,start:0,fl:{},batch:pool.slice(),qz:0,qzok:0,mode:'quiz'};vQuiz();
}
/* ===== 朗读：预合成神经网络语音（可选声音、可调语速），没有的才用设备自带语音 ===== */
var TKEY='q4tts_v1',TP={},TTSV=null;
try{TP=JSON.parse(localStorage.getItem(TKEY))||{};}catch(e){TP={};}
if(!TP.s)TP.s=.8;
var VOICES=[['gongitsune','Kokoro 日语女声']];
function tpSave(){try{localStorage.setItem(TKEY,JSON.stringify(TP));}catch(e){}}
function curVoice(){for(var i=0;i<VOICES.length;i++)if(VOICES[i][0]===TP.vo)return TP.vo;return VOICES[0][0];}
function loadVoice(v,cb){window.Q4TV=window.Q4TV||{};if(Q4TV[v]){if(cb)cb(true);return;}
 var el=document.createElement('script');el.src='tts/'+v+'/index.js?v='+encodeURIComponent(APPV.split(' ')[0]);
 el.onload=function(){if(cb)cb(!!Q4TV[v]);};el.onerror=function(){if(cb)cb(false);};document.head.appendChild(el);}
function jaVoices(){try{return speechSynthesis.getVoices().filter(function(v){return /^ja/i.test(v.lang);});}catch(e){return [];}}
function vScore(v){var n=v.name||'';return (/natural|neural|online|premium|enhanced|高品质|高品質|拡張/i.test(n)?10:0)+(/Google|Kyoko|Otoya|O-Ren|Nanami|Keita|Haruka|Ayumi|Sayaka|Ichiro|Mizuki/i.test(n)?5:0)+(v.localService?0:1);}
function ttsInit(){TTSV=jaVoices().sort(function(a,b){return vScore(b)-vScore(a);})[0]||null;}
if(window.speechSynthesis){ttsInit();try{speechSynthesis.onvoiceschanged=ttsInit;}catch(e){}}
var AU=null,QT=0;
function browserSay(t,cb){if(!window.speechSynthesis||!t){if(cb)cb();return;}try{speechSynthesis.cancel();if(!/[。！？!?]$/.test(t))t+='。';var u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';if(TTSV)u.voice=TTSV;u.rate=TP.s||.8;u.onend=function(){if(cb)cb();};u.onerror=function(){if(cb)cb();};speechSynthesis.speak(u);}catch(e){if(cb)cb();}}
function sayOne(t,cb){if(!t){if(cb)cb();return;}var v=curVoice();
 var go=function(){var m=window.Q4TV&&Q4TV[v],f=m&&m[t];
  if(f){try{speechSynthesis.cancel();}catch(e){}
   if(!AU)AU=new Audio();AU.onended=null;AU.onerror=null;try{AU.pause();}catch(e){}
   AU.defaultPlaybackRate=TP.s||.8;AU.src='tts/'+v+'/'+f;AU.playbackRate=TP.s||.8;try{AU.preservesPitch=true;AU.webkitPreservesPitch=true;}catch(e){}
   AU.onended=function(){if(cb)cb();};AU.onerror=function(){if(cb)cb();};
   var pr=AU.play();if(pr&&pr.catch)pr.catch(function(){browserSay(t,cb);});}
  else browserSay(t,cb);};
 if(window.Q4TV&&Q4TV[v])go();else loadVoice(v,go);}
function say(t){QT++;sayOne(t);}
/* 依次朗读多句（单词读音 + 全部例句）；再点任意 🔊 或换页会中断 */
function sayQ(list){var tok=++QT,i=0;list=list.filter(Boolean);
 (function next(){if(tok!==QT||i>=list.length)return;sayOne(list[i++],function(){if(tok===QT)setTimeout(next,350);});})();}
function topBar(){
 var sp=[.6,.7,.8,.9,1].map(function(r){return '<option value="'+r+'"'+((TP.s||.8)===r?' selected':'')+'>'+r+'x</option>';}).join(''),
  vo=VOICES.map(function(v){return '<option value="'+v[0]+'"'+(curVoice()===v[0]?' selected':'')+'>'+esc(v[1])+'</option>';}).join('');
 return '<div class=ver>语速 <select id=spd>'+sp+'</select>'+(VOICES.length>1?'　声音 <select id=vsel>'+vo+'</select>':'')+'　<span>版本 '+APPV+'</span></div>';}
function topBind(){var a=document.getElementById('spd'),b=document.getElementById('vsel');
 if(a)a.onchange=function(){TP.s=+this.value;tpSave();try{if(AU)AU.playbackRate=TP.s;}catch(e){}say('謝る');};
 if(b)b.onchange=function(){TP.vo=this.value;tpSave();loadVoice(TP.vo,function(){say('謝る');if(/^#?\/?(home)?$/.test(location.hash||''))route();});};}
function ttsList(){var v=curVoice(),m=window.Q4TV&&Q4TV[v],r=[],o={};if(m)Object.keys(m).forEach(function(k){var f='tts/'+v+'/'+m[k];if(!o[f]){o[f]=1;r.push(f);}});return r;}
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

function vAll(c){return [wordSay(c)].concat(exLines(c).map(function(l){return exSay(c,exParts(l).jp);}));}
function vBack(c){var h='<div style="font-size:1.3em">'+(c.r&&c.r!==c.w?esc(c.r)+' ':'')+spk(wordSay(c))+'</div><div style="margin-top:6px">'+esc(c.m)+'</div>';
 exLines(c).forEach(function(l){var p=exParts(l);h+='<div style="margin-top:4px;text-align:left;font-size:.92em;opacity:.9">'+esc(l)+' '+spk(exSay(c,p.jp))+'</div>';});
 return h;}

/* ===== 学习卡：上一个 / 下一个，每 5 个词出一轮选择题 ===== */
function vCard(){
 var Q=VQ;
 if(Q.i>=Q.q.length){if(Q.batch.length){vQuiz();return;}
  if(Q.mode==='study'){setKeys(null);render('<h1>看完了</h1><p class=note>这 '+Q.q.length+' 个词已看完。想检查记没记住，去做一轮测验。</p><p><a class="btn go" href="#/vocab/quiz">🎯 去测验</a> <button class=btn id=vagain>再看一组</button> <a class=btn href="#/vocab">返回</a></p>');$('#vagain').onclick=vocabStudy;return;}
  setKeys(null);render('<h1>这一组完成</h1><p class=note>小题答对 '+Q.qzok+' / '+Q.qz+'。答错的词已自动重背，并按记忆曲线安排之后的复习。</p><p>'+(Q.plan?'<a class="btn go" href="#/vocab">返回周计划</a>':'<button class="btn go" id=vagain>再来一组</button> <a class=btn href="#/vocab">返回</a>')+'</p>');if($('#vagain'))$('#vagain').onclick=vocabGo;return;}
 var c=Q.q[Q.i],shown=!!Q.fl[Q.i];
 var inB=Q.batch.indexOf(c)>=0,last=(inB?Q.batch.length:Q.batch.length+1)>=5||Q.i+1>=Q.q.length;
 render('<p class=note>'+(Q.i+1)+' / '+Q.q.length+(c.n?'':' · 新词')+(Q.mode==='study'?'':'　本轮第 '+(Q.i-Q.start+1)+' / 5 个')+'</p><div class=hero style="text-align:center"><div style="font-size:2.2em;margin:18px 0">'+esc(c.w)+'</div><div id=vback style="min-height:72px">'+(shown?vBack(c):'')+'</div></div>'+
  '<p id=vrow>'+(shown?replayBtn():'<button class="btn go" id=vflip style="width:100%">翻面（空格）</button>')+'</p>'+
  '<div class=rrow><button class=btn id=vprev'+(Q.i>(Q.mode==='study'?0:Q.start)?'':' disabled')+'>◀ 上一个</button><button class="btn go" id=vnext>'+(Q.mode==='study'?(Q.i+1>=Q.q.length?'完成 ▶':'下一个 ▶'):(last?'做小测 ▶':'下一个 ▶'))+'</button></div>');
 ttsBind();if(shown){replayBind(function(){sayQ(vAll(c));});sayQ(vAll(c));}
 function flip(){if(Q.fl[Q.i])return;Q.fl[Q.i]=1;$('#vback').innerHTML=vBack(c);$('#vrow').innerHTML=replayBtn();ttsBind();replayBind(function(){sayQ(vAll(c));});sayQ(vAll(c));}
 function next(){if(Q.mode==='study'){Q.i++;vCard();return;}if(Q.batch.indexOf(c)<0)Q.batch.push(c);Q.i++;if(Q.batch.length>=5||Q.i>=Q.q.length)vQuiz();else vCard();}
 function prev(){if(Q.i>(Q.mode==='study'?0:Q.start)){Q.i--;vCard();}}
 if($('#vflip'))$('#vflip').onclick=flip;
 $('#vnext').onclick=next;$('#vprev').onclick=prev;
 setKeys(function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!Q.fl[Q.i])flip();else next();}
  else if(e.key==='ArrowRight'){next();}else if(e.key==='ArrowLeft'){prev();}else if(e.key==='s'||e.key==='S'){sayQ(vAll(c));}});
}
/* —— 每 5 个词的小测：用例句 / 真题句选读音或意思 —— */
function hasKanji(w){return /[一-鿿]/.test(w);}
function pick(c,key,n,same){var pool=V.cards.filter(function(o){return o!==c&&o[key]&&o[key]!==c[key]&&(!same||same(o));});
 if(pool.length<n)pool=V.cards.filter(function(o){return o!==c&&o[key]&&o[key]!==c[key];});
 return shuffle(pool).slice(0,n).map(function(o){return o[key];});}
function mFirst(m){return String(m).replace(/[①-⑨⓪]/g,'').trim().split('；')[0].replace(/^\d[）)]\s*/,'').trim();}
function vMake(c){
 var T=['mean','mean'];if(c.r&&c.r!==c.w){T.push('read','read');if(hasKanji(c.w))T.push('kanji');}
 var ex=exLines(c).filter(function(l){return l.indexOf('～')>=0;})[0];if(ex)T.push('cloze','cloze');if(VQT==='read'&&c.r&&c.r!==c.w)T=['read'];
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
   render('<h1>小测 '+ok+' / '+qs.length+'</h1>'+qs.filter(function(x){return !x.right;}).map(function(x){return '<div class=hero style="text-align:left"><b>'+esc(x.c.w)+'</b>'+vBack(x.c)+'</div>';}).join('')+(ok<qs.length?'<p class=note>答错的词已加到队尾，马上重背，之后按记忆曲线再复习。</p>':'<p class=note>全对！</p>')+(Q.mode==='quiz'?'<p>'+(ok<qs.length?'<button class="btn go" id=vretry>错题再测 ('+(qs.length-ok)+')</button> ':'')+'<button class="btn go" id=vagain>'+(Q.review?'继续复习':'再来一轮')+'</button> '+(Q.review?'':'<a class=btn href="#/vocab/quiz">换设置</a> ')+'<a class=btn href="#/vocab">返回</a></p>':'<p><button class="btn go" id=vnext2>继续背词 →</button></p>'));
   ttsBind();
   if(Q.mode==='quiz'){Q.q=[];$('#vagain').onclick=Q.review?vocabPlanReview:vocabQuizGo;if($('#vretry'))$('#vretry').onclick=function(){Q.batch=qs.filter(function(x){return !x.right;}).map(function(x){return x.c;});vQuiz();};setKeys(null);return;}
   $('#vnext2').onclick=vCard;setKeys(function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();vCard();}});return;}
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
   c.n=1;c.bad=good?0:1;if(Q.plan&&V.plan)c.wk=V.plan.week;if(Q.review&&V.plan){V.plan.rv=V.plan.rv||{};V.plan.rv[dayNum()]=(V.plan.rv[dayNum()]||0)+1;}vSave();
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

/* ===== 语法背诵（N2 语法 200 句） ===== */
var GKEY='q4gram_v1',GP=null,GQ=null,GQT='all',GQS='due';
function gLoad(){try{GP=JSON.parse(localStorage.getItem(GKEY));}catch(e){GP=null;}if(!GP||!GP.c)GP={c:{}};}
function gSave(){try{localStorage.setItem(GKEY,JSON.stringify(GP));}catch(e){}}
function gList(){return window.Q4G||[];}
function gget(it){if(!GP)gLoad();return GP.c[it.n]||{n:0,box:0,due:0};}
function gDue(){if(!GP)gLoad();var t=dayNum();return gList().filter(function(it){var p=GP.c[it.n];return p&&p.n&&p.due<=t;});}
function gNew(){if(!GP)gLoad();return gList().filter(function(it){var p=GP.c[it.n];return !p||!p.n;});}
/* 自适应间隔：答对按难度系数拉长（答得快更长），答错缩短并今天重来 */
function sched(p,good,ms){var t=dayNum(),nxt;
 if(good){var iv0=p.iv||0,e=p.e||2.3;
  if(!iv0)p.iv=ms<8000?2:1;
  else{if(ms<6000)e=Math.min(3,e+.1);else if(ms>20000)e=Math.max(1.3,e-.1);p.e=e;p.iv=Math.min(180,Math.max(iv0+1,Math.round(iv0*e)));}
  p.box=(p.box||0)+1;p.due=t+p.iv;nxt='下次复习：'+p.iv+' 天后';}
 else{p.e=Math.max(1.3,(p.e||2.3)-.2);p.lp=(p.lp||0)+1;p.iv=0;p.box=0;p.due=t;nxt='已加到队尾重背，今天还会再出现';}
 p.n=1;return nxt;}
function gMeanOf(m){return String(m).replace(/^[①-⑩]/,'').trim();}
function gAll(it){var r=[];it.s.forEach(function(s){s.ex.forEach(function(e){r.push(e.jp);});});return r;}
function gBack(it){var h='';
 it.s.forEach(function(s){h+='<div style="margin-top:8px;text-align:left"><b>'+esc(s.m)+'</b></div>';
  s.ex.forEach(function(e){h+='<div style="margin-top:4px;text-align:left;font-size:.95em;line-height:2">'+e.rb+' '+spk(e.jp)+'<br><span class=note>'+esc(e.zh)+'</span></div>';});});
 return h;}

function gram(){
 setKeys(null);gLoad();var d=gDue().length,nw=gNew().length,tot=gList().length;
 var h='<h1>语法背诵</h1><p class=note>N2 语法 200 句，每天按周计划学习 + 复习，🔊 可听例句。</p>';
 h+=planBox(GT)+'<div class=hero><div class=trow><b>自由练习</b><span class=chip>共 '+tot+' 条</span></div><p class=note style="margin:6px 0">不计入周计划的学习进度（单纯测验的结果仍会更新复习安排）。</p><div class=rrow><a class=btn href="#/gram/study">📖 单纯背诵</a><a class=btn href="#/gram/quiz">🎯 单纯测验</a></div></div>';
 h+='<h2>全部语法</h2><details class=more><summary>展开查看 200 条（点开可看例句）</summary>'+
  gList().map(function(it){var p=gget(it);return '<details style="margin:6px 0"><summary><b>'+it.n+'. '+esc(it.g)+'</b>　<span class=note>'+esc(it.s.map(function(s){return gMeanOf(s.m);}).join(' / '))+(p.n?' · 已学':'')+'</span></summary>'+gBack(it)+'</details>';}).join('')+'</details>';
 render(h);planBind(GT);
}
function gStudy(){
 gLoad();var q=shuffle(gDue()).concat(shuffle(gNew()).slice(0,10));
 if(!q.length)q=shuffle(gList()).slice(0,10);
 GQ={q:q,i:0,start:0,fl:{},batch:[],qz:0,qzok:0,mode:'study'};gCard();
}
function gGo(){
 gLoad();var q=shuffle(gDue()).concat(shuffle(gNew()).slice(0,10));
 if(!q.length){render('<h1>今天学完了</h1><p class=note>没有到期的语法，也没有新语法了。</p><a class=btn href="#/gram">返回</a>');return;}
 GQT='all';GQ={q:q,i:0,start:0,fl:{},batch:[],qz:0,qzok:0,mode:'full'};gCard();
}
function gCard(){
 var Q=GQ,st=Q.mode==='study';
 if(Q.i>=Q.q.length){if(Q.batch.length){gQuiz();return;}
  setKeys(null);
  if(st){render('<h1>看完了</h1><p class=note>这 '+Q.q.length+' 条已看完。想检查记没记住，去做一轮测验。</p><p><a class="btn go" href="#/gram/quiz">🎯 去测验</a> <button class=btn id=gagain>再看一组</button> <a class=btn href="#/gram">返回</a></p>');$('#gagain').onclick=gStudy;return;}
  render('<h1>这一组完成</h1><p class=note>小题答对 '+Q.qzok+' / '+Q.qz+'。答错的已自动重背，并按自适应间隔安排之后的复习。</p><p>'+(Q.plan?'<a class="btn go" href="#/gram">返回周计划</a>':'<button class="btn go" id=gagain>再来一组</button> <a class=btn href="#/gram">返回</a>')+'</p>');if($('#gagain'))$('#gagain').onclick=gGo;return;}
 var it=Q.q[Q.i],shown=!!Q.fl[Q.i];
 var inB=Q.batch.indexOf(it)>=0,last=(inB?Q.batch.length:Q.batch.length+1)>=5||Q.i+1>=Q.q.length,lo=st?0:Q.start;
 render('<p class=note>'+(Q.i+1)+' / '+Q.q.length+(gget(it).n?'':' · 新语法')+(st?'':'　本轮第 '+(Q.i-Q.start+1)+' / 5 条')+'</p><div class=hero style="text-align:center"><div style="font-size:2em;margin:14px 0">'+it.gr+'</div><div id=gback>'+(shown?gBack(it):'')+'</div></div>'+
  '<p id=grow>'+(shown?replayBtn():'<button class="btn go" id=gflip style="width:100%">翻面（空格）</button>')+'</p>'+
  '<div class=rrow><button class=btn id=gprev'+(Q.i>lo?'':' disabled')+'>◀ 上一个</button><button class="btn go" id=gnext>'+(st?(Q.i+1>=Q.q.length?'完成 ▶':'下一个 ▶'):(last?'做小测 ▶':'下一个 ▶'))+'</button></div>');
 ttsBind();if(shown){replayBind(function(){sayQ(gAll(it));});sayQ(gAll(it));}
 function flip(){if(Q.fl[Q.i])return;Q.fl[Q.i]=1;$('#gback').innerHTML=gBack(it);$('#grow').innerHTML=replayBtn();ttsBind();replayBind(function(){sayQ(gAll(it));});sayQ(gAll(it));}
 function next(){if(st){Q.i++;gCard();return;}if(Q.batch.indexOf(it)<0)Q.batch.push(it);Q.i++;if(Q.batch.length>=5||Q.i>=Q.q.length)gQuiz();else gCard();}
 function prev(){if(Q.i>lo){Q.i--;gCard();}}
 if($('#gflip'))$('#gflip').onclick=flip;
 $('#gnext').onclick=next;$('#gprev').onclick=prev;
 setKeys(function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!Q.fl[Q.i])flip();else next();}else if(e.key==='ArrowRight'){next();}else if(e.key==='ArrowLeft'){prev();}});
}
function gQuizSetup(){
 setKeys(null);gLoad();
 render('<h1>语法 · 单纯测验</h1><p class=note>只做选择题，不看语法卡。答对按自适应间隔安排复习，答错的安排今天重测。每轮 10 题。</p>'+
  '<h2>题型</h2><p><label><input type=radio name=gt value=all '+(GQT==='all'?'checked':'')+' style="width:auto"> 全部题型</label></p><p><label><input type=radio name=gt value=mean '+(GQT==='mean'?'checked':'')+' style="width:auto"> 只考意思（看句子选意思）</label></p><p><label><input type=radio name=gt value=pattern '+(GQT==='pattern'?'checked':'')+' style="width:auto"> 只考语法形式（看意思选语法）</label></p><p><label><input type=radio name=gt value=cloze '+(GQT==='cloze'?'checked':'')+' style="width:auto"> 只做例句填空</label></p>'+
  '<h2>范围</h2><p><label><input type=radio name=gs value=due '+(GQS==='due'?'checked':'')+' style="width:auto"> 到期复习 + 新语法（不够 10 条就随机补）</label></p><p><label><input type=radio name=gs value=all '+(GQS==='all'?'checked':'')+' style="width:auto"> 全部语法随机</label></p>'+
  '<p><button class="btn go" id=gqgo style="width:100%">开始测验</button> <a class=btn href="#/gram">返回</a></p>');
 $('#gqgo').onclick=function(){GQT=document.querySelector('input[name=gt]:checked').value;GQS=document.querySelector('input[name=gs]:checked').value;location.hash='#/gram/quizgo';};
}
function gQuizGo(){
 gLoad();var all=gList(),ok=function(it){return GQT!=='cloze'||gClozeEx(it);};
 var pool=(GQS==='all'?all.slice():gDue().concat(gNew())).filter(ok);
 if(GQS==='due'&&pool.length<10){pool=pool.concat(shuffle(all.filter(function(it){return pool.indexOf(it)<0&&ok(it);})));}
 pool=shuffle(pool).slice(0,10);
 if(pool.length<2){render('<h1>没有可测的语法</h1><a class=btn href="#/gram">返回</a>');return;}
 GQ={q:pool,i:pool.length,start:0,fl:{},batch:pool.slice(),qz:0,qzok:0,mode:'quiz'};gQuiz();
}
/* —— 出题 —— */
function gForms(it){var out=[];it.g.split('/').forEach(function(part){part=part.replace(/[…～~]/g,'');
 var a=part.replace(/[(（][^)）]*[)）]/g,''),b=part.replace(/[()（）]/g,'');
 [b,a].forEach(function(x){if(x&&x.length>=2&&out.indexOf(x)<0)out.push(x);});});
 return out.sort(function(x,y){return y.length-x.length;});}
function gClozeEx(it){var forms=gForms(it),r=[];
 it.s.forEach(function(s){s.ex.forEach(function(e){for(var k=0;k<forms.length;k++){if(e.jp.indexOf(forms[k])>=0){r.push({e:e,f:forms[k],m:s.m});break;}}});});
 return r.length?r[Math.floor(Math.random()*r.length)]:null;}
function gPick(it,f,n){var pool=shuffle(gList().filter(function(o){return o!==it;})),out=[],seen={};
 for(var i=0;i<pool.length&&out.length<n;i++){var v=f(pool[i]);if(v&&!seen[v]){seen[v]=1;out.push(v);}}return out;}
function gMake(it){
 var T=['mean','pattern'],cz=gClozeEx(it);if(cz)T.push('cloze','cloze');
 var t=GQT==='all'||(GQT==='cloze'&&!cz)?T[Math.floor(Math.random()*T.length)]:GQT;
 if(t==='cloze'&&!cz)t='mean';
 var s=it.s[Math.floor(Math.random()*it.s.length)],e=s.ex[Math.floor(Math.random()*s.ex.length)];
 var q,ans,ops,say_=null;
 if(t==='mean'){var f=gForms(it).filter(function(x){return e.jp.indexOf(x)>=0;})[0],jp=esc(e.jp);
  if(f)jp=jp.split(esc(f)).join('<b>'+esc(f)+'</b>');
  q='句中的 <b>'+esc(it.g)+'</b> 是什么意思？<br>'+jp;ans=gMeanOf(s.m);
  ops=gPick(it,function(o){var x=o.s[Math.floor(Math.random()*o.s.length)];return gMeanOf(x.m);},3).filter(function(x){return x!==ans;});say_=e.jp;}
 else if(t==='pattern'){q='哪个语法表示「'+esc(gMeanOf(s.m))+'」？<br><span class=note>例：'+esc(e.zh)+'</span>';ans=it.g;
  ops=gPick(it,function(o){return o.g;},3).filter(function(x){return x!==ans;});}
 else{q='选一个填进 ＿＿ ：<br>'+esc(cz.e.jp.replace(cz.f,'＿＿'))+'<br><span class=note>'+esc(cz.e.zh)+'</span>';ans=it.g;
  ops=gPick(it,function(o){return o.g;},3).filter(function(x){return x!==ans;});s=null;e=cz.e;}
 return {it:it,t:t,q:q,ans:ans,say:e.jp,pre:t==='mean'?e.jp:null,ops:shuffle([ans].concat(ops))};
}
function gQuiz(){
 var Q=GQ,qs=Q.batch.map(gMake),i=0,ok=0;Q.batch=[];
 function show(){
  if(i>=qs.length){Q.qz+=qs.length;Q.qzok+=ok;Q.start=Q.i;setKeys(null);gSave();
   var wrong=qs.filter(function(x){return !x.right;});
   render('<h1>小测 '+ok+' / '+qs.length+'</h1>'+wrong.map(function(x){return '<div class=hero style="text-align:left"><b>'+esc(x.it.g)+'</b>'+gBack(x.it)+'</div>';}).join('')+(ok<qs.length?'<p class=note>答错的语法已加到队尾，马上重背，之后按自适应间隔再复习。</p>':'<p class=note>全对！</p>')+
    (Q.mode==='quiz'?'<p>'+(wrong.length?'<button class="btn go" id=gretry>错题再测 ('+wrong.length+')</button> ':'')+'<button class="btn go" id=gagain>'+(Q.review?'继续复习':'再来一轮')+'</button> '+(Q.review?'':'<a class=btn href="#/gram/quiz">换设置</a> ')+'<a class=btn href="#/gram">返回</a></p>':'<p><button class="btn go" id=gnext2>继续 →</button></p>'));
   ttsBind();
   if(Q.mode==='quiz'){Q.q=[];if($('#gretry'))$('#gretry').onclick=function(){Q.batch=wrong.map(function(x){return x.it;});gQuiz();};$('#gagain').onclick=Q.review?gPlanReview:gQuizGo;setKeys(null);return;}
   $('#gnext2').onclick=gCard;setKeys(function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();gCard();}});return;}
  var x=qs[i];x.t0=Date.now();
  render('<p class=note>小测 '+(i+1)+' / '+qs.length+'</p><div class=hero><div style="font-size:1.15em;line-height:1.9">'+x.q+(x.pre?' '+spk(x.pre):'')+'</div></div>'+
   x.ops.map(function(o,k){return '<p><button class="btn gop" data-k="'+k+'" style="width:100%;text-align:left">'+(k+1)+'. '+esc(o)+'</button></p>';}).join('')+'<div id=gres></div>');
  ttsBind();
  var done=false;
  function choose(k){if(done)return;done=true;var good=x.ops[k]===x.ans,it=x.it,p=Object.assign({},gget(it));x.right=good;
   var nxt=sched(p,good,Date.now()-x.t0);if(good)ok++;else Q.q.push(it);
   p.bad=good?0:1;if(Q.plan&&GP.plan)p.wk=GP.plan.week;if(Q.review&&GP.plan){GP.plan.rv=GP.plan.rv||{};GP.plan.rv[dayNum()]=(GP.plan.rv[dayNum()]||0)+1;}
   GP.c[it.n]=p;gSave();
   var bs=document.querySelectorAll('.gop');for(var j=0;j<bs.length;j++){bs[j].disabled=true;if(x.ops[j]===x.ans)bs[j].className+=' good';else if(j===k)bs[j].className+=' bad';}
   $('#gres').innerHTML='<p><b>'+(good?'答对了':'答错了，正确答案：'+esc(x.ans))+'</b> <span class=note>'+nxt+'</span></p><div class=hero style="text-align:left"><b>'+esc(it.g)+'</b>'+gBack(it)+'</div><p><button class="btn go" id=gnq>'+(i+1<qs.length?'下一题 →':'看结果')+'</button></p>';
   ttsBind();say(x.say);
   $('#gnq').onclick=function(){i++;show();};}
  var bs=document.querySelectorAll('.gop');for(var j=0;j<bs.length;j++)bs[j].onclick=function(){choose(+this.getAttribute('data-k'));};
  setKeys(function(e){var n=parseInt(e.key,10);if(!done&&n>=1&&n<=x.ops.length)choose(n-1);else if(done&&(e.key==='Enter'||e.key===' ')){e.preventDefault();i++;show();}});
 }
 show();
}

/* ===== 周计划 / 打卡 / 复习（单词、语法各自独立） ===== */
var PCAP=40;
function planReviewQueue(T){var t=dayNum(),bad=[],due=[];
 T.items().forEach(function(it){var p=T.p(it);if(!p.n)return;if(p.bad)bad.push(it);else if(p.due<=t)due.push(it);});
 due.sort(function(a,b){return T.p(a).due-T.p(b).due;});
 return shuffle(bad).concat(due);}
function planOrder(T,pl){var all=T.items(),keys=all.map(T.key);
 if(!pl.ord||!pl.ord.length){pl.ord=shuffle(keys);T.setPlan(pl);}
 var pos={};pl.ord.forEach(function(k,i){pos[k]=i;});
 return all.slice().sort(function(a,b){var x=pos[T.key(a)],y=pos[T.key(b)];return (x===undefined?1e9:x)-(y===undefined?1e9:y);});}
function planInfo(T){var pl=T.plan();if(!pl)return null;
 var t=dayNum(),items=planOrder(T,pl),total=items.length,per=Math.max(1,Math.ceil(total/7)),d=t-pl.start,over=d>=7,di=Math.max(0,Math.min(6,d)),cut=Math.min(total,(di+1)*per);
 var done=items.filter(function(it){return T.p(it).wk===pl.week;}).length;
 var undone=items.slice(0,cut).filter(function(it){return T.p(it).wk!==pl.week;});
 var rq=planReviewQueue(T),rv=(pl.rv&&pl.rv[t])||0,nb=rq.filter(function(it){return T.p(it).bad;}).length;
 return {pl:pl,t:t,total:total,per:per,d:d,over:over,di:di,done:done,undone:undone,rq:rq,nb:nb,rv:rv,
  learnDone:undone.length===0,revDone:rq.length===0||rv>=PCAP,checked:!!(pl.ck&&pl.ck[t])};}
function planStreak(I){var n=0,t=I.t,ck=I.pl.ck||{};if(!ck[t])t--;while(ck[t]){n++;t--;}return n;}
function planBrief(T){var I=planInfo(T);if(!I)return '尚未开始周计划';
 return '第 '+I.pl.week+' 周第 '+(I.over?7:I.di+1)+' 天 · 学习剩 '+I.undone.length+' · 复习 '+I.rq.length+' · '+(I.checked?'今日已打卡 ✓':'今日未打卡');}
function planBox(T){var I=planInfo(T),n=T.items().length;
 if(!I)return '<div class=hero><div class=trow><b>📅 周计划</b></div><p class=note>一周为一轮：把全部 '+n+' '+T.unit+'平均分到 7 天，每天约 '+Math.ceil(n/7)+' '+T.unit+'，先翻卡再做选择题；每天还要完成复习（答错的 + 按遗忘曲线到期的），然后打卡。第 2 周起再来一轮，同样翻卡 + 选择题。</p><p><button class="btn go" id=pstart style="width:100%">开始本周计划（今天算第 1 天）</button></p></div>';
 var pl=I.pl,cal='',cut=Math.min(I.total,(I.di+1)*I.per),dayOf=I.over?7:I.di+1;
 for(var k=0;k<7;k++){var day=pl.start+k,ck=pl.ck&&pl.ck[day],cls=ck?'ok':(day<I.t?'miss':(day===I.t?'today':'')),tx=ck?'✓':(day<I.t?'✗':(day===I.t?'●':''));
  cal+='<div class="pd '+cls+'"><i>'+tx+'</i><small>第'+(k+1)+'天</small></div>';}
 var pct=Math.round(I.done/I.total*100),lDone=cut-I.undone.length,lPct=Math.round(lDone/Math.max(1,cut)*100),
  streak=planStreak(I),rvTotal=I.rq.length+I.rv,rPct=I.revDone?100:Math.round(I.rv/Math.max(1,rvTotal)*100),ready=I.learnDone&&I.revDone;
 var h='<div class="hero plan"><div class=ph><div><div class=pwk>第 '+pl.week+' 周</div><div class=pdy>第 '+dayOf+' / 7 天</div></div><div class=pstreak><span>🔥</span><small>连续打卡</small><b>'+streak+'</b><small>天</small></div></div>'+
  '<div class=pmain><div class=ring style="--p:'+pct+'"><div><b>'+pct+'<small>%</small></b><span>本周已学</span></div></div><div class=ptasks>'+
  '<div class="ptask'+(I.learnDone?' done':'')+'"><div class=pti>'+(I.learnDone?'✓':'📘')+'</div><div class=ptb><div class=ptt>今日学习<em>'+(I.learnDone?'已完成':'还剩 '+I.undone.length+' '+T.unit)+'</em></div><div class=pbar><i style="width:'+lPct+'%"></i></div><small>累计目标：前 '+cut+' / '+I.total+'</small></div></div>'+
  '<div class="ptask'+(I.revDone?' done':'')+'"><div class=pti>'+(I.revDone?'✓':'🔁')+'</div><div class=ptb><div class=ptt>今日复习<em>'+(I.revDone?'已完成':'待复习 '+I.rq.length+' 个')+'</em></div><div class=pbar><i style="width:'+rPct+'%"></i></div><small>'+(I.revDone?(I.rv?'今天已复习 '+I.rv+' 个':'暂时没有要复习的'):'错题 '+I.nb+' · 到期 '+(I.rq.length-I.nb))+'</small></div></div></div></div>'+
  '<div class=pweek>'+cal+'</div>';
 if(I.over)h+='<div class=pover><p>这一周的 7 天已经结束，完成 '+I.done+' / '+I.total+'。</p><button class="btn go" id=pnext>开始第 '+(pl.week+1)+' 周</button></div>';
 else h+='<div class=pbtns><button class="btn pb" id=plearn'+(I.learnDone?' disabled':'')+'>📘 今日学习</button><button class="btn pb" id=prev'+(I.rq.length?'':' disabled')+'>🔁 今日复习</button></div>'+
  '<button class="pck'+(I.checked?' checked':(ready?' ready':''))+'" id=pck'+((ready&&!I.checked)?'':' disabled')+'><span class=pckm>'+(I.checked?'✓':'📌')+'</span><span>'+(I.checked?'今日已打卡':(ready?'今日打卡':'完成学习和复习后打卡'))+'</span></button>';
 return h+'</div>';}
function planBind(T){var I=planInfo(T),b;
 if((b=$('#pstart')))b.onclick=function(){T.setPlan({start:dayNum(),week:1,ck:{},rv:{},ord:shuffle(T.items().map(T.key))});T.page();};
 if(!I)return;
 if((b=$('#pnext')))b.onclick=function(){var pl=T.plan();T.setPlan({start:dayNum(),week:pl.week+1,ck:pl.ck||{},rv:pl.rv||{},ord:shuffle(T.items().map(T.key))});T.page();};
 if((b=$('#plearn')))b.onclick=function(){T.learn(shuffle(planInfo(T).undone));};
 if((b=$('#prev')))b.onclick=function(){T.review();};
 if((b=$('#pck')))b.onclick=function(){var pl=T.plan();pl.ck=pl.ck||{};pl.ck[dayNum()]=1;T.setPlan(pl);T.page();};}
var VT={key:function(c){return c.w;},name:'单词',unit:'个词',items:function(){if(!V)vLoad();return V.cards;},p:function(c){return c;},plan:function(){if(!V)vLoad();return V.plan;},setPlan:function(pl){V.plan=pl;vSave();},learn:function(l){vocabPlanLearn(l);},review:function(){vocabPlanReview();},page:function(){vocab();}};
var GT={key:function(it){return it.n;},name:'语法',unit:'条语法',items:function(){return gList();},p:function(it){if(!GP)gLoad();return GP.c[it.n]||{};},plan:function(){if(!GP)gLoad();return GP.plan;},setPlan:function(pl){GP.plan=pl;gSave();},learn:function(l){gPlanLearn(l);},review:function(){gPlanReview();},page:function(){gram();}};
function vocabPlanLearn(list){if(!V)vLoad();VQT='all';VQ={q:list.slice(),i:0,start:0,fl:{},batch:[],qz:0,qzok:0,mode:'full',plan:true};vCard();}
function vocabPlanReview(){if(!V)vLoad();var rq=planInfo(VT);
 if(!rq||!rq.rq.length){render('<h1>复习完成 ✓</h1><p class=note>现在没有需要复习的词了。</p><a class="btn go" href="#/vocab">返回</a>');return;}
 var pool=rq.rq.slice(0,10);VQT='all';VQ={q:pool,i:pool.length,start:0,fl:{},batch:pool.slice(),qz:0,qzok:0,mode:'quiz',review:true};vQuiz();}
function gPlanLearn(list){gLoad();GQT='all';GQ={q:list.slice(),i:0,start:0,fl:{},batch:[],qz:0,qzok:0,mode:'full',plan:true};gCard();}
function gPlanReview(){gLoad();var rq=planInfo(GT);
 if(!rq||!rq.rq.length){render('<h1>复习完成 ✓</h1><p class=note>现在没有需要复习的语法了。</p><a class="btn go" href="#/gram">返回</a>');return;}
 var pool=rq.rq.slice(0,10);GQT='all';GQ={q:pool,i:pool.length,start:0,fl:{},batch:pool.slice(),qz:0,qzok:0,mode:'quiz',review:true};gQuiz();}

/* ===== 首页：单词 / 语法 / 听力 三个栏目并列 ===== */
function hub(){
 setKeys(null);vLoad();gLoad();var st=stat();
 var h='<h1>N2 学习</h1><p class=note>单词背诵、语法背诵、听力即时应答，三个栏目的进度各自保存在这台设备上。</p><div class="grid hub">'+
  '<a class=card href="#/vocab"><b>📚 单词背诵</b><span>共 '+V.cards.length+' 词</span><span>'+planBrief(VT)+'</span></a>'+
  '<a class=card href="#/gram"><b>📖 语法背诵</b><span>共 '+gList().length+' 条</span><span>'+planBrief(GT)+'</span></a>'+
  '<a class=card href="#/listen"><b>🎧 听力即时应答</b><span>真题 '+D.papers.length+' 套 · 已作答 '+st.n+' / '+st.total+' · 到期重听 '+wrongDue().length+'</span></a></div>';
 h+='<details class=more><summary>设置与数据</summary><h3 style="margin:10px 0 4px">进度备份</h3><p class=note style="margin:0 0 6px">包含听力作答记录、单词进度和语法进度；换设备时导出，再到新设备导入。</p>'+bkBox()+
  offBox('t','📥 离线语音（当前所选声音）','把当前声音的单词和例句语音存到本机，之后没有网络也能听。换声音后需要再下载一次。','下载全部语音')+
  '<p class=note>语音合成：Kokoro（'+esc(VOICES.map(function(v){return v[1].replace(/（.*/,'');}).join(' / '))+'）。</p></details>';
 render(h);
 bkBind(hub);
 loadVoice(curVoice(),function(){offInit('t',ttsList,'q4tts-'+curVoice(),'语音');});
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
 else if(v==='vocab'){DRILL=null;if(p[1]==='go')vocabGo();else if(p[1]==='study')vocabStudy();else if(p[1]==='quiz')vocabQuizSetup();else if(p[1]==='quizgo')vocabQuizGo();else vocab();}
 else if(v==='listen'){DRILL=null;home();}
 else if(v==='gram'){DRILL=null;if(p[1]==='go')gGo();else if(p[1]==='study')gStudy();else if(p[1]==='quiz')gQuizSetup();else if(p[1]==='quizgo')gQuizGo();else gram();}
 else{DRILL=null;hub();}
}
load();loadVoice(curVoice());
/* 点击指向当前页面的链接（hash 没变）时也要重新渲染 */
document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href^="#/"]'):null;if(a&&a.getAttribute('href')===(location.hash||'#/home')){e.preventDefault();route();}});
window.addEventListener('hashchange',route);
route();
if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0)navigator.serviceWorker.register('sw.js').catch(function(){});
})();

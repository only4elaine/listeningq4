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
function nav(){return '<nav><a href="#/home">🏡 首页</a><a href="#/review">🔁 重听('+wrongOpen().length+')</a><a href="#/check">🔍 抽查清单</a></nav>';}
var audioEl=null;
function stopAudio(){if(audioEl){try{audioEl.pause();}catch(e){}audioEl=null;}}
function render(h){stopAudio();app.innerHTML=nav()+'<main>'+h+'</main>';window.scrollTo(0,0);}
var KEYH=null;
function setKeys(f){KEYH=f;}
document.addEventListener('keydown',function(e){if(KEYH&&!e.metaKey&&!e.ctrlKey&&!e.altKey)KEYH(e);});

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
 h+='<h2>按卷子练习</h2><div class=grid>';
 PLIST.forEach(function(p){var a=0,o=0;p.clips.forEach(function(c){var l=S.log[c.key];if(l){a++;if(l.ok)o++;}});
  h+='<a class=card href="#/paper/'+p.id+'"><b>'+esc(p.name)+'</b><span>已练 '+a+' / '+p.clips.length+(a?' · 答对 '+o:'')+'</span></a>';});
 h+='</div>';
 if(D.missing&&D.missing.length){h+='<h2>暂缺</h2>';D.missing.forEach(function(m){h+='<p class=note>· '+esc(m.name)+'：'+esc(m.why)+'</p>';});}
 h+='<details class=more><summary>设置与数据</summary>'+
  '<p><label><input type=checkbox id=once '+(S.prefs.once?'checked':'')+' style="width:auto"> 真题模式：题目只播放一遍（答题前不能重听）</label></p>'+
  '<p><button class=btn id=exp>导出进度</button> <button class="btn bad" id=rst>清除全部进度</button></p><p id=msg class=note></p></details>';
 render(h);
 $('#once').onchange=function(){S.prefs.once=this.checked;save();};
 $('#exp').onclick=function(){var t=JSON.stringify(S);if(navigator.clipboard){navigator.clipboard.writeText(t).then(function(){$('#msg').textContent='已复制到剪贴板（'+t.length+' 字符）';});}else{$('#msg').textContent=t;}};
 $('#rst').onclick=function(){if(confirm('确定清除全部作答记录和重听列表？')){S.log={};S.wrong={};save();home();}};
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

/* ===== 路由 ===== */
function route(){
 var p=(location.hash||'#/home').replace(/^#\/?/,'').split('/');
 var v=p[0]||'home';
 if(v==='clip')clip(p[1],p[2]);
 else if(v==='paper'){DRILL=null;paper(p[1]);}
 else if(v==='drill'){startDrill(p[1],p[2]);}
 else if(v==='review'){DRILL=null;review();}
 else if(v==='check'){DRILL=null;check();}
 else{DRILL=null;home();}
}
load();
window.addEventListener('hashchange',route);
route();
if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0)navigator.serviceWorker.register('sw.js').catch(function(){});
})();

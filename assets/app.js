/* =========================================================================
   Code & Drive — Level 2 · Interactive Session Engine (vanilla JS)
   ========================================================================= */
(function(){
  "use strict";

  /* ---- scroll progress bar --------------------------------------------- */
  var bar = document.querySelector(".progress");
  function onScroll(){
    if(!bar) return;
    var h = document.documentElement;
    var p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    bar.style.width = (p*100).toFixed(2) + "%";
  }
  window.addEventListener("scroll", onScroll, {passive:true});
  onScroll();

  /* ---- reveal on scroll ------------------------------------------------- */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target);} });
  },{threshold:.12});
  document.querySelectorAll(".reveal").forEach(function(el){ io.observe(el); });

  /* ---- active nav highlight -------------------------------------------- */
  var here = location.pathname.split("/").pop();
  document.querySelectorAll(".topbar nav a").forEach(function(a){
    if(a.getAttribute("href") === here) a.classList.add("active");
  });

  /* ---- light / dark theme toggle --------------------------------------- */
  (function(){
    var root = document.documentElement;
    var saved = null;
    try{ saved = localStorage.getItem("cnd-theme"); }catch(e){}
    if(saved) root.setAttribute("data-theme", saved);
    function isLight(){ return root.getAttribute("data-theme") === "light"; }
    var topbar = document.querySelector(".topbar");
    if(!topbar) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    btn.setAttribute("aria-label", "Toggle light and dark mode");
    function paint(){ btn.textContent = isLight() ? "🌙" : "☀️"; btn.title = isLight() ? "Switch to dark" : "Switch to light"; }
    paint();
    btn.addEventListener("click", function(){
      var next = isLight() ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try{ localStorage.setItem("cnd-theme", next); }catch(e){}
      paint();
    });
    (topbar.querySelector("nav") || topbar).appendChild(btn);
  })();

  /* ---- terminal typer --------------------------------------------------- */
  // <div class="term" data-type='[["$ ","cmd\n","out\n"], ...]'>
  function typeTerminal(el){
    var body = el.querySelector(".body");
    var lines;
    try{ lines = JSON.parse(el.getAttribute("data-type")); }catch(e){ return; }
    body.innerHTML = "";
    var cur = document.createElement("span"); cur.className="cursor";
    body.appendChild(cur);
    var li=0, ci=0, buf="";
    function tick(){
      if(li>=lines.length){ return; }
      var seg = lines[li]; // [text, cls, speed]
      var text = seg[0], cls = seg[1]||"", speed = seg[2]||18;
      if(ci < text.length){
        var ch = text[ci++];
        cur.insertAdjacentHTML("beforebegin", escapeChar(ch, cls));
        setTimeout(tick, ch==="\n"?120:speed);
      }else{ li++; ci=0; setTimeout(tick, 180); }
    }
    function escapeChar(ch, cls){
      var safe = ch.replace(/&/g,"&amp;").replace(/</g,"&lt;");
      return cls ? "<span class='"+cls+"'>"+safe+"</span>" : safe;
    }
    var started=false;
    var t=new IntersectionObserver(function(en){
      en.forEach(function(e){ if(e.isIntersecting && !started){ started=true; tick(); t.disconnect(); } });
    },{threshold:.3});
    t.observe(el);
  }
  document.querySelectorAll(".term[data-type]").forEach(typeTerminal);

  /* ---- tabs ------------------------------------------------------------- */
  document.querySelectorAll("[data-tabs]").forEach(function(group){
    var btns = group.querySelectorAll(".tabs button");
    var panes = group.querySelectorAll(".tabpane");
    btns.forEach(function(b,i){
      b.addEventListener("click", function(){
        btns.forEach(function(x){x.classList.remove("active");});
        panes.forEach(function(x){x.classList.remove("active");});
        b.classList.add("active");
        if(panes[i]) panes[i].classList.add("active");
      });
    });
    if(btns[0]) btns[0].click();
  });

  /* ---- quiz ------------------------------------------------------------- */
  document.querySelectorAll(".quiz").forEach(function(q){
    var correct = q.getAttribute("data-answer");
    var fb = q.querySelector(".fb");
    q.querySelectorAll(".opt").forEach(function(opt){
      opt.addEventListener("click", function(){
        var val = opt.getAttribute("data-k");
        q.querySelectorAll(".opt").forEach(function(o){o.disabled=true;});
        if(val===correct){ opt.classList.add("correct"); if(fb) fb.textContent = "✓ "+(q.getAttribute("data-good")||"Correct!"); }
        else{
          opt.classList.add("wrong");
          q.querySelectorAll(".opt").forEach(function(o){ if(o.getAttribute("data-k")===correct) o.classList.add("correct"); });
          if(fb) fb.textContent = "✗ "+(q.getAttribute("data-bad")||"Not quite — see the highlighted answer.");
        }
      });
    });
  });

  /* ---- inline jargon terms: tap to toggle on touch --------------------- */
  document.addEventListener("click", function(e){
    var t = e.target.closest(".jt");
    document.querySelectorAll(".jt.open").forEach(function(j){ if(j!==t) j.classList.remove("open"); });
    if(t){ t.classList.toggle("open"); }
  });

  /* ---- expose small helpers for per-page demos ------------------------- */
  window.CnD = {
    clamp:function(v,a,b){return Math.max(a,Math.min(b,v));},
    lerp:function(a,b,t){return a+(b-a)*t;}
  };
})();

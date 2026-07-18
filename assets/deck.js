/* =========================================================================
   Code & Drive — Level 2 · DECK ENGINE (vanilla JS, no dependencies)
   Turns <main class="deck"> with .slide children into a keyboard/click deck.
   - -> / Space / PageDown / click : next fragment, else next slide
   - <- / PageUp / Backspace       : previous
   - Home / End                    : first / last slide
   - O or Esc                      : overview (jump menu)
   - F                             : fullscreen
   Slides can contain .frag elements that build in one advance at a time.
   ========================================================================= */
(function(){
  "use strict";
  var deck = document.querySelector("main.deck") || document.querySelector(".deck");
  if(!deck) return;
  document.body.classList.add("deck-mode");

  /* explicit .slide markup wins; otherwise auto-convert direct <section>s */
  var slides = [].slice.call(deck.querySelectorAll(":scope > .slide"));
  if(!slides.length){
    slides = [].slice.call(deck.querySelectorAll(":scope > section"));
    slides.forEach(function(s){ s.classList.add("slide"); });
  }
  if(!slides.length) return;

  /* wrap loose content in .slide-inner and derive a title from the heading */
  slides.forEach(function(s){
    if(!s.querySelector(":scope > .slide-inner")){
      var inner = document.createElement("div");
      inner.className = "slide-inner";
      while(s.firstChild){ inner.appendChild(s.firstChild); }
      s.appendChild(inner);
    }
    if(!s.getAttribute("data-title")){
      var h = s.querySelector("h1,h2,h3");
      if(h) s.setAttribute("data-title", h.textContent.trim().slice(0,42));
    }
  });

  /* auto-fragment session slides that don't author their own .frag, so
     content reveals part-by-part: words (term, then meaning) and stacks
     (one layer at a time, top to bottom) instead of the whole slide at once.
     Only the slide's TITLE block stays pinned; every section below it —
     sub-headings, leads and their content — builds in strictly in order. */
  var AF_STAY  = "h1,h2,.eyebrow,.kicker";
  var AF_GROUP = ".wstack,.stack,.lstack,.archmap,.col,.grid,.g2,.g3,.g4,.steps,.sflow,.pipe,.cards,.primer,.gloss";
  function afWalk(node){
    [].slice.call(node.children).forEach(function(ch){
      if(ch.nodeType !== 1) return;
      if(ch.matches("dl")){
        [].slice.call(ch.children).forEach(function(d){
          if(d.matches("dt,dd")) d.classList.add("frag");
        });
      } else if(ch.matches(AF_GROUP)){
        ch.classList.add("af-group");   // stays hidden until its first frag builds in
        afWalk(ch);
      } else if(ch.matches(AF_STAY)){
        /* heading / label stays visible for context */
      } else {
        ch.classList.add("frag");
      }
    });
  }
  slides.forEach(function(s){
    var inner = s.querySelector(":scope > .slide-inner") || s;
    if(inner.querySelector(".frag")) return;   // author already controls the builds
    [].slice.call(inner.querySelectorAll(".reveal")).forEach(function(e){
      e.classList.remove("reveal");            // deck now drives visibility via .frag
    });
    afWalk(inner);
  });

  /* cache fragments per slide, in DOM order */
  slides.forEach(function(s){
    s._frags = [].slice.call(s.querySelectorAll(".frag"));
  });

  var si = 0;   // slide index
  var fi = 0;   // fragments revealed on current slide

  /* ---- build chrome ----------------------------------------------------- */
  var bar = document.createElement("div"); bar.className = "deck-bar"; document.body.appendChild(bar);

  var ui = document.createElement("div"); ui.className = "deck-ui";
  ui.innerHTML =
    '<button class="db" data-act="prev" title="Previous (\u2190)">\u2190</button>'+
    '<span class="deck-count"><b id="dcCur">1</b> / <span id="dcTot">'+slides.length+'</span></span>'+
    '<button class="db next" data-act="next" title="Next (\u2192 / Space)">\u2192</button>'+
    '<span class="deck-title" id="dcTitle"></span>'+
    '<span class="spacer"></span>'+
    '<button class="db" data-act="ov" title="Overview (O)">\u25a6</button>'+
    '<button class="db" data-act="fs" title="Fullscreen (F)">\u26f6</button>';
  document.body.appendChild(ui);

  var hint = document.createElement("div"); hint.className = "deck-hint";
  hint.innerHTML = "Press <kbd>\u2192</kbd> or <kbd>Space</kbd> to advance \u00b7 <kbd>O</kbd> for overview";
  document.body.appendChild(hint);

  var ov = document.createElement("div"); ov.className = "deck-ov";
  var ovInner = '<button class="ovclose" data-act="ov">close \u2715</button><h3>Jump to slide</h3><div class="ovgrid">';
  slides.forEach(function(s,i){
    var t = s.getAttribute("data-title") || ("Slide "+(i+1));
    ovInner += '<button class="ovcard" data-go="'+i+'"><span class="oi">'+
      String(i+1).padStart(2,"0")+'</span><span class="ot">'+t+'</span></button>';
  });
  ovInner += '</div>';
  ov.innerHTML = ovInner;
  document.body.appendChild(ov);

  var elCur = document.getElementById("dcCur");
  var elTitle = document.getElementById("dcTitle");
  var btnPrev = ui.querySelector('[data-act="prev"]');
  var btnNext = ui.querySelector('[data-act="next"]');

  /* ---- rendering -------------------------------------------------------- */
  function applyFrags(s, n){
    s._frags.forEach(function(f,i){ f.classList.toggle("in", i < n); });
  }
  function render(){
    slides.forEach(function(s,i){
      s.classList.toggle("active", i===si);
      s.classList.toggle("past", i<si);
    });
    var s = slides[si];
    applyFrags(s, fi);
    if(elCur) elCur.textContent = (si+1);
    if(elTitle) elTitle.textContent = s.getAttribute("data-title") || "";
    bar.style.width = (slides.length<2?100:(si/(slides.length-1))*100).toFixed(1)+"%";
    btnPrev.disabled = (si===0 && fi===0);
    btnNext.disabled = (si===slides.length-1 && fi>=s._frags.length);
    ov.querySelectorAll(".ovcard").forEach(function(c,i){ c.classList.toggle("cur", i===si); });
    if(location.hash !== "#"+(si+1)) history.replaceState(null,"","#"+(si+1));
  }

  function goTo(i, atEnd){
    i = Math.max(0, Math.min(slides.length-1, i));
    si = i;
    fi = atEnd ? slides[si]._frags.length : 0;
    render();
    /* land at the natural reading position of the new slide */
    var s = slides[si];
    s.scrollTop = atEnd ? s.scrollHeight : 0;
    if(atEnd) ensureVisible(s._frags[s._frags.length-1]);
  }
  /* when a slide is taller than the viewport, bring the just-revealed
     fragment into view so a presenter clicker works without manual scrolling */
  function ensureVisible(frag){
    var s = slides[si];
    if(!s || !frag) return;
    var vh = s.clientHeight;
    if(s.scrollHeight <= vh + 4) return;          // slide fits — nothing to do
    var topPad = 92, botPad = 92;                 // clear top bar & bottom controls
    var ftop = frag.offsetTop, fbot = ftop + frag.offsetHeight;
    var target = s.scrollTop;
    if(fbot > s.scrollTop + vh - botPad) target = fbot - vh + botPad;
    if(ftop < s.scrollTop + topPad)      target = ftop - topPad;
    target = Math.max(0, Math.min(target, s.scrollHeight - vh));
    if(Math.abs(target - s.scrollTop) > 2) s.scrollTo({top:target, behavior:"smooth"});
  }
  function next(){
    var s = slides[si];
    if(fi < s._frags.length){ fi++; render(); ensureVisible(s._frags[fi-1]); }
    else if(si < slides.length-1){ goTo(si+1, false); }
  }
  function prev(){
    if(fi > 0){
      fi--; render();
      var s = slides[si];
      if(fi > 0) ensureVisible(s._frags[fi-1]);
      else s.scrollTo({top:0, behavior:"smooth"});
    }
    else if(si > 0){ goTo(si-1, true); }
  }

  /* ---- overview --------------------------------------------------------- */
  function toggleOv(force){
    var open = (typeof force==="boolean") ? force : !ov.classList.contains("open");
    ov.classList.toggle("open", open);
  }

  /* ---- fullscreen ------------------------------------------------------- */
  function toggleFs(){
    if(!document.fullscreenElement){ (document.documentElement.requestFullscreen||function(){})(); }
    else if(document.exitFullscreen){ document.exitFullscreen(); }
  }

  /* ---- interactions ----------------------------------------------------- */
  function killHint(){ hint.classList.add("gone"); }

  ui.addEventListener("click", function(e){
    var b = e.target.closest("[data-act]"); if(!b) return;
    var a = b.getAttribute("data-act");
    if(a==="next"){ next(); killHint(); }
    else if(a==="prev"){ prev(); }
    else if(a==="ov"){ toggleOv(); }
    else if(a==="fs"){ toggleFs(); }
  });
  ov.addEventListener("click", function(e){
    var go = e.target.closest("[data-go]");
    if(go){ goTo(parseInt(go.getAttribute("data-go"),10), false); toggleOv(false); return; }
    if(e.target.closest("[data-act]") || e.target===ov){ toggleOv(false); }
  });

  /* click a slide to advance — but never when clicking interactive things */
  deck.addEventListener("click", function(e){
    if(e.target.closest("a,button,input,select,textarea,label,.node,.layer,.tabs,.no-advance,svg")) return;
    next(); killHint();
  });

  /* in-slide anchor links (#some-id) jump to the slide that contains them */
  deck.addEventListener("click", function(e){
    var a = e.target.closest('a[href^="#"]');
    if(!a) return;
    var id = a.getAttribute("href").slice(1);
    if(!id || /^\d+$/.test(id)) return;
    var tgt = document.getElementById(id) ||
              deck.querySelector('[name="'+id+'"]');
    var host = tgt && tgt.closest(".slide");
    if(host){
      var i = slides.indexOf(host);
      if(i>=0){ e.preventDefault(); goTo(i,false); killHint(); }
    }
  });

  document.addEventListener("keydown", function(e){
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    var tag = (e.target.tagName||"").toLowerCase();
    var k = e.key;
    if(ov.classList.contains("open")){
      if(k==="Escape"||k==="o"||k==="O"){ toggleOv(false); e.preventDefault(); }
      return;
    }
    switch(k){
      case "ArrowRight": case "PageDown": case " ": case "Spacebar":
        if((k===" "||k==="Spacebar") && (tag==="button"||tag==="a"||tag==="input")) return;
        next(); killHint(); e.preventDefault(); break;
      case "ArrowLeft": case "PageUp": case "Backspace":
        prev(); e.preventDefault(); break;
      case "ArrowDown": next(); killHint(); e.preventDefault(); break;
      case "ArrowUp": prev(); e.preventDefault(); break;
      case "Home": goTo(0,false); e.preventDefault(); break;
      case "End": goTo(slides.length-1,false); e.preventDefault(); break;
      case "o": case "O": toggleOv(); e.preventDefault(); break;
      case "Escape": toggleOv(true); e.preventDefault(); break;
      case "f": case "F": toggleFs(); e.preventDefault(); break;
    }
  });

  window.addEventListener("hashchange", function(){
    var n = parseInt((location.hash||"").replace("#",""),10);
    if(n && n>=1 && n<=slides.length && (n-1)!==si){ goTo(n-1,false); }
  });

  /* expose for other page scripts (e.g. per-slide demos) */
  window.Deck = { next:next, prev:prev, goTo:goTo, current:function(){return si;} };

  /* ---- boot ------------------------------------------------------------- */
  var start = parseInt((location.hash||"").replace("#",""),10);
  if(start && start>=1 && start<=slides.length) si = start-1;
  render();
  setTimeout(killHint, 5000);
})();

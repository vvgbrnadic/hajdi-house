(function(){
  async function tryFetch(url){
    try{
      const r = await fetch(url + '?v=' + Date.now(), {cache:'no-store'});
      if(!r.ok) return null;
      const t = await r.text();
      if(t.trim().startsWith('<')) return null; // dobili smo index.html umjesto JSONa
      return JSON.parse(t);
    }catch(e){ return null; }
  }
  async function load(){
    let cfg = await tryFetch('/public/js/config.json');
    if(!cfg) cfg = await tryFetch('/js/config.json');
    if(!cfg) cfg = await tryFetch('/config.json');
    if(!cfg || !cfg.hero) { console.log('Hajdi loader: nema config'); return; }
    const imgs = document.querySelectorAll('img[alt="Hajdi House"]');
    if(cfg.hero.image && imgs.length){
      imgs.forEach(img=>{ img.src = cfg.hero.image; });
      console.log('Hajdi: image ->', cfg.hero.image);
    }
    if(typeof cfg.hero.blur !== 'undefined'){
      const b = cfg.hero.blur + 'px';
      imgs.forEach(img=>{ img.style.filter = 'blur('+b+')'; });
      console.log('Hajdi: blur ->', b);
    }
  }
  load(); setTimeout(load, 600); setTimeout(load, 1500); setTimeout(load, 3000);
})();

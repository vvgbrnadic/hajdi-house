(function(){
  async function load(){
    try{
      const res = await fetch('/js/config.json?v=' + Date.now(), {cache:'no-store'});
      if(!res.ok) return;
      const cfg = await res.json();
      if(!cfg.hero) return;
      const imgs = document.querySelectorAll('img[alt="Hajdi House"]');
      if(cfg.hero.image){
        imgs.forEach(img=>{
          img.src = cfg.hero.image;
        });
        console.log('Hajdi: hero image ->', cfg.hero.image);
      }
      if(typeof cfg.hero.blur !== 'undefined'){
        const b = cfg.hero.blur + 'px';
        imgs.forEach(img=>{
          img.style.filter = 'blur(' + b + ')';
        });
        // probaj i karticu s koordinatama
        document.querySelectorAll('div').forEach(el=>{
          if(el.textContent && el.textContent.includes('KOORDINATE')){
            const card = el.closest('div');
            if(card){
              card.style.backdropFilter = 'blur(' + b + ')';
              card.style.webkitBackdropFilter = 'blur(' + b + ')';
            }
          }
        });
        console.log('Hajdi: blur ->', b);
      }
    }catch(e){ console.log('hero-loader err', e); }
  }
  load();
  setTimeout(load, 600);
  setTimeout(load, 1500);
  setTimeout(load, 3000);
})();

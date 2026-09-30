/* Noctis Mourning Vale v0.15.3 — Single Build Version Authority */
(() => {
  const CURRENT_BUILD = "0.15.3";
  window.NOCTIS_CURRENT_BUILD = CURRENT_BUILD;
  function forceBuildBadge(){
    const badge=document.getElementById("buildBadge");
    if(!badge)return;
    const wanted="v"+CURRENT_BUILD;
    if(badge.textContent!==wanted)badge.textContent=wanted;
  }
  forceBuildBadge();
  const badge=document.getElementById("buildBadge");
  if(badge)new MutationObserver(forceBuildBadge).observe(badge,{childList:true,characterData:true,subtree:true});
  document.addEventListener("click",e=>{if(e.target?.closest?.(".tab"))requestAnimationFrame(forceBuildBadge)});
  window.addEventListener("pageshow",forceBuildBadge);
})();

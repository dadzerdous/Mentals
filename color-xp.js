// Color mastery and Flexible Mixing Buckets.
function colorXpNeeded(){return COLOR_PROFICIENCY_XP;}
function isMixedColor(color){return !!baseRecipes.concat(whiteRecipes).find(r=>r.result===color);}
function isColorProficient(color){return !!proficientColors[color];}
function addColorXp(color,amount){
  if(!color||!isMixedColor(color))return;
  amount=Math.max(0,Math.floor(amount||0)); if(!amount)return;
  colorXp[color]=(colorXp[color]||0)+amount;
  if(!proficientColors[color]&&colorXp[color]>=COLOR_PROFICIENCY_XP){
    proficientColors[color]=true;
    showMajorNotice("reward",`${colorInfo[color].label} is now proficient. You can use it in a Flexible Mixing Bucket.`,{title:`${colorInfo[color].label} Proficiency!`,icon:colorInfo[color].emoji});
  }
  saveState();
}
function recordColorMade(color){colorTimesMade[color]=(colorTimesMade[color]||0)+1;addColorXp(color,2);}
function proficientMixedColors(){return Object.keys(colorInfo).filter(c=>isMixedColor(c)&&isColorDiscovered(c)&&isColorProficient(c));}
function assignFlexibleBucket(index,color){
  if(index<0||index>=flexibleBucketCount||!isColorProficient(color))return;
  flexibleBucketColors[index]=color;
  closeFlexibleColorPicker();
  renderFlexibleBuckets();
  saveState();
}

function emptyFlexibleBucket(index){
  if(index<0||index>=flexibleBucketCount)return;
  flexibleBucketColors[index]=null;
  renderFlexibleBuckets();
  saveState();
}

let pendingFlexibleBucketIndex = null;

function openFlexibleColorPicker(index){
  const choices=proficientMixedColors();
  if(!choices.length){
    say("Become proficient with a mixed color first");
    return;
  }

  pendingFlexibleBucketIndex=index;

  const overlay=document.querySelector("#flexColorPickerOverlay");
  const grid=document.querySelector("#flexColorPickerGrid");
  if(!overlay||!grid)return;

  grid.innerHTML="";

  choices.forEach(color=>{
    const info=colorInfo[color];
    const btn=document.createElement("button");
    btn.className="flexColorChoice";
    btn.innerHTML=`
      <span class="flexColorBall" style="background:${paintSplatColors[color] || "#999"}"></span>
      <span class="flexColorChoiceName">${info.label}</span>
      <span class="flexColorChoiceMastery">★ Proficient</span>
    `;
    btn.addEventListener("click",()=>{
      assignFlexibleBucket(index,color);
    });
    grid.appendChild(btn);
  });

  overlay.classList.add("open");
}

function closeFlexibleColorPicker(){
  pendingFlexibleBucketIndex=null;
  document.querySelector("#flexColorPickerOverlay")?.classList.remove("open");
}

document.querySelector("#flexColorPickerCloseBtn")?.addEventListener("click",closeFlexibleColorPicker);
document.querySelector("#flexColorPickerOverlay")?.addEventListener("click",event=>{
  if(event.target.id==="flexColorPickerOverlay")closeFlexibleColorPicker();
});

function flexibleBucketDefaultPosition(index,field){
  const fieldRect=field.getBoundingClientRect();
  const bucketSize=78;
  const maxLeft=Math.max(0,fieldRect.width-bucketSize);
  const maxTop=Math.max(0,fieldRect.height-bucketSize);

  // Keep new mixed buckets in the useful central canvas zone.
  const presets=[
    {x:.48,y:.34},
    {x:.68,y:.48},
    {x:.32,y:.56}
  ];
  const preset=presets[index]||{x:.50,y:.50};

  return {
    left:Math.round(maxLeft*preset.x),
    top:Math.round(maxTop*preset.y)
  };
}

function renderFlexibleBuckets(){
  const field=document.querySelector("#field");
  if(!field)return;

  field.querySelectorAll(".flexibleBucket").forEach(el=>el.remove());

  for(let index=0;index<flexibleBucketCount;index++){
    const color=flexibleBucketColors[index]||null;
    const id=`flexibleBucket${index}`;
    const el=document.createElement("div");

    el.className="source flexibleBucket";
    el.id=id;
    el.dataset.flexIndex=String(index);
    el.dataset.positionKey=id;

    if(color){
      el.dataset.color=color;
      el.style.background=paintSplatColors[color] || "#999";
      el.innerHTML=`
        <span class="flexBucketCenterDot" style="background:${paintSplatColors[color] || "#999"}"></span>
        <small>${dollyMode ? "Move" : "Tap"}</small>
      `;
    }else{
      el.classList.add("emptyFlexibleBucket");
      el.innerHTML=`🪣<small>${dollyMode ? "Move" : "Choose"}</small>`;
    }

    const saved=sourcePositions[id];
    const position=saved || flexibleBucketDefaultPosition(index,field);
    el.style.left=`${position.left}px`;
    el.style.top=`${position.top}px`;

    // Dolly treats these exactly like the other canvas buckets.
    el.classList.toggle("dollyReady",dollyMode);
    el.classList.toggle("dollyShake",dollyMode);
    if(dollyMode)el.classList.add("jiggling");

    el.addEventListener("pointerdown",event=>{
      if(!dollyMode)return;
      event.preventDefault();
      event.stopPropagation();
      beginDragSource(el,event);
    });

    el.addEventListener("click",event=>{
      event.stopPropagation();

      // A click can fire after pointer-up from a drag; Dolly owns interaction here.
      if(dollyMode)return;

      if(!color){
        openFlexibleColorPicker(index);
        return;
      }

      if(sellMode){
        const earned=1+studioEarningsBonus;
        coins+=earned;
        totalSold++;
        pulseCoins(earned);
        playSellSound();
        renderAll();
        saveState();
        return;
      }

      tapSource(el,false);
    });

    field.appendChild(el);
  }
}


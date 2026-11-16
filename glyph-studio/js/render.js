export const fontFamily=s=>s.font==='custom'?(s.customFont||'monospace'):s.font;
export function metrics(result,s){const cellHeight=s.fontSize*1.2,cellWidth=Math.max(1,cellHeight*s.aspect+s.spacing);return {cellWidth,cellHeight,width:Math.ceil(result.columns*cellWidth),height:Math.ceil(result.rows*cellHeight)};}
export function rasterScale(m,desired=1){return Math.min(desired,8192/m.width,8192/m.height,Math.sqrt(24000000/(m.width*m.height)));}
export async function renderCanvas(canvas,result,s,scale=1,onProgress=()=>{},cancelled=()=>false){
  const m=metrics(result,s),safe=rasterScale(m,scale);
  canvas.width=Math.max(1,Math.floor(m.width*safe));canvas.height=Math.max(1,Math.floor(m.height*safe));
  const ctx=canvas.getContext('2d',{alpha:true});
  if(s.antialias){ctx.fillStyle=s.background;ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.scale(safe,safe);
  ctx.font=`${s.fontSize}px "${fontFamily(s)}", monospace`;ctx.textBaseline='middle';ctx.textAlign='center';ctx.imageSmoothingEnabled=s.antialias;
  // Supersampling gives the browser glyph rasterizer more samples. The optional binary alpha mask removes glyph edge smoothing.
  for(let y=0;y<result.rows;y++){
    if(cancelled())throw new DOMException('Cancelled','AbortError');
    for(let x=0;x<result.columns;x++){const i=y*result.columns+x;ctx.fillStyle=result.colors[i];ctx.fillText(result.chars[i],(x+.5)*m.cellWidth,(y+.5)*m.cellHeight,m.cellWidth);}
    if(y%20===0){onProgress(Math.round(y/result.rows*100));await new Promise(r=>setTimeout(r,0));}
  }
  if(!s.antialias){
    const image=ctx.getImageData(0,0,canvas.width,canvas.height);
    for(let i=3;i<image.data.length;i+=4){image.data[i]=image.data[i]>=128?255:0;if(i%4000000===3){if(cancelled())throw new DOMException('Cancelled','AbortError');await new Promise(r=>setTimeout(r,0));}}
    ctx.putImageData(image,0,0);ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='destination-over';ctx.fillStyle=s.background;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();
  }
  onProgress(100);return {...m,scale:safe};
}

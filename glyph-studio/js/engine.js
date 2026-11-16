import { clamp } from './config.js';
const luminance = (r,g,b) => .2126*r + .7152*g + .0722*b;
const pause = () => new Promise(resolve => setTimeout(resolve, 0));
const hex = c => '#' + c.map(v => clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');
export function parsePalette(value) {
  return (value.match(/#[0-9a-f]{6}\b/gi) || []).slice(0,32).map(c => [1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));
}
// Median-cut palette uses a bounded sample so an 8K source does not increase clustering cost.
export function makePalette(rgb, count) {
  const points = []; const stride = Math.max(1,Math.floor(rgb.length / 3 / 6000));
  for(let i=0;i<rgb.length;i+=3*stride) points.push([rgb[i],rgb[i+1],rgb[i+2]]);
  const boxes = [points];
  while(boxes.length<count) {
    let selected=-1, channel=0, spread=-1;
    boxes.forEach((box,i)=> {
      if(box.length<2) return;
      for(let c=0;c<3;c++) { let lo=255,hi=0; for(const p of box) { lo=Math.min(lo,p[c]);hi=Math.max(hi,p[c]); } if(hi-lo>spread) { spread=hi-lo;selected=i;channel=c; } }
    });
    if(selected<0 || spread<=0) break;
    const box=boxes.splice(selected,1)[0].sort((a,b)=>a[channel]-b[channel]);
    boxes.push(box.slice(0,box.length>>1),box.slice(box.length>>1));
  }
  return boxes.filter(b=>b.length).map(box=>box.reduce((a,p)=>a.map((v,c)=>v+p[c]),[0,0,0]).map(v=>v/box.length));
}
function blurred(values,w,h) {
  const out = new Float32Array(values.length);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    let total=0,n=0;
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) { const xx=clamp(x+dx,0,w-1),yy=clamp(y+dy,0,h-1);total+=values[yy*w+xx];n++; }
    out[y*w+x]=total/n;
  }
  return out;
}
export async function convert({pixels,width,height,columns,rows,settings:s,hq=false}, onProgress=()=>{}, cancelled=()=>false) {
  const braille=s.art==='braille',mosaic=s.art==='mosaic',subpixel=braille||mosaic;
  const w=columns*(subpixel?2:1),h=rows*(braille?4:mosaic?2:1),n=w*h;
  const rgb=new Float32Array(n*3),lum=new Float32Array(n);
  const sx=width/w,sy=height/h;
  const contrast=Math.pow((100+s.contrast)/100,2),exposure=Math.pow(2,s.exposure);
  const check=async p=> { if(cancelled()) throw new DOMException('Cancelled','AbortError'); onProgress(p);await pause(); };
  await check(3);
  for(let y=0;y<h;y++) {
    for(let x=0;x<w;x++) {
      const c=[0,0,0];let count=0;
      const x0=Math.floor(x*sx),y0=Math.floor(y*sy),x1=Math.max(x0+1,Math.floor((x+1)*sx)),y1=Math.max(y0+1,Math.floor((y+1)*sy));
      for(let yy=y0;yy<Math.min(height,y1);yy++) for(let xx=x0;xx<Math.min(width,x1);xx++) { const k=(yy*width+xx)*4,alpha=pixels[k+3]/255; for(let z=0;z<3;z++) c[z]+=pixels[k+z]*alpha;count++; }
      for(let z=0;z<3;z++) c[z]/=Math.max(1,count);
      const gray=luminance(...c),i=y*w+x;
      for(let z=0;z<3;z++) rgb[i*3+z]=clamp(Math.pow(clamp(((gray+(c[z]-gray)*s.saturation/100)*exposure-127.5)*contrast+127.5+s.brightness*2.55,0,255)/255,1/s.gamma)*255,0,255);
      lum[i]=luminance(rgb[i*3],rgb[i*3+1],rgb[i*3+2]);
    }
    if(y%32===0) await check(5+Math.round(y/h*25));
  }
  let values=lum;
  if(s.noise || s.sharpness || s.algorithm==='adaptive' || (hq&&s.artifacts)) {
    const blur=blurred(lum,w,h);values=new Float32Array(n);
    for(let i=0;i<n;i++) {
      let v=lum[i]*(1-s.noise/120)+blur[i]*s.noise/120;
      if(hq&&s.artifacts) v=.94*v+.06*blur[i];
      v+=(lum[i]-blur[i])*s.sharpness/35;
      if(s.algorithm==='adaptive') v=(v-blur[i])*1.9+v+(128-blur[i])*.35;
      values[i]=clamp(v,0,255);
    }
  }
  if(s.algorithm==='hdr') for(let i=0;i<n;i++) values[i]=255*Math.log1p(values[i]/255*8)/Math.log(9);
  if(hq&&s.hqContrast) {
    const bins=new Uint32Array(256);for(const v of values)bins[Math.round(v)]++;
    let cumulative=0,lo=0,hi=255;for(let v=0;v<256;v++){cumulative+=bins[v];if(cumulative<n*.015)lo=v;if(cumulative>=n*.985){hi=v;break;}}
    if(hi-lo>16) for(let i=0;i<n;i++) values[i]=clamp((values[i]-lo)*255/(hi-lo),0,255);
  }
  let angles;
  if(s.algorithm==='edge') {
    const edge=new Float32Array(n);angles=new Float32Array(n);
    const at=(x,y)=>values[clamp(y,0,h-1)*w+clamp(x,0,w-1)];
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) { const gx=-at(x-1,y-1)+at(x+1,y-1)-2*at(x-1,y)+2*at(x+1,y)-at(x-1,y+1)+at(x+1,y+1), gy=-at(x-1,y-1)-2*at(x,y-1)-at(x+1,y-1)+at(x-1,y+1)+2*at(x,y+1)+at(x+1,y+1);edge[y*w+x]=clamp(Math.hypot(gx,gy)*.85,0,255);angles[y*w+x]=Math.atan2(gy,gx); }
    values=edge;
  }
  if(s.threshold>0&&!subpixel) for(let i=0;i<n;i++) values[i]=values[i]>=s.threshold?255:0;
  await check(45);
  const palette=s.colorMode==='palette'?(parsePalette(s.customPalette).length?parsePalette(s.customPalette):makePalette(rgb,s.paletteSize)):[];
  let charset=Array.from(s.chars||'@ ');
  if(s.art==='block') charset=Array.from('█▓▒░ ');
  if(s.art==='unicode') charset=Array.from('█▉▊▋▌▍▎▏· ');
  if(s.art==='mosaic') charset=Array.from('█▀▄▚▞▪· ');
  const levels=Math.max(1,charset.length-1),chars=[],colors=[],histogram=new Uint32Array(32),counts={};
  const work=new Float32Array(values),bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  const distribute=(x,y,error,kind)=> {
    const offsets=kind==='floyd'?[[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]]:[[1,0,1/8],[2,0,1/8],[-1,1,1/8],[0,1,1/8],[1,1,1/8],[0,2,1/8]];
    for(const [dx,dy,weight] of offsets) if(x+dx>=0&&x+dx<w&&y+dy<h) work[(y+dy)*w+x+dx]+=error*weight;
  };
  // Dither subpixels before constructing real Unicode Braille masks.
  if(subpixel&&s.dithering!=='none') for(let y=0;y<h;y++) for(let x=0;x<w;x++) {const i=y*w+x,v=clamp(work[i]+(s.dithering==='bayer'?(bayer[(y%4)*4+x%4]/16-.5)*128:0),0,255),q=v>=(s.threshold||128)?255:0;work[i]=q;if(s.dithering==='floyd'||s.dithering==='atkinson')distribute(x,y,v-q,s.dithering);}
  for(let y=0;y<rows;y++) {
    for(let x=0;x<columns;x++) {
      let ch,v,cell=[0,0,0];
      if(subpixel) {
        let mask=0,total=0;const bits=braille?[[0,0,1],[0,1,2],[0,2,4],[1,0,8],[1,1,16],[1,2,32],[0,3,64],[1,3,128]]:[[0,0,1],[1,0,2],[0,1,4],[1,1,8]];
        for(const [dx,dy,bit] of bits) { const i=(y*(braille?4:2)+dy)*w+x*2+dx;let on=work[i]>=(s.threshold||128);if(s.invert)on=!on;if(on)mask|=bit;total+=values[i];for(let c=0;c<3;c++)cell[c]+=rgb[i*3+c]/bits.length; }
        ch=braille?String.fromCodePoint(0x2800+mask):Array.from(' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█')[mask];v=total/bits.length;
      } else {
        const i=y*w+x;v=clamp(work[i],0,255);
        if(s.dithering==='bayer')v=clamp(v+(bayer[(y%4)*4+x%4]/16-.5)*255/levels,0,255);
        const level=Math.round(v/255*levels),q=level/levels*255;
        if(s.dithering==='floyd'||s.dithering==='atkinson')distribute(x,y,v-q,s.dithering);
        ch=charset[Math.min(charset.length-1,s.invert?level:levels-level)];
        if(angles&&v>42)ch=['|','/','-','\\'][((Math.round(angles[i]/(Math.PI/4))%4)+4)%4];
        for(let c=0;c<3;c++)cell[c]=rgb[i*3+c];
      }
      let color=s.foreground;
      if(s.colorMode==='original'||s.art==='ansi')color=hex(cell);
      if(s.colorMode==='palette') {let best=Infinity;for(const p of palette){const distance=p.reduce((a,c,i)=>a+(c-cell[i])**2,0);if(distance<best){best=distance;color=hex(p);}}}
      chars.push(ch);colors.push(color);histogram[Math.min(31,Math.floor(v/8))]++;counts[ch]=(counts[ch]||0)+1;
    }
    if(y%16===0)await check(48+Math.round(y/rows*49));
  }
  await check(100);
  return {columns,rows,chars,colors,histogram:Array.from(histogram),counts,palette:palette.map(hex),text:Array.from({length:rows},(_,y)=>chars.slice(y*columns,(y+1)*columns).join('')).join('\n')};
}
export function analyze(pixels,width,height) {
  const hist=new Uint32Array(256);let sum=0,squares=0,saturation=0,edges=0;
  for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2],l=luminance(r,g,b);hist[Math.round(l)]++;sum+=l;squares+=l*l;saturation+=Math.max(r,g,b)-Math.min(r,g,b);if(i>=4)edges+=Math.abs(l-luminance(pixels[i-4],pixels[i-3],pixels[i-2]));}
  const n=width*height,mean=sum/n,sd=Math.sqrt(squares/n-mean*mean),detail=edges/n;
  return {mean,sd,detail,columns:detail>24?220:detail>12?180:140,preset:sd>65?'classic':'terminal',algorithm:mean<85?'adaptive':sd>78?'hdr':'luminance',colorMode:saturation/n>28?'original':'mono',paletteSize:saturation/n>65?16:8,contrast:sd<45?30:10,gamma:mean<85?1.3:1};
}

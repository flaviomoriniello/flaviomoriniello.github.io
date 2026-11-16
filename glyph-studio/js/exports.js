import { escapeHTML } from './controls.js';
import { fontFamily,metrics,renderCanvas } from './render.js';
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function fontStyle(fontData){return fontData?`@font-face{font-family:'Glyph Embedded';src:url('${fontData}')}`:'';}
export function toHTML(result,s,fontData=''){
  const m=metrics(result,s),family=escapeHTML(fontFamily(s));
  const body=Array.from({length:result.rows},(_,y)=>{
    let line='';for(let x=0;x<result.columns;x++){const i=y*result.columns+x;line+=`<span style="color:${result.colors[i]}">${escapeHTML(result.chars[i])}</span>`;}return line;
  }).join('\n');
  return `<!doctype html>\n<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GLYPH — ASCII Art</title><style>${fontStyle(fontData)}*{box-sizing:border-box}body{margin:0;padding:24px;background:${s.background};color:${s.foreground};overflow:auto}pre{margin:0;font:${s.fontSize}px/${m.cellHeight}px '${family}',monospace;white-space:pre;width:${m.width}px}pre span{display:inline-block;width:${m.cellWidth}px;height:${m.cellHeight}px;text-align:center;vertical-align:top;overflow:hidden;letter-spacing:0}</style></head><body><pre aria-label="ASCII Art">${body}</pre></body></html>`;
}
export function toSVG(result,s,fontData=''){
  const m=metrics(result,s),family=escapeHTML(fontFamily(s));let content='';
  for(let y=0;y<result.rows;y++)for(let x=0;x<result.columns;x++){const i=y*result.columns+x;if(result.chars[i]===' ')continue;content+=`<text x="${((x+.5)*m.cellWidth).toFixed(2)}" y="${((y+.5)*m.cellHeight).toFixed(2)}" fill="${result.colors[i]}">${escapeHTML(result.chars[i])}</text>`;}
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="${m.height}" viewBox="0 0 ${m.width} ${m.height}"><title>GLYPH ASCII Art</title>${fontData?`<style>${fontStyle(fontData)}</style>`:''}<rect width="100%" height="100%" fill="${s.background}"/><g font-family="${family},monospace" font-size="${s.fontSize}" text-anchor="middle" dominant-baseline="central">${content}</g></svg>`;
}
export function toANSI(result,s){
  const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)).join(';');let text=`\x1b[48;2;${rgb(s.background)}m`;
  for(let y=0;y<result.rows;y++){let last='';for(let x=0;x<result.columns;x++){const i=y*result.columns+x,c=result.colors[i];if(c!==last){text+=`\x1b[38;2;${rgb(c)}m`;last=c;}text+=result.chars[i];}text+='\x1b[0m'+(y<result.rows-1?`\r\n\x1b[48;2;${rgb(s.background)}m`:'');}return text;
}
export const canvasBlob=(canvas,type='image/png',quality=.95)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Il browser non riesce a esportare questa dimensione. Riduci righe o colonne.')),type,quality));
// A minimal standards-compliant PDF embeds a JPEG in one fitted page; byte offsets use Uint8Array lengths, never string lengths.
export function jpegPDF(jpeg,width,height){
  const encode=s=>new TextEncoder().encode(s),parts=[],offsets=[0];let length=0;
  const append=value=>{const bytes=typeof value==='string'?encode(value):value;parts.push(bytes);length+=bytes.length;};
  const pageScale=Math.min(.75,14400/Math.max(width,height)),pw=(width*pageScale).toFixed(2),ph=(height*pageScale).toFixed(2);
  append('%PDF-1.4\n%GLYPH\n');
  const object=(id,body)=>{offsets[id]=length;append(`${id} 0 obj\n${body}\nendobj\n`);};
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4]=length;append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);append(jpeg);append('\nendstream\nendobj\n');
  const commands=`q\n${pw} 0 0 ${ph} 0 0 cm\n/Im0 Do\nQ\n`;object(5,`<< /Length ${encode(commands).length} >>\nstream\n${commands}endstream`);
  const xref=length;append('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)append(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts,{type:'application/pdf'});
}
export async function exportArt(format,result,s,name,fontData='',onProgress=()=>{}){
  let blob;
  if(format==='txt')blob=new Blob([result.text],{type:'text/plain;charset=utf-8'});
  else if(format==='ans')blob=new Blob([toANSI(result,s)],{type:'text/plain;charset=utf-8'});
  else if(format==='html')blob=new Blob([toHTML(result,s,fontData)],{type:'text/html;charset=utf-8'});
  else if(format==='svg')blob=new Blob([toSVG(result,s,fontData)],{type:'image/svg+xml;charset=utf-8'});
  else {
    const canvas=document.createElement('canvas');await renderCanvas(canvas,result,s,s.supersampling,onProgress);
    if(format==='pdf'){const jpeg=await canvasBlob(canvas,'image/jpeg',.97);blob=jpegPDF(new Uint8Array(await jpeg.arrayBuffer()),canvas.width,canvas.height);}
    else blob=await canvasBlob(canvas,format==='jpg'?'image/jpeg':'image/png');
    canvas.width=canvas.height=1;
  }
  download(blob,`${name.replace(/[^\p{L}\p{N}_-]/gu,'-').slice(0,70)}-glyph.${format}`);return blob;
}

import { convert, analyze } from './engine.js';
let latest=0;
self.onmessage=async({data})=> {
  if(data.type==='cancel'){latest=data.id;return;}
  latest=data.id;
  try {
    if(data.type==='analyze'){self.postMessage({id:data.id,type:'analysis',result:analyze(data.pixels,data.width,data.height)});return;}
    const result=await convert(data,p=>self.postMessage({id:data.id,type:'progress',progress:p}),()=>data.id!==latest);
    if(data.id===latest)self.postMessage({id:data.id,type:'result',result});
  } catch(error){if(error.name!=='AbortError')self.postMessage({id:data.id,type:'error',message:error.message});}
};

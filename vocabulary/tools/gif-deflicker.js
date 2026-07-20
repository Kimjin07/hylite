// 去"忽闪"：剔除动图里孤立的"眨没帧"（前后帧都正常、这帧不透明面积突然骤降到近乎空）。
// 渐入/渐出的淡帧(相邻也低)不动。被删帧的时长并进前一帧，整体节奏不变。
// 用法: node gif-deflicker.js            (就地处理 deploy/vocabulary/pet 下所有动图)
//       node gif-deflicker.js <in.gif> <out.gif>
const fs = require('fs');
const path = require('path');
const { GifReader, GifWriter } = require('omggif');

function deflicker(inPath, outPath){
  const buf = fs.readFileSync(inPath);
  const r = new GifReader(new Uint8Array(buf));
  const W = r.width, H = r.height, N = r.numFrames(), tot = W*H;
  const frames = [];
  for (let i=0;i<N;i++){
    const rgba = new Uint8Array(tot*4); r.decodeAndBlitFrameRGBA(i, rgba);
    let opa=0; for (let p=0;p<tot;p++) if (rgba[p*4+3]>10) opa++;
    frames.push({ rgba, delay: r.frameInfo(i).delay, opa: opa/tot });
  }
  const sorted = frames.map(f=>f.opa).sort((a,b)=>a-b);
  const med = sorted[Math.floor(sorted.length/2)] || 0;
  const faint = med*0.5, deep = med*0.35;
  // 保护开头/结尾连续的"淡帧"(渐入/渐出)，不当闪帧删
  let lead=0; while (lead<N && frames[lead].opa < faint) lead++;
  let tail=N-1; while (tail>=0 && frames[tail].opa < faint) tail--;
  // 中间段里凡是"骤降到近乎空"(<0.35*中位)的都是眨没帧 → 删
  const drop = new Array(N).fill(false);
  for (let i=lead;i<=tail;i++){ if (frames[i].opa < deep) drop[i]=true; }
  const dropIdx = [];
  for (let i=0;i<N;i++) if (drop[i]) dropIdx.push(i);
  if (!dropIdx.length) return { dropped:[] };   // 没有闪帧 → 不动
  if (dropIdx.length > N*0.6 || N-dropIdx.length < 2) return { dropped:[], skipped:true };   // 删太多不安全 → 不动

  // 保留帧，把删掉帧的 delay 并进前一个保留帧
  const kept = [];
  for (let i=0;i<N;i++){
    if (drop[i]){ if (kept.length) kept[kept.length-1].delay += frames[i].delay; continue; }
    kept.push({ rgba: frames[i].rgba, delay: frames[i].delay });
  }

  // 用保留帧重建调色板（沿用 cutout 的 5-bit 量化 + 透明位）
  const quant = c => c & 0xF8; const key = (a,b,c)=>(a<<16)|(b<<8)|c;
  const palMap = new Map(); const pal = [];
  for (const f of kept) for (let p=0;p<tot;p++){
    if (f.rgba[p*4+3]===0) continue;
    const rr=quant(f.rgba[p*4]),gg=quant(f.rgba[p*4+1]),bb=quant(f.rgba[p*4+2]);
    const k=key(rr,gg,bb); if(!palMap.has(k)&&pal.length<255){ palMap.set(k,pal.length); pal.push([rr,gg,bb]); }
  }
  const TRANSP = pal.length; pal.push([0,0,0]);
  let ps=2; while(ps<pal.length) ps<<=1; while(pal.length<ps) pal.push([0,0,0]);
  const palInt = pal.map(([a,b,c])=>(a<<16)|(b<<8)|c);
  const nearest = (rr,gg,bb)=>{ rr=quant(rr);gg=quant(gg);bb=quant(bb); const k=key(rr,gg,bb); if(palMap.has(k))return palMap.get(k);
    let best=0,bd=1e9; for(let i=0;i<pal.length;i++){ if(i===TRANSP)continue; const dr=pal[i][0]-rr,dg=pal[i][1]-gg,db=pal[i][2]-bb,d=dr*dr+dg*dg+db*db; if(d<bd){bd=d;best=i;} } return best; };

  const out = Buffer.alloc(tot*4*kept.length + 4096);
  const gw = new GifWriter(out, W, H, { loop:0, palette: palInt });
  for (const f of kept){
    const idx = new Uint8Array(tot);
    for (let p=0;p<tot;p++) idx[p] = f.rgba[p*4+3]===0 ? TRANSP : nearest(f.rgba[p*4],f.rgba[p*4+1],f.rgba[p*4+2]);
    gw.addFrame(0,0,W,H, idx, { palette: palInt, delay: f.delay, transparent: TRANSP, disposal: 2 });
  }
  const len = gw.end();
  fs.writeFileSync(outPath, out.slice(0, len));
  return { dropped: dropIdx, kept: kept.length, was: N };
}

const args = process.argv.slice(2);
if (args.length === 2){
  const r = deflicker(args[0], args[1]);
  console.log(r.dropped.length ? ('去闪 '+args[0]+' 删'+r.dropped.length+'帧('+r.was+'→'+r.kept+')') : ('无闪帧 '+args[0]));
} else {
  const PET = 'C:/Users/27894/Desktop/HY/deploy/vocabulary/pet';
  let touched=0;
  for (const sp of fs.readdirSync(PET)){
    const dir = path.join(PET, sp); if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)){
      if (!/^p\d+\.gif$/.test(f)) continue;   // 只处理动图源(跳过 -s.gif 静止帧)
      const p = path.join(dir, f);
      const r = deflicker(p, p);
      if (r.dropped.length){ touched++; console.log('  '+sp+'/'+f+'  删眨没帧 '+r.dropped.length+' 个 ('+r.was+'→'+r.kept+'帧): 帧 '+r.dropped.join(',')); }
    }
  }
  console.log('完成：去闪 '+touched+' 个动图');
}

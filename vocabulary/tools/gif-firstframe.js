// 给每个已抠图的表情 GIF 生成"静止首帧"版（单帧 GIF，不动），供"静止模式"用。
// 输出到同目录，文件名加 -s：p1.gif -> p1-s.gif（保留透明）。
// 用法: node gif-firstframe.js            (处理 deploy/vocabulary/pet 下所有物种)
//       node gif-firstframe.js <in.gif> <out.gif>   (单个)
const fs = require('fs');
const path = require('path');
const { GifReader, GifWriter } = require('omggif');

function makeStill(inPath, outPath){
  const buf = fs.readFileSync(inPath);
  const r = new GifReader(new Uint8Array(buf));
  const W = r.width, H = r.height, N = r.numFrames();
  // 选"最饱满"的一帧当静止图：有些贴纸开头是淡入/入场空帧，取不透明像素最多的那帧最有代表性
  let bestIdx = 0, bestCount = -1;
  for (let i=0;i<N;i++){
    const t = new Uint8Array(W*H*4); r.decodeAndBlitFrameRGBA(i, t);
    let c=0; for (let p=0;p<W*H;p++) if (t[p*4+3]>10) c++;
    if (c>bestCount){ bestCount=c; bestIdx=i; }
  }
  const rgba = new Uint8Array(W * H * 4);
  r.decodeAndBlitFrameRGBA(bestIdx, rgba);   // 抠图后透明像素 alpha=0

  // 建调色板：收集非透明颜色（5-bit 量化压到 <=255），留 1 个透明位
  const quant = c => c & 0xF8;
  const colorKey = (rr,gg,bb) => (rr<<16)|(gg<<8)|bb;
  const palMap = new Map(); const palette = [];
  for (let p=0;p<W*H;p++){
    if (rgba[p*4+3]===0) continue;
    const rr=quant(rgba[p*4]), gg=quant(rgba[p*4+1]), bb=quant(rgba[p*4+2]);
    const k = colorKey(rr,gg,bb);
    if (!palMap.has(k) && palette.length<255){ palMap.set(k, palette.length); palette.push([rr,gg,bb]); }
  }
  const TRANSP = palette.length; palette.push([0,0,0]);
  let ps = 2; while (ps < palette.length) ps <<= 1;
  while (palette.length < ps) palette.push([0,0,0]);
  const palInt = palette.map(([rr,gg,bb]) => (rr<<16)|(gg<<8)|bb);
  const nearest = (rr,gg,bb)=>{
    rr=quant(rr); gg=quant(gg); bb=quant(bb);
    const k=colorKey(rr,gg,bb); if (palMap.has(k)) return palMap.get(k);
    let best=0, bd=1e9;
    for (let i=0;i<palette.length;i++){ if(i===TRANSP)continue; const dr=palette[i][0]-rr,dg=palette[i][1]-gg,db=palette[i][2]-bb; const d=dr*dr+dg*dg+db*db; if(d<bd){bd=d;best=i;} }
    return best;
  };

  const out = Buffer.alloc(W*H*4 + 4096);
  const gw = new GifWriter(out, W, H, { palette: palInt });   // 无 loop → 单帧不循环动
  const idx = new Uint8Array(W*H);
  for (let p=0;p<W*H;p++) idx[p] = rgba[p*4+3]===0 ? TRANSP : nearest(rgba[p*4],rgba[p*4+1],rgba[p*4+2]);
  gw.addFrame(0,0,W,H, idx, { palette: palInt, transparent: TRANSP });
  const len = gw.end();
  fs.writeFileSync(outPath, out.slice(0, len));
  return len;
}

const args = process.argv.slice(2);
if (args.length === 2){
  const len = makeStill(args[0], args[1]);
  console.log('OK', args[0], '->', args[1], Math.round(len/1024)+'KB');
} else {
  const PET = 'C:/Users/27894/Desktop/HY/deploy/vocabulary/pet';
  let n = 0, total = 0;
  for (const sp of fs.readdirSync(PET)){
    const dir = path.join(PET, sp);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)){
      if (!/^p\d+\.gif$/.test(f)) continue;   // 只处理动图源，跳过已生成的 -s.gif
      const inP = path.join(dir, f);
      const outP = path.join(dir, f.replace(/\.gif$/, '-s.gif'));
      const len = makeStill(inP, outP);
      n++; total += len;
      console.log('  ', sp+'/'+f, '->', path.basename(outP), Math.round(len/1024)+'KB');
    }
  }
  console.log('完成：'+n+' 个静止帧，共 '+Math.round(total/1024)+'KB');
}

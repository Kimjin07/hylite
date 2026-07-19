// 给贴纸 GIF 去白底：只把"从四边漫填进来、连通的近白像素"设为透明，
// 保留动物身上的白色（不连通到边缘）。用法: node gif-cutout.js <in.gif> <out.gif>
const fs = require('fs');
const { GifReader, GifWriter } = require('omggif');

const [inPath, outPath] = process.argv.slice(2);
const buf = fs.readFileSync(inPath);
const r = new GifReader(new Uint8Array(buf));
const W = r.width, H = r.height, N = r.numFrames();
const WHITE = 245;   // r,g,b 都 >= 此值算"白底"

// 逐帧合成 RGBA
const frames = [];
for (let i = 0; i < N; i++){
  const rgba = new Uint8Array(W * H * 4);
  r.decodeAndBlitFrameRGBA(i, rgba);
  const info = r.frameInfo(i);
  frames.push({ rgba, delay: info.delay });
}

// 每帧：从四边 flood fill 近白 → alpha=0
function cutout(rgba){
  const n = W * H;
  const isWhite = p => rgba[p*4]>=WHITE && rgba[p*4+1]>=WHITE && rgba[p*4+2]>=WHITE && rgba[p*4+3]>=250;
  const seen = new Uint8Array(n);
  const stack = [];
  const push = p => { if (p>=0 && p<n && !seen[p] && isWhite(p)){ seen[p]=1; stack.push(p); } };
  for (let x=0;x<W;x++){ push(x); push((H-1)*W + x); }
  for (let y=0;y<H;y++){ push(y*W); push(y*W + W-1); }
  while (stack.length){
    const p = stack.pop();
    rgba[p*4+3] = 0;                 // 透明
    const x = p % W, y = (p / W)|0;
    if (x>0) push(p-1); if (x<W-1) push(p+1);
    if (y>0) push(p-W); if (y<H-1) push(p+W);
  }
}
for (const f of frames) cutout(f.rgba);

// 建全局调色板（收集所有非透明颜色，最多 255，留 1 个透明位）
const colorKey = (rr,gg,bb) => (rr<<16)|(gg<<8)|bb;
const palMap = new Map();      // key -> index
const palette = [];
function quant(c){ return c & 0xF8; }   // 5-bit 量化，压到 <=255 色
for (const f of frames){
  for (let p=0;p<W*H;p++){
    if (f.rgba[p*4+3]===0) continue;
    const rr=quant(f.rgba[p*4]), gg=quant(f.rgba[p*4+1]), bb=quant(f.rgba[p*4+2]);
    const k = colorKey(rr,gg,bb);
    if (!palMap.has(k)){ if (palette.length<255){ palMap.set(k, palette.length); palette.push([rr,gg,bb]); } }
  }
}
const TRANSP = palette.length;              // 透明索引
palette.push([0,0,0]);
// 调色板长度须为 2 的幂
let ps = 2; while (ps < palette.length) ps <<= 1;
while (palette.length < ps) palette.push([0,0,0]);
const palInt = palette.map(([rr,gg,bb]) => (rr<<16)|(gg<<8)|bb);

// 最近色查找（量化后一般直接命中；兜底线性找最近）
function nearest(rr,gg,bb){
  rr=quant(rr); gg=quant(gg); bb=quant(bb);
  const k = colorKey(rr,gg,bb);
  if (palMap.has(k)) return palMap.get(k);
  let best=0, bd=1e9;
  for (let i=0;i<palette.length;i++){ if(i===TRANSP)continue; const dr=palette[i][0]-rr,dg=palette[i][1]-gg,db=palette[i][2]-bb; const d=dr*dr+dg*dg+db*db; if(d<bd){bd=d;best=i;} }
  return best;
}

const out = Buffer.alloc(1024*1024*4);
const gw = new GifWriter(out, W, H, { loop: 0, palette: palInt });
for (const f of frames){
  const idx = new Uint8Array(W*H);
  for (let p=0;p<W*H;p++){
    idx[p] = f.rgba[p*4+3]===0 ? TRANSP : nearest(f.rgba[p*4],f.rgba[p*4+1],f.rgba[p*4+2]);
  }
  gw.addFrame(0,0,W,H, idx, { palette: palInt, delay: f.delay, transparent: TRANSP, disposal: 2 });
}
const len = gw.end();
fs.writeFileSync(outPath, out.slice(0, len));
console.log('OK', inPath, '->', outPath, '| 帧', N, '色', palette.length, '透明idx', TRANSP, '| 大小', Math.round(len/1024)+'KB');

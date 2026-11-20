const fs=require('node:fs');const path=require('node:path');
const rate=8000,seconds=6,n=rate*seconds,b=Buffer.alloc(44+n*2);
b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
for(let i=0;i<n;i++){const fade=Math.min(1,i/(rate*.1),(n-i)/(rate*.1));b.writeInt16LE(Math.round(1800*fade*Math.sin(2*Math.PI*440*i/rate)),44+i*2);}
const file=path.resolve(__dirname,'../UI/public/demo/tone.wav');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,b);

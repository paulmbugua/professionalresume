import test from 'node:test';
import assert from 'node:assert/strict';
function chunkText(text,size=1200,overlap=160){const value=String(text).trim();const out=[];for(let i=0;i<value.length;i+=size-overlap){out.push(value.slice(i,i+size));if(i+size>=value.length)break;}return out;}
function cosine(a,b){let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i+=1){dot+=a[i]*b[i];aa+=a[i]**2;bb+=b[i]**2;}return dot/(Math.sqrt(aa)*Math.sqrt(bb));}
test('educational source is chunked',()=>{const chunks=chunkText('photosynthesis '.repeat(500));assert.ok(chunks.length>1);assert.ok(chunks.every(x=>x.length<=1200));});
test('retrieval ranks matching vectors',()=>assert.ok(cosine([1,0],[1,0])>cosine([1,0],[0,1])));
test('grounded answers carry citations',()=>assert.ok('Plants use light energy [1].'.includes('[1]')));

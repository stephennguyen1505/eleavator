import {readFile,writeFile,mkdir,readdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateArticle} from './run.mjs';
const directory=path.dirname(fileURLToPath(import.meta.url));
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shell=(title,body)=>`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} | Aurelia</title><style>body{margin:0;background:#f6f5f0;color:#28352d;font:16px/1.85 Arial,sans-serif}main{max-width:850px;margin:60px auto;padding:0 24px}a{color:#576e48}h1,h2{font-family:Georgia,serif;line-height:1.3}h1{font-size:42px}article{border-bottom:1px solid #d4d8ca;padding:25px 0}.note{font-size:13px;color:#727b6d}nav{margin-bottom:40px}</style><main><nav><a href="../index.html">AURELIA</a> · <a href="index.html">Blog</a></nav>${body}</main></html>`;
async function atomicWrite(file,content){const temp=file+'.tmp';await writeFile(temp,content);await rename(temp,file)}
export async function exportBlog({outputDirectory=path.join(directory,'output'),blogDirectory=path.join(directory,'..','blog'),includeCurated=true}={}){
 await mkdir(outputDirectory,{recursive:true});
 await mkdir(blogDirectory,{recursive:true});
 const posts=includeCurated?JSON.parse(await readFile(path.join(directory,'..','content','posts.json'),'utf8')):[];
 for(const file of await readdir(outputDirectory)){
  if(!file.endsWith('.json'))continue;
  const post=JSON.parse(await readFile(path.join(outputDirectory,file),'utf8'));
  if(post.status!=='approved')continue;
  posts.push(post);
 }
 for(const post of posts){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.id))throw Error('ID bài không hợp lệ.');
  const a=validateArticle(post.article);
  await atomicWrite(path.join(blogDirectory,post.id+'.html'),shell(a.title,`<article><p class="note">${escape(post.day)} · ${escape(post.slot)} · Kiến thức tham khảo</p><h1>${escape(a.title)}</h1><p>${escape(a.description)}</p><p>${escape(a.introduction)}</p>${a.sections.map(s=>`<h2>${escape(s.heading)}</h2>${s.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}`).join('')}<p>${escape(a.conclusion)}</p><p class="note">Giải pháp thực tế cần được xác nhận qua khảo sát và tư vấn chuyên môn.</p></article>`));
 }
 posts.sort((a,b)=>b.id.localeCompare(a.id));
 await atomicWrite(path.join(blogDirectory,'index.html'),shell('Blog thang máy',`<h1>Không gian sống. Góc nhìn mới.</h1><p>Kiến thức về thang máy gia đình, biệt thự villa và khách sạn.</p>${posts.length?posts.map(p=>`<article><p class="note">${escape(p.day)} · ${escape(p.slot)}</p><h2><a href="${escape(p.id)}.html">${escape(p.article.title)}</a></h2><p>${escape(p.article.description)}</p></article>`).join(''):'<p>Các bài viết đang được biên tập. Hẹn gặp bạn sớm.</p>'}`));
 return posts.length;
}
export async function approve(id,{outputDirectory=path.join(directory,'output'),blogDirectory=path.join(directory,'..','blog'),automatic=false,includeCurated=true}={}){
 if(!/^\d{4}-\d{2}-\d{2}-\d{4}-[a-f0-9]{8}$/.test(id))throw Error('ID không hợp lệ.');
 const file=path.join(outputDirectory,id+'.json');const post=JSON.parse(await readFile(file,'utf8'));
 validateArticle(post.article);
 if(!['draft','approved'].includes(post.status))throw Error('Trạng thái bài viết không hợp lệ.');
 post.status='approved';post.approvalMode=automatic?'automatic':'manual';post.approvedAt??=new Date().toISOString();
 await atomicWrite(file,JSON.stringify(post,null,2)+'\n');
 await exportBlog({outputDirectory,blogDirectory,includeCurated});return {status:'approved-and-exported',id};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv[2]==='--export')console.log('Exported approved posts:',await exportBlog());else if(process.argv[2]==='--approve'&&process.argv[3])console.log(await approve(process.argv[3]));else throw Error('Dùng: node agent/publish.mjs --approve <id> hoặc --export');}catch(error){console.error(error.message);process.exitCode=1}
}

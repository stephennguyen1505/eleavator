import {readFile,readdir,mkdir,cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {run,dayKey} from './run.mjs';
import {approve,exportBlog} from './publish.mjs';

const directory=path.dirname(fileURLToPath(import.meta.url));
export async function tick({configPath=path.join(directory,'config.json'),outputDirectory=path.join(directory,'output'),blogDirectory=path.join(directory,'..','blog'),distDirectory=path.join(directory,'..','dist'),now=new Date(),apiKey=process.env.BLOG_AI_API_KEY,fetchImpl=fetch,exportImpl=exportBlog,approveImpl=approve}={}){
 const config=JSON.parse(await readFile(configPath,'utf8'));
 const options={configPath,outputDirectory,now,apiKey,fetchImpl};
 const results=[];
 await mkdir(outputDirectory,{recursive:true});
 // Recover saved work after an interrupted publish before making another paid API call.
 async function recover(){
  if(!config.autoPublish)return;
  for(const file of await readdir(outputDirectory)){
   if(!file.endsWith('.json'))continue;
   const post=JSON.parse(await readFile(path.join(outputDirectory,file),'utf8'));
   if(post.status==='draft'&&post.publicationMode==='automatic'&&post.day<=dayKey(now,config.timezone)){
    await approveImpl(post.id,{outputDirectory,blogDirectory,automatic:true});
    results.push({status:'published-to-local-blog',id:post.id});
   }
  }
  // Always reconcile exports, including a crash after approval but before output is written.
  await exportImpl({outputDirectory,blogDirectory});
  await mkdir(distDirectory,{recursive:true});
  await cp(blogDirectory,path.join(distDirectory,'blog'),{recursive:true});
 }
 await recover();
 for(let i=0;i<(config.schedule??['09:00']).length;i++){
  const result=await run(options);results.push(result);
  if(result.status!=='draft-created')break;
  await recover();
 }
 return {mode:config.autoPublish?'automatic':'draft-only',results};
}

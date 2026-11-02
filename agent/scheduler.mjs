import {tick} from './automation.mjs';
let active=false;
async function cycle(){
 if(active)return;active=true;
 try{console.log(new Date().toISOString(),JSON.stringify(await tick()))}
 catch(error){console.error(new Date().toISOString(),error.message);if(process.env.GITHUB_ACTIONS)console.error(`::error::${error.message.replace(/[\r\n]/g,' ')}`);if(process.argv.includes('--once'))process.exitCode=1}
 finally{active=false}
}
// Fail early rather than report an active service that can never create content.
if(!process.env.BLOG_AI_API_KEY){console.error('Chưa kích hoạt: thiếu BLOG_AI_API_KEY. Cấu hình bí mật trong môi trường chạy.');if(process.env.GITHUB_ACTIONS)console.error('::error::Missing repository secret BLOG_AI_API_KEY. Add it in Settings > Secrets and variables > Actions.');process.exitCode=1}
else {await cycle();if(!process.argv.includes('--once'))setInterval(cycle,60_000)}

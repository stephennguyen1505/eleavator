import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {dayKey,chooseTopic,run,generateArticle} from './run.mjs';
const article={title:'Lựa chọn thang máy',description:'Những điều cần tìm hiểu.',slug:'lua-chon-thang-may',introduction:'Nội dung mở đầu.',sections:[{heading:'Không gian',paragraphs:['Khảo sát công trình.']},{heading:'Tư vấn',paragraphs:['Trao đổi với chuyên gia.']}],conclusion:'Chuẩn bị thông tin trước khi tư vấn.'};
const aiResponse=()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(article)}}]})});
test('Lịch tính theo Việt Nam và không lặp chủ đề đã dùng',()=>{
 assert.equal(dayKey(new Date('2026-11-02T18:00:00Z'),'Asia/Ho_Chi_Minh'),'2026-11-03');
 assert.equal(chooseTopic(['a','b'],[{topic:'a'}]),'b');
 assert.equal(chooseTopic(['a'],[{topic:'a'}]),null);
});
test('Chạy lại cùng ngày không gọi AI hoặc tạo bản nháp thứ hai',async()=>{
 const outputDirectory=await mkdtemp(path.join(tmpdir(),'blog-agent-'));let calls=0;
 const options={outputDirectory,now:new Date('2026-11-02T03:00:00Z'),apiKey:'test-only',fetchImpl:async()=>{calls++;return aiResponse()}};
 try{
  assert.equal((await run(options)).status,'draft-created');
  assert.equal((await run(options)).status,'already-created');assert.equal(calls,1);
  const file=(await readdir(outputDirectory)).find(f=>f.endsWith('.json'));
  assert.equal(JSON.parse(await readFile(path.join(outputDirectory,file),'utf8')).status,'draft');
 }finally{await rm(outputDirectory,{recursive:true,force:true})}
});
test('Lỗi API không đánh dấu ngày đã hoàn thành và giải phóng khóa',async()=>{
 const outputDirectory=await mkdtemp(path.join(tmpdir(),'blog-agent-'));
 try{
  await assert.rejects(run({outputDirectory,apiKey:'test-only',fetchImpl:async()=>({ok:false,status:429})}),/429/);
  assert.deepEqual(await readdir(outputDirectory),[]);
 }finally{await rm(outputDirectory,{recursive:true,force:true})}
});
test('Từ chối bài bị cắt và không có khóa API',async()=>{
 await assert.rejects(generateArticle({},'topic',{apiKey:'test-only',fetchImpl:async()=>({ok:true,json:async()=>({choices:[{finish_reason:'length'}]})})}),/chưa hoàn thành/);
 await assert.rejects(generateArticle({},'topic',{}),/BLOG_AI_API_KEY/);
});

test('Mỗi ngày tối đa 5 khung giờ; ngày mới tiếp tục và không lặp chủ đề',async()=>{
 const outputDirectory=await mkdtemp(path.join(tmpdir(),'blog-slots-'));let calls=0;
 const options={outputDirectory,now:new Date('2026-11-02T14:00:00Z'),apiKey:'test-only',fetchImpl:async()=>{calls++;return aiResponse()}};
 try{
  for(let i=0;i<5;i++)assert.equal((await run(options)).status,'draft-created');
  assert.equal((await run(options)).status,'already-created');assert.equal(calls,5);
  const posts=await Promise.all((await readdir(outputDirectory)).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(path.join(outputDirectory,f),'utf8'))));
  assert.equal(new Set(posts.map(p=>p.topic)).size,5);assert.equal(new Set(posts.map(p=>p.slot)).size,5);
  assert.equal((await run({...options,now:new Date('2026-11-03T01:00:00Z')})).status,'not-due');
  assert.equal((await run({...options,now:new Date('2026-11-03T02:00:00Z')})).status,'draft-created');
 }finally{await rm(outputDirectory,{recursive:true,force:true})}
});
test('Blog chỉ xuất bài đã duyệt và escape HTML từ nội dung AI',async()=>{
 const {approve,exportBlog}=await import('./publish.mjs');
 const root=await mkdtemp(path.join(tmpdir(),'blog-publish-'));const outputDirectory=path.join(root,'drafts');const blogDirectory=path.join(root,'blog');
 try{
  const response=()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({...article,title:'<script>alert(1)</script>'})}}]})});
  const result=await run({outputDirectory,now:new Date('2026-11-02T03:00:00Z'),apiKey:'test-only',fetchImpl:async()=>response()});
  assert.equal(await exportBlog({outputDirectory,blogDirectory,includeCurated:false}),0);
  assert.deepEqual(await readdir(blogDirectory),['index.html']);
  await approve(result.id,{outputDirectory,blogDirectory,includeCurated:false});
  assert.equal(await exportBlog({outputDirectory,blogDirectory,includeCurated:false}),1);
  const page=await readFile(path.join(blogDirectory,result.id+'.html'),'utf8');
  assert.ok(page.includes('&lt;script&gt;'));assert.ok(!page.includes('<script>'));
  await assert.rejects(approve('../bad',{outputDirectory,blogDirectory}),/ID/);
 }finally{await rm(root,{recursive:true,force:true})}
});

test('Tự động xuất đủ 5 bài lên blog và dist, không cần thao tác duyệt',async()=>{
 const {tick}=await import('./automation.mjs');
 const root=await mkdtemp(path.join(tmpdir(),'blog-auto-'));let calls=0;
 const options={includeCurated:false,outputDirectory:path.join(root,'output'),blogDirectory:path.join(root,'blog'),distDirectory:path.join(root,'dist'),now:new Date('2026-11-02T14:00:00Z'),apiKey:'test-only',fetchImpl:async()=>{calls++;return aiResponse()}};
 try{
  const result=await tick(options);assert.equal(result.mode,'automatic');
  assert.equal(result.results.filter(r=>r.status==='published-to-local-blog').length,5);
  assert.equal((await readdir(options.blogDirectory)).length,6);
  assert.equal((await readdir(path.join(options.distDirectory,'blog'))).length,6);
  const posts=await Promise.all((await readdir(options.outputDirectory)).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(path.join(options.outputDirectory,f),'utf8'))));
  assert.ok(posts.every(p=>p.status==='approved'&&p.approvalMode==='automatic'));
  await tick(options);assert.equal(calls,5);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('Tiếp tục xuất bản sau lỗi xuất HTML mà không tốn thêm lượt gọi AI',async()=>{
 const {tick}=await import('./automation.mjs');const {approve}=await import('./publish.mjs');
 const root=await mkdtemp(path.join(tmpdir(),'blog-recovery-'));let calls=0;
 const options={includeCurated:false,outputDirectory:path.join(root,'output'),blogDirectory:path.join(root,'blog'),distDirectory:path.join(root,'dist'),now:new Date('2026-11-02T03:00:00Z'),apiKey:'test-only',fetchImpl:async()=>{calls++;return aiResponse()}};
 try{
  await assert.rejects(tick({...options,approveImpl:async(id,settings)=>{await approve(id,settings);throw Error('Simulated interrupted export')}}),/interrupted/);
  const recovered=await tick(options);assert.equal(calls,1);
  assert.equal(recovered.results.at(-1).status,'already-created');
  assert.equal((await readdir(path.join(options.distDirectory,'blog'))).length,2);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('Lập thêm chủ đề và từ chối chủ đề đã có',async()=>{
 const {suggestTopic}=await import('./run.mjs');
 const response=topic=>async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify({topic})}}]})});
 const topic='Thang máy khách sạn: chuẩn bị tiếp cận cho khách có xe lăn';
 assert.equal(await suggestTopic({model:'test'},[],{apiKey:'test-only',fetchImpl:response(topic)}),topic);
 await assert.rejects(suggestTopic({model:'test'},[{topic}],{apiKey:'test-only',fetchImpl:response('  '+topic.toUpperCase()+'  ')}),/đã dùng/);
});

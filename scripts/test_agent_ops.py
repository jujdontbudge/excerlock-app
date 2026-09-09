import unittest,tempfile,pathlib,subprocess,os,json,time,shutil,sys
SOURCE=pathlib.Path(__file__).with_name('agent-ops.py')
class Ops(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.base=pathlib.Path(self.temp.name).resolve();self.root=self.base/'repo';self.root.mkdir();self.state=self.base/'state';self.env=dict(os.environ,AGENT_OPS_STATE=str(self.state))
  self.g('init');self.g('config','user.email','test@example.com');self.g('config','user.name','Test')
  (self.root/'file').write_text('source');self.g('add','.');self.g('commit','-m','initial')
  (self.root/'scripts').mkdir();shutil.copy2(SOURCE,self.root/'scripts/agent-ops.py')
  (self.root/'.agent-ops.json').write_text(json.dumps(dict(app_id='test',build_caches=['out'],build_days=14,worktree_days=7,merge_targets=[self.g('symbolic-ref','HEAD')])))
  self.script=self.root/'scripts/agent-ops.py'
 def tearDown(self):self.temp.cleanup()
 def g(self,*args):return subprocess.check_output(['git','-C',str(self.root),*args],stderr=subprocess.DEVNULL,text=True).strip()
 def op(self,*args):return subprocess.run([sys.executable,str(self.script),*args],env=self.env,capture_output=True,text=True)
 def holding(self):
  marker=self.base/'ready'
  p=subprocess.Popen([sys.executable,str(self.script),'run','--',sys.executable,'-c',f'import pathlib,time; pathlib.Path({str(marker)!r}).touch(); time.sleep(2)'],env=self.env,stdout=subprocess.DEVNULL)
  until=time.monotonic()+5
  while not marker.exists() and time.monotonic()<until:time.sleep(.02)
  self.assertTrue(marker.exists());return p
 def test_release_conflict_and_recovery(self):
  p=self.holding()
  try:self.assertEqual(self.op('run','--','true').returncode,75)
  finally:p.wait()
  self.assertEqual(self.op('run','--','true').returncode,0)
 def test_lock_survives_supervisor_kill(self):
  p=self.holding();p.kill();p.wait()
  self.assertEqual(self.op('run','--','true').returncode,75)
  time.sleep(2.2);self.assertEqual(self.op('run','--','true').returncode,0)
 def test_nested_lock_and_failure(self):
  self.assertEqual(self.op('run','--',sys.executable,str(self.script),'run','--','true').returncode,0)
  self.assertEqual(self.op('run','--',sys.executable,'-c','raise SystemExit(7)').returncode,7)
 def test_other_app_not_blocked(self):
  p=self.holding()
  try:
   cfg=self.root/'.agent-ops.json';d=json.loads(cfg.read_text());d['app_id']='other';cfg.write_text(json.dumps(d))
   self.assertEqual(self.op('run','--','true').returncode,0)
  finally:p.wait()
 def test_finished_only_clean_merged(self):
  w=self.base/'worker';self.g('worktree','add','-b','worker',str(w))
  self.assertEqual(self.op('claim',str(w),'--owner','test').returncode,0)
  self.assertEqual(self.op('cleanup','--apply').returncode,0);self.assertTrue(w.exists())
  self.assertEqual(self.op('finish',str(w),'--owner','test','--base-ref',self.g('symbolic-ref','HEAD')).returncode,0)
  f=self.state/'test/worktrees.json';d=json.loads(f.read_text());d[str(w)]['finished_at']=0;f.write_text(json.dumps(d))
  (w/'precious').write_text('unfinished');self.op('cleanup','--apply');self.assertTrue(w.exists())
  (w/'precious').unlink();self.op('cleanup');self.assertTrue(w.exists())
  r=self.op('cleanup','--apply');self.assertEqual(r.returncode,0,r.stderr);self.assertFalse(w.exists(),r.stdout)
  self.assertTrue(self.g('rev-parse','worker'))
 def test_ignored_and_unmerged_preserved(self):
  w=self.base/'worker';self.g('worktree','add','-b','worker',str(w))
  self.op('finish',str(w),'--owner','test','--base-ref',self.g('symbolic-ref','HEAD'))
  f=self.state/'test/worktrees.json';d=json.loads(f.read_text());d[str(w)]['finished_at']=0;f.write_text(json.dumps(d))
  (w/'.gitignore').write_text('secret\n');subprocess.run(['git','-C',str(w),'add','.gitignore'],check=True);subprocess.run(['git','-C',str(w),'commit','-m','unique'],check=True,stdout=subprocess.DEVNULL)
  self.op('cleanup','--apply');self.assertTrue(w.exists())
  (w/'secret').write_text('keep');self.op('cleanup','--apply');self.assertTrue(w.exists())
 def test_active_finished_worktree_retained(self):
  w=self.base/'worker';self.g('worktree','add','-b','worker',str(w))
  self.op('finish',str(w),'--owner','test','--base-ref',self.g('symbolic-ref','HEAD'))
  f=self.state/'test/worktrees.json';d=json.loads(f.read_text());d[str(w)]['finished_at']=0;f.write_text(json.dumps(d))
  child=subprocess.Popen(['sleep','2'],cwd=w)
  try:
   r=self.op('cleanup','--apply');self.assertTrue(w.exists());self.assertIn('active process',r.stdout)
  finally:child.terminate();child.wait()
 def test_invalid_base_rejected(self):
  w=self.base/'worker';self.g('worktree','add','-b','worker',str(w))
  self.assertEqual(self.op('finish',str(w),'--owner','test','--base-ref','HEAD').returncode,75)
 def test_cache_validation(self):
  import importlib.util
  prior=os.environ.get('AGENT_OPS_STATE');os.environ['AGENT_OPS_STATE']=str(self.state)
  try:
   spec=importlib.util.spec_from_file_location('ops',self.script);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
   out=self.root/'out';(out/'Build').mkdir(parents=True);(out/'Build/product').write_text('generated')
   for p in [out/'Build/product',out/'Build',out]:os.utime(p,(1,1))
   self.assertEqual(m.safe_cache(self.root,'out',time.time()-86400),'')
   (out/'.env').write_text('private');self.assertTrue(m.safe_cache(self.root,'out',time.time()-86400));(out/'.env').unlink()
   self.g('add','out/Build/product');self.assertEqual(m.safe_cache(self.root,'out',time.time()-86400),'contains tracked files')
   link=self.root/'link';link.symlink_to(out,target_is_directory=True);self.assertEqual(m.safe_cache(self.root,'link',time.time()),'symlink or non-directory')
  finally:
   if prior is None:os.environ.pop('AGENT_OPS_STATE',None)
   else:os.environ['AGENT_OPS_STATE']=prior
if __name__=='__main__':unittest.main(verbosity=2)

#!/usr/bin/env python3
"""Local per-app release exclusion and conservative, opt-in worktree retirement."""
import argparse, contextlib, fcntl, hashlib, json, os, pathlib, shutil, signal, subprocess, sys, time

ROOT = pathlib.Path(__file__).resolve().parents[1]
CFG = json.loads((ROOT / '.agent-ops.json').read_text())
STATE = pathlib.Path(os.environ.get('AGENT_OPS_STATE', str(pathlib.Path.home()/'.local/state/agent-ops'))) / CFG['app_id']
STATE.mkdir(parents=True, exist_ok=True, mode=0o700)


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args], stderr=subprocess.PIPE).decode().strip()


def save(path, data):
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(data, indent=2)+'\n')
    os.replace(temp, path)


def event(kind, **data):
    with (STATE/'events.jsonl').open('a') as f:
        f.write(json.dumps(dict(time=time.time(), event=kind, **data))+'\n')


@contextlib.contextmanager
def lock(name):
    with (STATE/(name+'.lock')).open('a+') as f:
        try:
            fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError(f'{name} already running for {CFG["app_id"]}; retry after it finishes')
        yield f.fileno()
        # Never unlink the inode: other processes may still hold/wait on it.


def inherited_lock():
    try:
        fd = int(os.environ['AGENT_OPS_RELEASE_FD'])
        s = os.fstat(fd); expected = (STATE/'release.lock').stat()
        if (s.st_dev, s.st_ino)!=(expected.st_dev, expected.st_ino):return None
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return fd
    except (KeyError, ValueError, OSError):
        return None


def run(command):
    if command and command[0]=='--': command=command[1:]
    if not command: raise RuntimeError('Supply a foreground command after --')
    fd=inherited_lock()
    if fd is not None:
        return subprocess.call(command, pass_fds=(fd,))
    with lock('release') as fd:
        env=dict(os.environ, AGENT_OPS_RELEASE_FD=str(fd))
        event('release-start', pid=os.getpid(), cwd=os.getcwd())
        # Do not log arguments: deployment commands can contain credentials.
        child=subprocess.Popen(command, env=env, pass_fds=(fd,))
        def forward(sig, frame):
            if child.poll() is None: child.send_signal(sig)
        previous={s:signal.signal(s,forward) for s in (signal.SIGTERM,signal.SIGINT)}
        try: code=child.wait()
        finally:
            for s,h in previous.items():signal.signal(s,h)
        event('release-end', code=code)
        return code if code>=0 else 128-code


def worktrees():
    rows=[]
    for block in git(ROOT,'worktree','list','--porcelain','-z').split('\0\0'):
        row={}
        for line in block.split('\0'):
            key,_,value=line.partition(' ');row[key]=value
        if 'worktree' in row:
            row['worktree']=str(pathlib.Path(row['worktree']).resolve());rows.append(row)
    return rows


def registry():
    p=STATE/'worktrees.json'
    return json.loads(p.read_text()) if p.exists() else {}


def activity():
    # Fail closed if process inventory is unavailable.
    cwd=subprocess.run(['lsof','-n','-d','cwd','-Fn'],capture_output=True,text=True)
    ps=subprocess.run(['ps','-axo','pid,args'],capture_output=True,text=True)
    if cwd.returncode not in (0,1) or not any(x.startswith('n/') for x in cwd.stdout.splitlines()) or ps.returncode:
        raise RuntimeError('Cannot establish process activity; cleanup refused')
    dirs=[x[1:] for x in cwd.stdout.splitlines() if x.startswith('n/')]
    commands=[line for line in ps.stdout.splitlines()[1:] if line.split(None,1)[0] not in {str(os.getpid()),str(os.getppid())}]
    return dirs,commands


def active(path, inventory):
    dirs,commands=inventory;p=str(path)
    return any(x==p or x.startswith(p+'/') for x in dirs) or any(p+'/' in x or p+' ' in x or x.endswith(p) for x in commands)


def safe_cache(root, relative, cutoff):
    p=root/relative
    if not p.exists():return None
    if p.resolve()!=p.absolute() or not p.is_dir():return 'symlink or non-directory'
    if git(root,'ls-files','--',relative):return 'contains tracked files'
    # Only known Xcode output roots, not arbitrary folders named build.
    if not any((p/x).exists() for x in ('Build','ModuleCache.noindex','Intermediates.noindex')):
        return 'not recognized Xcode output'
    for base,dirs,files in os.walk(p,followlinks=False):
        for name in files+dirs:
            if name.endswith(('.xcarchive','.p12','.p8','.pem','.key','.keystore')) or name.startswith('.env'):return 'archive or sensitive file retained'
            if (pathlib.Path(base)/name).lstat().st_mtime>cutoff:return 'recently modified'
    if p.stat().st_mtime>cutoff:return 'recently modified'
    return ''


def clean(apply):
    with lock('maintenance'), lock('release'):
        data=registry();inventory=activity();now=time.time();results=[]
        for row in worktrees():
            root=pathlib.Path(row['worktree'])
            if not root.exists():continue
            record=data.setdefault(str(root),dict(owner='unassigned', discovered_at=now))
            is_active=active(root,inventory)
            record['active_at_last_scan']=is_active
            if is_active:
                results.append(dict(path=str(root),action='keep',reason='active process'));continue
            # Only declared cache paths, never archives, dependencies or source.
            for rel in CFG['build_caches']:
                reason=safe_cache(root,rel,now-CFG['build_days']*86400)
                if reason is None:continue
                target=root/rel
                action='keep' if reason else ('remove-cache' if apply else 'would-remove-cache')
                results.append(dict(path=str(target),action=action,reason=reason or 'old generated Xcode output'))
                if not reason and apply:
                    # Recheck immediately, under the app lock.
                    if active(root,activity()) or safe_cache(root,rel,now-CFG['build_days']*86400):continue
                    shutil.rmtree(target);event('remove-cache',path=str(target))
            if 'finished_at' not in record:continue
            reason=None
            common=pathlib.Path(git(root,'rev-parse','--path-format=absolute','--git-common-dir'))
            if root.resolve()==common.parent.resolve():reason='main checkout'
            elif 'locked' in row or 'prunable' in row:reason='locked or stale registration'
            elif now-record['finished_at']<CFG['worktree_days']*86400:reason='completion retention window'
            elif row.get('HEAD')!=record.get('head'):reason='HEAD changed since completion'
            elif not row.get('branch'):reason='detached HEAD'
            elif git(root,'status','--porcelain','--untracked-files=all'):reason='uncommitted or untracked files'
            elif git(root,'ls-files','--others','--ignored','--exclude-standard'):reason='ignored files retained'
            elif subprocess.run(['git','-C',str(root),'merge-base','--is-ancestor',row['HEAD'],record['base_ref']],capture_output=True).returncode:reason='not merged into recorded base'
            if not reason and active(root,activity()):reason='active process'
            if reason:results.append(dict(path=str(root),action='keep',reason=reason));continue
            results.append(dict(path=str(root),action='remove-worktree' if apply else 'would-remove-worktree',reason='finished, clean and merged'))
            if apply:
                # Never --force; Git must still accept the worktree as clean.
                git(ROOT,'worktree','remove',str(root));data.pop(str(root),None)
                event('remove-worktree',path=str(root),branch=row['branch'],head=row['HEAD'])
        if apply:save(STATE/'worktrees.json',data)
        report=dict(time=now,app=CFG['app_id'],apply=apply,free_bytes=shutil.disk_usage(ROOT).free,results=results)
        save(STATE/'last-cleanup.json',report)
        print(json.dumps(report,indent=2))


def main():
    p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='action',required=True)
    r=sub.add_parser('run');r.add_argument('command',nargs=argparse.REMAINDER)
    c=sub.add_parser('cleanup');c.add_argument('--apply',action='store_true')
    for name in ('claim','finish'):
        s=sub.add_parser(name);s.add_argument('path');s.add_argument('--owner',required=True)
        if name=='finish':s.add_argument('--base-ref',required=True)
    sub.add_parser('status')
    sub.add_parser('held')
    args=p.parse_args()
    if args.action=='held':return 0 if inherited_lock() is not None else 1
    if args.action=='run':return run(args.command)
    if args.action=='cleanup':clean(args.apply);return 0
    if args.action=='status':
        print(json.dumps(dict(app=CFG['app_id'],state=str(STATE),worktrees=registry()),indent=2));return 0
    with lock('maintenance'):
        path=str(pathlib.Path(args.path).resolve());rows={str(pathlib.Path(r['worktree']).resolve()):r for r in worktrees()}
        if path not in rows:raise RuntimeError('Not a registered worktree of this repository')
        data=registry()
        if args.action=='claim':data[path]=dict(owner=args.owner,claimed_at=time.time())
        else:
            if git(path,'status','--porcelain','--untracked-files=all'):raise RuntimeError('Cannot finish a dirty/untracked checkout')
            base_ref=git(path,'rev-parse','--symbolic-full-name',args.base_ref)
            if base_ref not in CFG['merge_targets']:raise RuntimeError('Choose a configured integration branch as --base-ref')
            git(path,'rev-parse','--verify',base_ref+'^{commit}')
            data[path]=dict(owner=args.owner,finished_at=time.time(),head=rows[path]['HEAD'],base_ref=base_ref)
        save(STATE/'worktrees.json',data)
    print(args.action+': '+path);return 0


if __name__=='__main__':
    try:sys.exit(main())
    except (RuntimeError,subprocess.CalledProcessError,OSError) as e:
        print('agent-ops: '+str(e),file=sys.stderr);sys.exit(75)

"""Exercise persistence against a local bare Git remote; never contact GitHub."""
import os
from pathlib import Path
import subprocess
import tempfile

script = Path(__file__).resolve().with_name('save-blog-state.sh')
def git(cwd, *args):
    return subprocess.check_output(['git', *args], cwd=cwd, stderr=subprocess.DEVNULL, text=True).strip()
with tempfile.TemporaryDirectory(prefix='aurelia-state-') as temporary:
    root = Path(temporary)
    remote = root / 'remote.git'
    source = root / 'source'
    subprocess.run(['git', 'init', '--bare', str(remote)], check=True, capture_output=True)
    source.mkdir()
    git(source, 'init', '-b', 'main')
    git(source, 'config', 'user.name', 'Test')
    git(source, 'config', 'user.email', 'test@example.com')
    (source / '.gitignore').write_text('agent/output/\n')
    (source / 'index.html').write_text('homepage')
    (source / 'blog').mkdir()
    (source / 'blog/index.html').write_text('blog')
    git(source, 'add', '.')
    git(source, 'commit', '-m', 'Initial')
    git(source, 'remote', 'add', 'origin', str(remote))
    git(source, 'push', 'origin', 'main')
    original = git(source, 'rev-parse', 'HEAD')
    (source / 'agent/output').mkdir(parents=True)
    (source / 'agent/output/post.json').write_text('{"status":"approved"}')
    environment = {**os.environ, 'RUNNER_TEMP': temporary}
    def save():
        subprocess.run(['bash', str(script)], cwd=source, env=environment, check=True, capture_output=True)
    save()
    state = git(source, 'ls-remote', 'origin', 'refs/heads/blog-state').split()[0]
    git(source, 'fetch', 'origin', 'blog-state')
    paths = git(source, 'ls-tree', '-r', '--name-only', 'FETCH_HEAD').splitlines()
    assert paths == ['agent/output/post.json', 'blog/index.html'], paths
    assert git(source, 'rev-parse', 'HEAD') == original
    assert not git(source, 'diff', '--cached', '--name-only')
    save()
    assert git(source, 'ls-remote', 'origin', 'refs/heads/blog-state').split()[0] == state
    (source / 'blog/index.html').write_text('updated blog')
    save()
    updated = git(source, 'ls-remote', 'origin', 'refs/heads/blog-state').split()[0]
    assert updated != state
    git(source, 'fetch', 'origin', 'blog-state')
    assert git(source, 'rev-parse', 'FETCH_HEAD^') == state
    print('PASS: state-only branch, durable history, idempotent retry, fast-forward, unchanged source/index')

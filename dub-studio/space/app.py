# Stem splitter for Pocket Dub Studio: one song at a time, Demucs htdemucs_6s on CPU, MP3 parts.
import os, re, secrets, shutil, subprocess, sys, threading, time, queue
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse

ROOT = '/tmp/jobs'
MAX_BYTES = 60 * 1024 * 1024
MAX_WAITING = 6
KEEP_SECONDS = 3600
STEMS = ('drums', 'bass', 'other', 'vocals', 'guitar', 'piano')
EXT = {'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav', 'audio/flac': 'flac',
       'audio/x-flac': 'flac', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'm4a', 'video/mp4': 'm4a'}
ID = re.compile(r'^[a-f0-9]{24}$')

os.makedirs(ROOT, exist_ok=True)
app = FastAPI()
jobs: dict = {}
lock = threading.Lock()
waiting: 'queue.Queue[str]' = queue.Queue()

def job(i: str) -> dict:
    if not ID.match(i) or i not in jobs: raise HTTPException(404, 'No such split')
    return jobs[i]

def run(i: str):
    j = jobs[i]
    if j['status'] == 'canceled': return
    j['status'], j['started'] = 'processing', time.time()
    d = os.path.join(ROOT, i)
    p = subprocess.Popen([sys.executable, '-u', '-m', 'demucs.separate', '-n', 'htdemucs_6s', '--mp3', '--mp3-bitrate', '320',
                          '-o', os.path.join(d, 'out'), j['input']], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    j['proc'] = p
    tail = b''
    while True:
        b = p.stderr.read(256)
        if not b: break
        tail = (tail + b)[-4000:]
        m = re.findall(rb'(\d+)%\|', tail)
        if m: j['progress'] = int(m[-1])
    p.wait(); j.pop('proc', None)
    try: os.remove(j['input'])
    except OSError: pass
    if j['status'] == 'canceled': return
    out = os.path.join(d, 'out', 'htdemucs_6s', 'in')
    got = [s for s in STEMS if os.path.exists(os.path.join(out, s + '.mp3'))]
    if p.returncode == 0 and got: j.update(status='succeeded', stems=got, out=out, progress=100)
    else:
        print(tail.decode(errors='replace'), flush=True)
        j.update(status='failed', error='The split failed. Is it a normal audio file?')
    j['finished'] = time.time()

def worker():
    while True:
        i = waiting.get()
        try: run(i)
        except Exception as e:
            print('job', i, e, flush=True); jobs[i].update(status='failed', error='The split failed', finished=time.time())

def sweeper():
    while True:
        time.sleep(300); now = time.time()
        for i, j in list(jobs.items()):
            if now - j['created'] > KEEP_SECONDS and j['status'] in ('succeeded', 'failed', 'canceled'):
                shutil.rmtree(os.path.join(ROOT, i), ignore_errors=True); jobs.pop(i, None)

threading.Thread(target=worker, daemon=True).start()
threading.Thread(target=sweeper, daemon=True).start()

@app.get('/health')
def health(): return {'ok': True}

@app.post('/split')
async def split(request: Request):
    if sum(1 for j in jobs.values() if j['status'] == 'starting') >= MAX_WAITING:
        return JSONResponse({'error': 'The splitter is busy. Try again in a few minutes.'}, 503)
    ext = EXT.get(request.headers.get('content-type', '').split(';')[0].strip(), 'bin')
    i = secrets.token_hex(12); d = os.path.join(ROOT, i); os.makedirs(d)
    path, n = os.path.join(d, 'in.' + ext), 0
    with open(path, 'wb') as f:
        async for chunk in request.stream():
            n += len(chunk)
            if n > MAX_BYTES:
                f.close(); shutil.rmtree(d, ignore_errors=True)
                return JSONResponse({'error': 'The song file must be under 60 MB.'}, 413)
            f.write(chunk)
    if n < 1000:
        shutil.rmtree(d, ignore_errors=True); return JSONResponse({'error': 'That file is empty.'}, 400)
    with lock:
        jobs[i] = {'status': 'starting', 'created': time.time(), 'input': path, 'progress': 0}
        waiting.put(i)
    return {'id': i}

@app.get('/status/{i}')
def status(i: str):
    j = job(i)
    r = {'status': j['status'], 'progress': j.get('progress', 0)}
    if j['status'] == 'starting':
        r['position'] = sum(1 for k, x in jobs.items() if x['status'] in ('starting', 'processing') and x['created'] < j['created'])
    if j['status'] == 'succeeded': r['stems'] = j['stems']
    if j['status'] == 'failed': r['error'] = j.get('error')
    return r

@app.get('/stem/{i}/{name}')
def stem(i: str, name: str):
    j = job(i)
    if name not in STEMS or j['status'] != 'succeeded' or name not in j['stems']: raise HTTPException(404, 'Not ready')
    return FileResponse(os.path.join(j['out'], name + '.mp3'), media_type='audio/mpeg')

@app.post('/cancel/{i}')
def cancel(i: str):
    j = job(i)
    if j['status'] in ('starting', 'processing'):
        j['status'] = 'canceled'; j['finished'] = time.time()
        p = j.get('proc')
        if p: p.kill()
    return {'ok': True}

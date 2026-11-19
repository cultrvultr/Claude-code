# Stem splitter for Pocket Dub Studio on Modal: Demucs htdemucs_6s on a T4 GPU, parts as 320k MP3.
# Deployed by .github/workflows/dub-splitter-deploy.yml. The site's /api/split function is the only caller (shared key).
#   POST /split (body: the song)  -> {id}
#   GET  /status/{id}             -> {status: starting|processing|succeeded|failed|canceled, progress, error?, stems?}
#   GET  /stem/{id}/{name}        -> MP3
#   POST /cancel/{id}
import os, re, time, shutil, hmac, subprocess, sys
import modal

app = modal.App('dub-splitter')
image = (modal.Image.debian_slim(python_version='3.11').apt_install('ffmpeg')
         .pip_install('torch==2.3.1', 'torchaudio==2.3.1', 'numpy<2', 'demucs==4.0.1', 'fastapi[standard]==0.115.0')
         .run_commands("python -c \"from demucs.pretrained import get_model; get_model('htdemucs_6s')\""))
web_image = modal.Image.debian_slim(python_version='3.11').pip_install('fastapi[standard]==0.115.0')
vol = modal.Volume.from_name('dub-splitter-parts', create_if_missing=True)
state = modal.Dict.from_name('dub-splitter-state', create_if_missing=True)
secret = modal.Secret.from_name('dub-splitter')

STEMS = ('drums', 'bass', 'other', 'vocals', 'guitar', 'piano')
EXT = {'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav', 'audio/flac': 'flac',
       'audio/x-flac': 'flac', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'm4a', 'video/mp4': 'm4a'}
MAX_BYTES = 60 * 1024 * 1024
KEEP_SECONDS = 3600
ID = re.compile(r'^fc-[A-Za-z0-9]{10,40}$')


@app.function(image=image, gpu='T4', timeout=900, max_containers=2, scaledown_window=60, volumes={'/data': vol})
def split(song: bytes, ext: str) -> list:
    i = modal.current_function_call_id()
    state[i] = {'status': 'processing', 'progress': 0, 't': time.time()}
    work = f'/tmp/{i}'; os.makedirs(work, exist_ok=True)
    src = f'{work}/in.{ext}'
    with open(src, 'wb') as f: f.write(song)
    p = subprocess.Popen([sys.executable, '-u', '-m', 'demucs.separate', '-n', 'htdemucs_6s', '-d', 'cuda', '--mp3', '--mp3-bitrate', '320',
                          '-o', f'{work}/out', src], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    tail, last = b'', 0.0
    while True:
        b = p.stderr.read(256)
        if not b: break
        tail = (tail + b)[-4000:]
        m = re.findall(rb'(\d+)%\|', tail)
        if m and time.time() - last > 2:
            last = time.time(); state[i] = {'status': 'processing', 'progress': int(m[-1]), 't': last}
    p.wait()
    out = f'{work}/out/htdemucs_6s/in'
    got = [s for s in STEMS if os.path.exists(f'{out}/{s}.mp3')]
    if p.returncode != 0 or not got:
        print(tail.decode(errors='replace'))
        raise RuntimeError('demucs failed')
    os.makedirs(f'/data/{i}', exist_ok=True)
    for s in got: shutil.copy(f'{out}/{s}.mp3', f'/data/{i}/{s}.mp3')
    vol.commit()
    shutil.rmtree(work, ignore_errors=True)
    state[i] = {'status': 'succeeded', 'progress': 100, 'stems': got, 't': time.time()}
    return got


@app.function(image=web_image, schedule=modal.Period(hours=1), volumes={'/data': vol})
def sweep():
    now = time.time()
    for d in os.listdir('/data'):
        try:
            if now - os.path.getmtime(f'/data/{d}') > KEEP_SECONDS: shutil.rmtree(f'/data/{d}', ignore_errors=True)
        except OSError: pass
    vol.commit()
    for k in list(state.keys()):
        try:
            if now - state[k].get('t', 0) > KEEP_SECONDS: state.pop(k)
        except KeyError: pass


@app.function(image=web_image, secrets=[secret], volumes={'/data': vol})
@modal.concurrent(max_inputs=20)
@modal.asgi_app()
def web():
    from fastapi import FastAPI, Request, HTTPException
    from fastapi.responses import FileResponse, JSONResponse
    api = FastAPI()
    KEY = os.environ['SPLIT_KEY']

    @api.middleware('http')
    async def guard(request: Request, call_next):
        if not hmac.compare_digest(request.headers.get('x-key', ''), KEY): return JSONResponse({'error': 'forbidden'}, 403)
        return await call_next(request)

    def check(i: str):
        if not ID.match(i): raise HTTPException(400, 'Bad id')

    @api.post('/split')
    async def start(request: Request):
        body = bytearray()
        async for chunk in request.stream():
            body += chunk
            if len(body) > MAX_BYTES: return JSONResponse({'error': 'The song file must be under 60 MB.'}, 413)
        if len(body) < 1000: return JSONResponse({'error': 'That file is empty.'}, 400)
        ext = EXT.get(request.headers.get('content-type', '').split(';')[0].strip(), 'bin')
        call = await split.spawn.aio(bytes(body), ext)
        await state.put.aio(call.object_id, {'status': 'starting', 'progress': 0, 't': time.time()})
        return {'id': call.object_id}

    @api.get('/status/{i}')
    async def status(i: str):
        check(i)
        s = await state.get.aio(i)
        if s is None: raise HTTPException(404, 'No such split')
        if s['status'] in ('succeeded', 'canceled'): return {k: v for k, v in s.items() if k != 't'}
        try:
            await modal.FunctionCall.from_id(i).get.aio(timeout=0)
        except modal.exception.OutputExpiredError:
            return {'status': 'failed', 'error': 'The split expired'}
        except modal.exception.FunctionTimeoutError:
            return {'status': 'failed', 'error': 'The song took too long to split'}
        except (TimeoutError, modal.exception.TimeoutError):
            return {'status': s['status'], 'progress': s.get('progress', 0)}   # still running or waiting
        except Exception as e:
            print('split', i, 'failed:', type(e).__name__, e)
            return {'status': 'failed', 'error': 'The split failed. Is it a normal audio file?'}
        s = await state.get.aio(i) or s
        return {k: v for k, v in s.items() if k != 't'}

    @api.get('/stem/{i}/{name}')
    async def stem(i: str, name: str):
        check(i)
        if name not in STEMS: raise HTTPException(400, 'Bad part')
        path = f'/data/{i}/{name}.mp3'
        if not os.path.exists(path): await vol.reload.aio()
        if not os.path.exists(path): raise HTTPException(404, 'Not ready')
        return FileResponse(path, media_type='audio/mpeg')

    @api.post('/cancel/{i}')
    async def cancel(i: str):
        check(i)
        await modal.FunctionCall.from_id(i).cancel.aio()
        await state.put.aio(i, {'status': 'canceled', 'progress': 0, 't': time.time()})
        return {'ok': True}

    return api

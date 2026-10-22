#!/usr/bin/env python3
"""Brings the mobygratis catalogue into nu.waves.

  python3 tools/mobygratis.py sync              # refresh titles, tags, BPM and length from mobygratis.com
  python3 tools/mobygratis.py import [--limit N] [--only SLUG ...]

`import` signs in to your own mobygratis account (downloads need one), fetches each track's multitrack WAVs,
encodes every stem to 48 kbps mono Opus in MP4 (the same format as First Attempt's stems), uploads it to
gs://khensu-waves-media/mobygratis/<slug>/ and writes the stem list into src/data/mobygratis.json. It works one
track at a time and deletes the WAVs before the next, so it never needs more than one track's worth of disk, and
it can be stopped and re-run at any point.

Sign-in, one of:
  MOBYGRATIS_EMAIL + MOBYGRATIS_PASSWORD
  MOBYGRATIS_REFRESH_TOKEN   (from a signed-in mobygratis.com tab: IndexedDB firebaseLocalStorageDb,
                              stsTokenManager.refreshToken)

The licence travels with every track: free and non-commercial, credited "Music by mobygratis" (never by Moby's
name), not used to promote right-wing politics, meat, dairy or other animal products, and Restricted Tracks are
played but never remixed.
"""

import argparse
import html
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

SITE = 'https://mobygratis.com'
# Public web key from mobygratis.com/assets/scripts.js (Firebase project mobygratis-2945d).
FIREBASE_KEY = 'AIzaSyCTwaxUqAP88DzfAkhVaaYAdpmfl_hh5wc'
BUCKET = 'gs://khensu-waves-media/mobygratis'
DATA = Path(__file__).resolve().parent.parent / 'sites/khensu-nu/src/data/mobygratis.json'
UA = 'nu.waves-importer/1 (+https://waves.khensu.nu; non-commercial, credited "Music by mobygratis")'
MIN_FREE = 1_500_000_000
KBPS = 48
KNOWN = {
    'drum': 'drums', 'kick': 'drums', 'snare': 'drums', 'hat': 'drums', 'perc': 'drums', 'beat': 'drums',
    'bass': 'bass', 'sub': 'bass',
    'piano': 'piano', 'keys': 'piano', 'rhodes': 'piano', 'organ': 'piano',
    'synth': 'synths', 'pad': 'synths', 'string': 'synths', 'lead': 'synths', 'arp': 'synths',
    'guitar': 'guitar', 'gtr': 'guitar',
}


def say(*a):
    print('mobygratis:', *a, flush=True)


def http(url, data=None, headers=None, timeout=120):
    h = {'User-Agent': UA, **(headers or {})}
    body = urllib.parse.urlencode(data).encode() if isinstance(data, dict) else data
    req = urllib.request.Request(url, body, h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get('Content-Type', ''), r.geturl()


def load():
    return json.loads(DATA.read_text()) if DATA.exists() else {'tracks': []}


def save(doc):
    tmp = DATA.with_suffix('.tmp')
    tmp.write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':')))
    tmp.replace(DATA)


# MARK: Catalogue

def search_page(offset=0, limit=240, sort='Random'):
    form = {'prefix': '', 'sort': sort, 'bpm_min': '0', 'bpm_max': '500', 'limit': str(limit), 'offset': str(offset)}
    body, _, _ = http(f'{SITE}/api/search', form, {'HX-Request': 'true'})
    return body.decode('utf-8', 'replace')


def parse_rows(page):
    out = {}
    for r in page.split('<tr class="align-middle')[1:]:
        ids = re.findall(r'"id": "([0-9a-f-]{36})"', r)
        slug = re.findall(r'hx-get="/api/tracks/([^"]+)"', r)
        if not ids or not slug:
            continue
        text = re.split(r'<(?:svg|path)[^>]*>.*?</(?:svg|path)>|<[^>]+>', r, flags=re.S)
        parts = [p for p in (html.unescape(re.sub(r'\s+', ' ', x)).strip() for x in text) if p and not p.startswith('hover:')]
        bpm = next((p for p in parts if re.fullmatch(r'\d{2,3}', p)), None)
        dur = next((p for p in parts if re.fullmatch(r'\d+:\d\d', p)), '0:00')
        tags = parts[1] if len(parts) > 1 and parts[1] not in (bpm, dur) else ''
        m, s = dur.split(':')
        out[ids[0]] = {
            'id': slug[0], 'uuid': ids[0], 'title': parts[0], 'tags': tags.split(),
            'bpm': int(bpm) if bpm else None, 'dur': int(m) * 60 + int(s),
            **({'restricted': True} if 'restricted' in r.lower() else {}),
        }
    return out


def catalogue_size():
    body, _, _ = http(f'{SITE}/')
    text = re.sub(r'<[^>]+>', ' ', re.sub(r'<(script|style).*?</\1>', '', body.decode('utf-8', 'replace'), flags=re.S))
    m = re.search(r'catalog\s+(\d+)\s+tracks', re.sub(r'\s+', ' ', text))
    return int(m.group(1)) if m else None


def sync():
    want = catalogue_size()
    found = {}
    # Sorting is random on their side, so page until every track has turned up.
    for attempt in range(40):
        for off in (0, 240, 480):
            found.update(parse_rows(search_page(off)))
        say(f'{len(found)} of {want or "?"} tracks listed')
        if want and len(found) >= want:
            break
        time.sleep(1)
    doc = load()
    have = {t['uuid']: t for t in doc.get('tracks', [])}
    tracks = []
    for uuid, t in found.items():
        old = have.get(uuid, {})
        if old.get('stems'):
            t['stems'] = old['stems']
        tracks.append(t)
    tracks.sort(key=lambda t: t['title'].lower())
    doc.update({
        'source': SITE, 'licence': f'{SITE}/license-agreement',
        'synced': time.strftime('%Y-%m-%d'), 'count': want or len(tracks), 'tracks': tracks,
    })
    save(doc)
    gone = set(have) - set(found)
    if gone:
        say(f'{len(gone)} tracks are no longer on mobygratis.com and were dropped from the catalogue:',
            ', '.join(have[g]['id'] for g in gone))
    say(f'saved {len(tracks)} tracks to {DATA.relative_to(DATA.parents[3])}')


# MARK: Sign-in

class Auth:
    def __init__(self):
        self.token = None
        self.refresh = os.environ.get('MOBYGRATIS_REFRESH_TOKEN')
        self.expires = 0.0

    def bearer(self):
        if self.token and time.time() < self.expires - 120:
            return self.token
        if self.refresh:
            body, _, _ = http(f'https://securetoken.googleapis.com/v1/token?key={FIREBASE_KEY}',
                              {'grant_type': 'refresh_token', 'refresh_token': self.refresh})
            j = json.loads(body)
            self.token, self.refresh, ttl = j['id_token'], j['refresh_token'], int(j['expires_in'])
        else:
            email, pw = os.environ.get('MOBYGRATIS_EMAIL'), os.environ.get('MOBYGRATIS_PASSWORD')
            if not (email and pw):
                sys.exit('mobygratis: set MOBYGRATIS_EMAIL and MOBYGRATIS_PASSWORD, or MOBYGRATIS_REFRESH_TOKEN')
            payload = json.dumps({'email': email, 'password': pw, 'returnSecureToken': True}).encode()
            body, _, _ = http(f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_KEY}',
                              payload, {'Content-Type': 'application/json'})
            j = json.loads(body)
            self.token, self.refresh, ttl = j['idToken'], j['refreshToken'], int(j['expiresIn'])
        self.expires = time.time() + ttl
        return self.token


# MARK: Import

def download(auth, uuid, dest: Path):
    """Asks mobygratis for the multitrack and saves the archive (or archives) under dest."""
    hdr = {'Authorization': f'Bearer {auth.bearer()}', 'HX-Request': 'true'}
    body, ctype, _ = http(f'{SITE}/api/download', {'id': uuid, 'format': 'Multi'}, hdr)
    files = []
    if 'zip' in ctype or body[:2] == b'PK':
        files.append(('multitrack.zip', body))
    else:
        text = body.decode('utf-8', 'replace')
        if 'auth_modal' in text or 'Accept the licence terms' in text:
            raise RuntimeError('mobygratis asked for sign-in or licence acceptance; accept the licence once on mobygratis.com with this account')
        urls = [html.unescape(u) for u in re.findall(r'(https?://[^"\'\s<>]+)', text)]
        urls = [u for u in urls if re.search(r'\.(zip|wav)(\?|$)|storage\.googleapis|firebasestorage|amazonaws|r2\.', u)]
        if not urls:
            dump = dest / 'download-response.html'
            dump.write_text(text)
            raise RuntimeError(f'no download link in the response; saved it to {dump}')
        for u in dict.fromkeys(urls):
            name = Path(urllib.parse.urlparse(u).path).name or 'stem.wav'
            data, _, _ = http(u, timeout=600)
            files.append((name, data))
    wavs = []
    for name, data in files:
        if name.endswith('.zip') or data[:2] == b'PK':
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                for m in z.infolist():
                    if m.filename.lower().endswith(('.wav', '.aif', '.aiff', '.flac')) and not m.filename.startswith('__MACOSX'):
                        out = dest / Path(m.filename).name
                        out.write_bytes(z.read(m))
                        wavs.append(out)
        else:
            out = dest / name
            out.write_bytes(data)
            wavs.append(out)
    return wavs


def stem_names(paths, title):
    """Turns file names into short stem ids and labels, unique within the track."""
    t = re.sub(r'[^a-z0-9]+', ' ', title.lower()).strip()
    used = set()
    out = []
    for p in sorted(paths):
        raw = re.sub(r'[_\-]+', ' ', p.stem).strip()
        low = raw.lower()
        if t and low.startswith(t):
            raw = raw[len(t):].strip(' -_.')
        raw = re.sub(r'^\d+\s*', '', raw) or p.stem
        label = raw[:1].upper() + raw[1:]
        base = next((v for k, v in KNOWN.items() if k in low), None) or re.sub(r'[^a-z0-9]+', '-', raw.lower()).strip('-') or 'stem'
        sid, n = base, 2
        while sid in used:
            sid, n = f'{base}-{n}', n + 1
        used.add(sid)
        out.append((p, sid, label))
    return out


def encode(src: Path, dst: Path):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-ac', '1', '-ar', '48000',
                    '-c:a', 'libopus', '-b:a', f'{KBPS}k', '-application', 'audio',
                    '-movflags', '+faststart', '-f', 'mp4', str(dst)], check=True)


def upload(folder: Path, slug):
    subprocess.run(['gsutil', '-q', '-m', '-h', 'Cache-Control:public, max-age=31536000, immutable',
                    '-h', 'Content-Type:audio/mp4', 'cp', *[str(p) for p in sorted(folder.glob('*.mp4'))],
                    f'{BUCKET}/{slug}/'], check=True)


def import_one(auth, t, work: Path):
    folder = work / t['id']
    folder.mkdir(parents=True, exist_ok=True)
    try:
        wavs = download(auth, t['uuid'], folder)
        if not wavs:
            raise RuntimeError('the archive had no audio files')
        stems = []
        for src, sid, label in stem_names(wavs, t['title']):
            dst = folder / f'{sid}.mp4'
            encode(src, dst)
            src.unlink()
            stems.append({'id': sid, 'label': label, 'file': dst.name, 'kbps': KBPS})
        upload(folder, t['id'])
        return stems
    finally:
        shutil.rmtree(folder, ignore_errors=True)


def run_import(limit, only):
    doc = load()
    todo = [t for t in doc['tracks'] if not t.get('stems') and (not only or t['id'] in only)]
    if limit:
        todo = todo[:limit]
    say(f'{len(todo)} tracks to import')
    auth = Auth()
    work = Path(tempfile.mkdtemp(prefix='mobygratis-'))
    done = failed = 0
    try:
        for i, t in enumerate(todo, 1):
            free = shutil.disk_usage(work).free
            if free < MIN_FREE:
                say(f'stopping: only {free / 1e9:.1f} GB free')
                break
            try:
                t['stems'] = import_one(auth, t, work)
                save(doc)
                done += 1
                say(f'[{i}/{len(todo)}] {t["title"]}: {len(t["stems"])} stems')
            except Exception as e:
                failed += 1
                say(f'[{i}/{len(todo)}] {t["title"]}: {e}')
                if 'sign-in' in str(e) or 'no download link' in str(e):
                    break
            time.sleep(2)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    total = sum(1 for t in doc['tracks'] if t.get('stems'))
    say(f'imported {done}, failed {failed}; {total} of {len(doc["tracks"])} tracks now have stems')
    say('rebuild and publish khensu-nu for them to play on waves.khensu.nu')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('sync')
    imp = sub.add_parser('import')
    imp.add_argument('--limit', type=int, default=0)
    imp.add_argument('--only', nargs='*', default=[])
    a = ap.parse_args()
    if a.cmd == 'sync':
        sync()
    else:
        run_import(a.limit, set(a.only))


if __name__ == '__main__':
    main()

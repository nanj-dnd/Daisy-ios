#!/usr/bin/env python3
"""Capture actual iOS Simulator screens from the local Metro build, never a web approximation.

Usage: python3 scripts/review-screens.py <simulator-UDID> [--output ../build/daisy-review]
Run `npm run ios -- --localhost` first. Pillow is optional, for contact sheets only.
"""
import argparse
import json
from pathlib import Path
import subprocess
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('device')
parser.add_argument('--output', type=Path, default=Path('../build/daisy-review'))
parser.add_argument('--day', type=int, default=int(time.time() // 86400))
parser.add_argument('--modes', nargs='+', choices=['light', 'dark', 'large'], default=['light', 'dark', 'large'])
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
games = ['trivia', 'estimation', 'cryptic', 'word', 'groups', 'sudoku', 'zip', 'globle']


def sim(*command):
    return subprocess.run(['xcrun', 'simctl', *command], check=True, capture_output=True, text=True).stdout.strip()


appearance = sim('ui', args.device, 'appearance')
text_size = sim('ui', args.device, 'content_size')
files = []
try:
    for mode in args.modes:
        sim('ui', args.device, 'appearance', 'dark' if mode == 'dark' else 'light')
        sim('ui', args.device, 'content_size', 'accessibility-medium' if mode == 'large' else 'large')
        for game in games:
            sim('openurl', args.device, f'exp://127.0.0.1:8081/--/game/{game}/{args.day}')
            time.sleep(1.1)  # Navigation, fonts and keyboard settle before the single capture.
            target = args.output / f'{game}-{mode}.png'
            sim('io', args.device, 'screenshot', str(target.resolve()))
            files.append(target.name)
        print(f'Captured all eight games: {mode}', flush=True)
        try:
            from PIL import Image, ImageDraw
        except ImportError:
            continue
        width, height = 300, 670
        sheet = Image.new('RGB', (width * 4, (height + 26) * 2), '#D7DEE7')
        draw = ImageDraw.Draw(sheet)
        for i, game in enumerate(games):
            with Image.open(args.output / f'{game}-{mode}.png') as shot:
                shot.thumbnail((width, height))
                x, y = i % 4 * width, i // 4 * (height + 26)
                draw.text((x + 10, y + 6), f'{game} / {mode}', fill='#102951')
                sheet.paste(shot, (x + (width - shot.width) // 2, y + 26))
        sheet.save(args.output / f'contact-{mode}.jpg', quality=92)
finally:
    if appearance in ('light', 'dark'):
        sim('ui', args.device, 'appearance', appearance)
    if text_size not in ('unknown', 'unsupported'):
        sim('ui', args.device, 'content_size', text_size)

(args.output / 'capture.json').write_text(json.dumps({
    'device': args.device, 'day': args.day, 'files': files,
    'note': 'Static simulator capture; touch and frame pacing still require device testing.',
}, indent=2) + '\n')

#!/usr/bin/env python3
"""把 pics.js 里的 emoji 映射换成开源插画（OpenMoji，CC BY-SA 4.0）。

用法：
    python3 tools/fetch_openmoji.py

做的事：
1. 读 src/data/pics.js，解析出 单词 -> emoji
2. 把 emoji 转成 codepoint，从 OpenMoji 官方 CDN 下载彩色 SVG
3. 存到 src/assets/pics/<word>.svg
4. 生成 src/data/picAssets.js（静态 import，打包时内联）

网络不通时会直接报错退出，不会破坏现有 emoji 方案。
"""
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PICS_JS = os.path.join(ROOT, "src/data/pics.js")
OUT_DIR = os.path.join(ROOT, "src/assets/pics")
ASSET_JS = os.path.join(ROOT, "src/data/picAssets.js")
CDN = "https://cdn.jsdelivr.net/npm/openmoji@15.0.1/color/svg/{code}.svg"

PAIR = re.compile(r"^\s*'?([a-zA-Z' ]+)'?\s*:\s*'([^']+)'")


def parse_pairs(path):
    pairs = []
    with open(path, encoding="utf-8") as f:
        body = f.read().split("const FALLBACK")[0]
    for line in body.splitlines():
        m = PAIR.match(line)
        if m:
            pairs.append((m.group(1).strip().lower(), m.group(2)))
    return pairs


def code_of(emoji):
    return "-".join("%X" % ord(ch) for ch in emoji if ch != "\ufe0f")


def main():
    pairs = parse_pairs(PICS_JS)
    if not pairs:
        print("没有在 pics.js 里解析到单词映射")
        return 1
    os.makedirs(OUT_DIR, exist_ok=True)
    ok, fail = [], []
    for word, emoji in pairs:
        code = code_of(emoji)
        fname = re.sub(r"[^a-z0-9]+", "_", word) + ".svg"
        dst = os.path.join(OUT_DIR, fname)
        if os.path.exists(dst):
            ok.append((word, fname))
            continue
        try:
            with urllib.request.urlopen(CDN.format(code=code), timeout=20) as r:
                data = r.read()
            with open(dst, "wb") as f:
                f.write(data)
            ok.append((word, fname))
        except Exception as e:
            fail.append((word, str(e)))

    lines = ["/** 由 tools/fetch_openmoji.py 自动生成，不要手改 */"]
    for word, fname in ok:
        lines.append("import %s from '../assets/pics/%s'" % (re.sub(r'[^a-z0-9]+', '_', word), fname))
    lines.append("")
    lines.append("export const PIC_ASSETS = {")
    for word, _ in ok:
        key = re.sub(r"[^a-z0-9]+", "_", word)
        lines.append("  '%s': %s," % (word, key))
    lines.append("}")
    with open(ASSET_JS, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print("成功 %d 个，失败 %d 个" % (len(ok), len(fail)))
    for w, e in fail[:10]:
        print("  失败：", w, e)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

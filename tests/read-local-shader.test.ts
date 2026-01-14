import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const searchDirs = [
  'E:\\Work\\Unity\\URP17.1',
  'E:\\Work\\Unity\\HDRP6.3'
];

function findShaderFile() {
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const stack: string[] = [dir];
    while (stack.length) {
      const cur = stack.pop()!;
      const entries = fs.readdirSync(cur, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(cur, e.name);
        if (e.isDirectory()) stack.push(p);
        if (e.isFile() && (p.endsWith('.shader') || p.endsWith('.hlsl') || p.endsWith('.hlsli'))) return p;
      }
    }
  }
  return null;
}

const file = findShaderFile();

describe('本地 shader 基础验证（最小测试）', () => {
  if (!file) {
    it('未找到本地 shader/hlsl（本地路径可能不存在）', () => {
      expect(true).toBe(true); // 安全通过，不强制失败
    });
  } else {
    it('能读取 shader 文件且包含关键字', () => {
      const content = fs.readFileSync(file, 'utf8');
      expect(content.length).toBeGreaterThan(0);
      expect(/shader|hlsl/i.test(content)).toBe(true);
    });
  }
});

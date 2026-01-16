import { describe, it, expect } from 'vitest';
import { extractLocalVariablesFromFunctionText, getLocalVariables } from './helpers';

describe('variable extraction regression tests', () => {
  it('extractLocalVariablesFromFunctionText ignores variables inside strings and comments', () => {
    const sample = `
void Foo() {
  // int commented = 1;
  string s = "int fake = 2;";
  float realVar = 3.0;
}
`;
    const extracted = extractLocalVariablesFromFunctionText(sample, 'Foo');
    const names = extracted.map(v => v.name);
    expect(names).toContain('realVar');
    expect(names).not.toContain('commented');
    expect(names).not.toContain('fake');
  });

  it('getLocalVariables finds variables in last block and handles array declarations', () => {
    const sample = `
void Bar() {
  int a = 1;
}

void Test() {
  float arr[3];
  float x = 1.0;
}
`;
    const vars = getLocalVariables(sample);
    const names = vars.map(v => v.name);
    expect(names).toContain('arr');
    expect(names).toContain('x');
    expect(names).not.toContain('a');
  });

  it('extractLocalVariablesFromFunctionText handles nested braces correctly', () => {
    const sample = `
void Nested() {
  if (true) {
    int inner = 5;
  }
  int outer = 2;
}
`;
    const extracted = extractLocalVariablesFromFunctionText(sample, 'Nested');
    const names = extracted.map(v => v.name);
    expect(names).toContain('inner');
    expect(names).toContain('outer');
  });
});
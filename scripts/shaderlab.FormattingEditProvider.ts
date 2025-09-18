import * as vscode from 'vscode';
import * as $ from './$.js';

/**
 * Provide formatting edits for a whole document.
 * @param document The document in which the command was invoked.
 * @param options Options controlling formatting.
 * @param token A cancellation token.
 * @return A set of text edits or a thenable that resolves to such. The lack of a result can be
 * signaled by returning `undefined`, `null`, or an empty array.
 */
function provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {
    const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
    );

    let text = document.getText();
    // 去除每一行的首尾不可见字符
    text = trimLines(text);
    // 统一换行符为\n，防止不同系统间的换行符不一致导致的问题
    text = $.replace(text, /\r\n/g, v => '\n');
    text = $.replace(text, /(?<!\/\/.*)(;).+/gm, (v, v1) => v.replace(v1, ';\n'));

    text = $.replace(text, /(?<!\/\/.*)({\s*})/gm, (v, v1) => v.replace(v1, '{}'));
    text = $.replace(text, /(?<!\/\/.*).+({)(?!})/gm, (v, v1) => v.replace(v1, '\n{'));
    text = $.replace(text, /(?<!\/\/.*)({).+}/gm, (v, v1) => v.replace(v1, '{\n'));
    text = $.replace(text, /(?<!\/\/.*)(?<!{)(?<=.)(})/gm, (v, v1) => v.replace(v1, '\n}'));
    text = $.replace(text, /(?<!\/\/.*)(} +)/gm, (v, v1) => v.replace(v1, '}'));
    text = $.replace(text, /(?<!\/\/.*)(})(?!;).+/gm, (v, v1) => v.replace(v1, '}\n'));
    const lines = text.split('\n');
    for (let index = 0; index < lines.length; index++) {
        lines[index] = formatLine(lines[index]);
    }
    text = lines.join('\n');
    text = ResetTabs(text, options.tabSize);

    const edit = new vscode.TextEdit(fullRange, text);

    return [edit];
}

/**
 * 去除多行字符串中每一行的首尾不可见字符
 * @param input 多行字符串
 * @returns 处理后的多行字符串
 */
function trimLines(input: string): string {
    // 将字符串按行分割
    const lines = input.split('\n');
    // 去除每一行的首尾不可见字符
    const trimmedLines = lines.map(line => line.trim());
    // 将处理后的行重新拼接为多行字符串
    return trimmedLines.join('\n');
}

/**
 * 格式化一行文本
 */
function formatLine(text: string) {
    // 提前提取出字符串
    let stringIndex = 0;
    const strings = [];
    text = $.replace(text, /".*?"/gm, (v) => {
        strings.push(v);
        return `__string__${stringIndex++}__endstring__`;
    });

    // 提前提取出注释
    let annotation = "";
    const annotationMatchResult = text.match(/\/\/.*$/);
    if (annotationMatchResult && annotationMatchResult.length > 0) {
        annotation = text.substring(annotationMatchResult.index);
        annotation = annotation.replace(/\/\/ */, `// `);
        text = text.substring(0, annotationMatchResult.index);
    }

    // tab转为空格
    text = $.replace(text, /\t/gm, () => ' ');

    // 在 "+=" "-=" "*=" "/=" "=" (即赋值和自操作)两侧添加空格
    text = $.replace(text, /[\)\w]( *[+\-\*\/]?= *)[\(\w]/gm, (v, v1) => v.replace(v1, ` ${v1} `));

    // 在 "&&" "||" (即逻辑运算)两侧添加空格
    text = $.replace(text, /[\&\|]{2}/gm, (v) => ` ${v} `);

    // 在 "<=" ">=" "<" ">" "==" "!="(即比较操作)两侧添加空格
    text = $.replace(text, /[\)\w]([\<\>\=\!]=?)[\(\w]/gm, (v, v1) => v.replace(v1, ` ${v1} `));

    // 在四则运算两侧添加空格
    text = $.replace(text, /[\)\w]( *[+\-\*\/] *)[\(\w]/gm, (v, v1) => v.replace(v1, ` ${v1} `));

    // 在冒号两侧添加空格
    text = $.replace(text, /:/gm, () => ` : `);

    // 在冒号两侧添加空格
    text = $.replace(text, /\?/gm, () => ` ? `);

    // 四则运算，第二个参数为负数，操作符和第二个参数间添加空格
    text = $.replace(text, /([\+\-\*\/])\-/gm, (v, v1) => v.replace(v1, `${v1} `));

    // ")+" ")-" ")*" ")/" 中间添加空格
    text = $.replace(text, /\)([\+\-\*\/])/gm, (v, v1) => v.replace(v1, ` ${v1}`));

    // 在"if("中添加空格
    text = $.replace(text, /if\s*\(/gm, () => `if (`);

    // 去除分号前的空格
    text = $.replace(text, / *;/gm, () => '; ');
    // 去除逗号前的空格
    text = $.replace(text, / *, */gm, () => ', ');
    // 去除"("后的空格
    text = $.replace(text, /\( */gm, () => '(');
    // 去除")"前的空格(该符号不为本行第一个可见元素)
    text = $.replace(text, /\S+( *\))/gm, (v, v1) => v.replace(v1, `)`));
    // ")"后出现"{"时，自动换行(即函数定义)
    text = $.replace(text, /\) *{/gm, () => ')\n{');
    // "}" "};"后自动换行
    text = $.replace(text, /(\};\s*?)\S+/gm, (v, v1) => v.replace(v1, '}\n'));
    // 去除行首空格
    text = $.replace(text, /^ +/gm, () => '');
    // 去除行尾空格
    text = $.replace(text, / +$/gm, () => '');

    // 删除一个双斜杠前被错误添加的空格
    text = $.replace(text, / \/\//gm, () => '//');
    // 不在行首的连续空格合并为一个(除了双斜杠前的空格)
    text = $.replace(text, /\S+( +)(\/\/)?/gm, (v, v1, v2) => {
        if (v2 == undefined)
            return v.replace(v1, ` `);
        else
            return v;
    });
    // 双斜杠后的连续空格修改为一个
    text = $.replace(text, /\/\/ */gm, () => '// ');

    // 字符串还原
    text = $.replace(text, /__string__(\d*)__endstring__/gm, (_, v1) => strings[v1]);

    // 注释还原
    text += annotation;

    // 去除行尾空格
    text = $.replace(text, / +$/gm, () => '');

    return text;
}

/**
 * 重新调整后每行缩进
 */
function ResetTabs(text: string, tabSize: number) {
    const lines = text.split('\n');
    let tabLevel = 0;
    for (let i = 0; i < lines.length; i++) {
        const isBlockStart = lines[i].startsWith('{');
        const isBlockEnd = lines[i].startsWith('}');
        const isInlineBlock = lines[i].startsWith('{') && lines[i].trim().endsWith('}');

        const isPreDefIf = lines[i].startsWith('#if');
        const isPreDefElif = lines[i].startsWith('#elif');
        const isPreDefElse = lines[i].startsWith('#else');
        const isPreDefEndIf = lines[i].startsWith('#endif');
        const isPreDefStart = isPreDefIf || isPreDefElif || isPreDefElse;
        const isPreDefEnd = isPreDefElif || isPreDefElse || isPreDefEndIf;

        if (isBlockEnd || isPreDefEnd)
            tabLevel--;
        let curTabLevel = tabLevel;
        if (i > 0 && !isBlockStart) {
            // 紧跟if/else的单语句自动缩进
            if (/^\s*if|else\b/.test(lines[i - 1]))
                curTabLevel++;
            // 分三行写的三元表达式，后两行自动缩进
            if (/^[\?\:]/.test(lines[i]))
                curTabLevel++;
        }
        if (tabLevel > 0 && lines[i].length > 0)
            lines[i] = ' '.repeat(curTabLevel * tabSize) + lines[i];
        if (isBlockStart && !isInlineBlock || isPreDefStart)
            tabLevel++;
    }
    text = "";
    for (var line of lines)
        text += line + '\n';

    // 去除行尾空格
    text = $.replace(text, / +$/gm, () => '');

    // 去除文件末尾的多个换行
    text = text.replaceAll(/(\r?\n){3,}/g, '\n\n'),

        // 去除文件末尾的多个换行
        text = $.replace(text, /\n+$/, () => '\n');

    return text;
}

export { provideDocumentFormattingEdits };

import * as vscode from 'vscode';
import * as $ from './$';

type Line = {
    content: string;
    comment: string;
    indent: number;
}

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

    // 统一换行符为\n，防止不同系统间的换行符不一致导致的问题
    const text = $.replace(document.getText(), /\r\n/g, v => '\n');

    let lines: Line[] = text
        .replaceAll(/\r/g, '')
        .split('\n')
        .map(splitLineAndComment);

    // 去除'{'前后的空格
    replaceByLine(lines, /(\s*{\s*)/gm, (v, v1) => v.replace(v1, '{'));
    // 去除'}'前后的空格
    replaceByLine(lines, /(\s*}\s*)/gm, (v, v1) => v.replace(v1, '}'));

    // 分号后，如果有其他内容，换行
    replaceByLine(lines, /(;).+/gm, (v, v1) => v.replace(v1, ';\n'));

    // 成对的大括号中间没有可见内容的，改为'{}'
    replaceByLine(lines, /({\s*})/gm, (v, v1) => v.replace(v1, '{}'));
    // 不在行首的'{'，如果后面不是立即跟着'}'，则在'{'前换行
    replaceByLine(lines, /.+({)(?!})/gm, (v, v1) => v.replace(v1, '\n{'));
    // 如果'{'后面不是立即跟着'}'或行尾，则在'{'后换行
    replaceByLine(lines, /({)(?!}|$)/gm, (v, v1) => v.replace(v1, '{\n'));
    // 如果'}'前面不是立即跟着'{'，则在'}'前换行
    replaceByLine(lines, /(?<!{)(?<=.)(})/gm, (v, v1) => v.replace(v1, '\n}'));
    // 如果'}'后面不是立即跟着';'或行尾，则在'}'后换行
    replaceByLine(lines, /(})(?!;).+/gm, (v, v1) => v.replace(v1, '}\n'));
    for (let index = 0; index < lines.length; index++) {
        formatLine(lines[index]);
    }
    const newText = ResetTabs(lines, options.tabSize);

    const edit = new vscode.TextEdit(fullRange, newText);

    return [edit];
}

// 分离出一行的代码内容和注释
function splitLineAndComment(text: string): Line {
    const commentIndex = text.indexOf('//');
    return {
        content: commentIndex === -1 ? text.trim() : text.slice(0, commentIndex).trim(),
        comment: commentIndex === -1 ? '' : text.slice(commentIndex).trim(),
        indent: 0,
    };
}

// 一行代码按特定正则拆分为多行
// 例如：以分号拆分为多行
function replaceByLine(lines: Line[], regex: RegExp, asyncFn: (v: string, ...others: string[]) => string): void {
    const result: Line[] = [];
    lines.forEach(line => {
        line.content = $.replace(line.content, regex, asyncFn);
        const splitContents = line.content.split('\n');
        if (splitContents.length == 1)
            result.push(line);
        else {
            const newLines: Line[] = [];
            for (let j = 0; j < splitContents.length; j++) {
                newLines.push({
                    content: splitContents[j],
                    comment: '',
                    indent: 0,
                });
            }
            newLines.at(-1).comment = line.comment;
            result.push(...newLines);
        }
    });
    lines.length = 0;
    lines.push(...result);
}

/**
 * 格式化一行文本
 */
function formatLine(line: Line): void {
    // 提前提取出字符串
    let stringIndex = 0;
    const strings = [];
    let text = line.content;
    text = $.replace(text, /".*?"/gm, (v) => {
        strings.push(v);
        return `__string__${stringIndex++}__endstring__`;
    });

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

    // 不在行首的连续空格合并为一个(除了双斜杠前的空格)
    text = $.replace(text, /\S+( +)(\/\/)?/gm, (v, v1, v2) => {
        if (v2 == undefined)
            return v.replace(v1, ` `);
        else
            return v;
    });

    // 字符串还原
    text = $.replace(text, /__string__(\d*)__endstring__/gm, (_, v1) => strings[v1]);

    // 去除行尾空格
    text = $.replace(text, / +$/gm, () => '');

    line.content = text;
}

/**
 * 重新调整后每行缩进
 */
function ResetTabs(lines: Line[], tabSize: number): string {
    let tabLevel = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineText = line.content;
        const isBlockStart = lineText.startsWith('{');
        const isBlockEnd = lineText.startsWith('}');
        const isInlineBlock = lineText.startsWith('{') && lineText.endsWith('}');

        const isPreDefIf = lineText.startsWith('#if');
        const isPreDefElif = lineText.startsWith('#elif');
        const isPreDefElse = lineText.startsWith('#else');
        const isPreDefEndIf = lineText.startsWith('#endif');
        const isPreDefStart = isPreDefIf || isPreDefElif || isPreDefElse;
        const isPreDefEnd = isPreDefElif || isPreDefElse || isPreDefEndIf;

        if (isBlockEnd || isPreDefEnd)
            tabLevel--;
        let curTabLevel = tabLevel;
        if (i > 0 && !isBlockStart) {
            // 紧跟if/else的单语句自动缩进
            if (/^\s*if|else\b/.test(lines[i - 1].content))
                curTabLevel++;
            // 分三行写的三元表达式，后两行自动缩进
            if (/^[\?\:]/.test(line.content))
                curTabLevel++;
        }
        if (tabLevel > 0 && line.content.length + line.comment.length > 0)
            line.indent = curTabLevel * tabSize;
        if (isBlockStart && !isInlineBlock || isPreDefStart)
            tabLevel++;
    }

    let text = "";
    for (const line of lines) {
        text += ' '.repeat(line.indent) + line.content;
        let padding = line.content.length % tabSize;
        if (line.content.length !== 0 && padding === 0)
            padding = tabSize;
        let comment = line.comment.trimEnd();
        if (comment.length > 0)
            text += ' '.repeat(padding) + comment;
        text += '\n';
    }

    // 去除文件末尾的多个换行
    text = $.replace(text, /\n+$/, () => '\n');

    return text;
}

// 格式化工具
const documentFormattingEditProvider = vscode.languages.registerDocumentFormattingEditProvider('shaderlab',
    { provideDocumentFormattingEdits }
);

export { documentFormattingEditProvider };

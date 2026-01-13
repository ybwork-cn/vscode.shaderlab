import $ from './$.js';

type Line = {
    content: string;
    comment: string;
    indent: number;
}

const splitLineAndComment = (text: string): Line => {
    const commentIndex = text.indexOf('//');
    return {
        content: commentIndex === -1 ? text.trim() : text.slice(0, commentIndex).trim(),
        comment: commentIndex === -1 ? '' : text.slice(commentIndex).trim(),
        indent: 0,
    };
}

const replaceByLine = (lines: Line[], regex: RegExp, asyncFn: (v: string, ...others: string[]) => string): void => {
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

const formatLine = (line: Line): void => {
    let stringIndex = 0;
    const strings: string[] = [];
    let text = line.content;
    text = $.replace(text, /".*?"/gm, (v) => {
        strings.push(v);
        return `__string__${stringIndex++}__endstring__`;
    });

    text = $.replace(text, /\t/gm, () => ' ');

    text = $.replace(text, /[\)\w]( *[+\-\*\/]?= *)[\(\w]/gm, (v, v1) => v.replace(v1, ` ${v1.trim()} `));
    text = $.replace(text, /[\&\|]{2}/gm, (v) => ` ${v} `);
    text = $.replace(text, /[\)\w]([\<\>\=\!]=?)[\(\w]/gm, (v, v1) => v.replace(v1, ` ${v1} `));
    text = $.replace(text, /[\)\w]( *[+\-\*\/] *)[\(\w]/gm, (v, v1) => v.replace(v1, ` ${v1} `));
    text = $.replace(text, /:/gm, () => ` : `);
    text = $.replace(text, /\?/gm, () => ` ? `);
    text = $.replace(text, /([+\-\*\/])\-/gm, (v, v1) => v.replace(v1, `${v1} `));
    text = $.replace(text, /\)([+\-\*\/])/gm, (v, v1) => v.replace(v1, ` ${v1}`));
    text = $.replace(text, /if\s*\(/gm, () => `if (`);
    text = $.replace(text, /for\s*\(/gm, () => `for (`);
    text = $.replace(text, /while\s*\(/gm, () => `while (`);
    text = $.replace(text, /switch\s*\(/gm, () => `switch (`);

    text = $.replace(text, / *;/gm, () => '; ');
    text = $.replace(text, / *, */gm, () => ', ');
    text = $.replace(text, /\( */gm, () => '(');
    text = $.replace(text, /\S+( *\))/gm, (v, v1) => v.replace(v1, `)`));
    text = $.replace(text, /\) *{/gm, () => ')\n{');
    text = $.replace(text, /(\};\s*?)\S+/gm, (v, v1) => v.replace(v1, '}\n'));
    text = $.replace(text, /^ +/gm, () => '');
    text = $.replace(text, / +$/gm, () => '');

    text = $.replace(text, /\S+( +)(\/\/)?/gm, (v, v1, v2) => {
        if (v2 == undefined)
            return v.replace(v1, ` `);
        else
            return v;
    });

    text = $.replace(text, /__string__(\d*)__endstring__/gm, (_, v1) => strings[v1]);

    text = $.replace(text, / +$/gm, () => '');

    line.content = text;
}

const ResetTabs = (lines: Line[], tabSize: number): string => {
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
            if (/^\s*if|else\b/.test(lines[i - 1].content))
                curTabLevel++;
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

    text = $.replace(text, /\n+$/, () => '\n');

    return text;
}

const formatCode = (sourceText: string, tabSize: number): string => {
    const text = $.replace(sourceText, /\r\n/g, () => '\n');

    let lines: Line[] = text
        .replaceAll(/\r/g, '')
        .split('\n')
        .map(splitLineAndComment);

    replaceByLine(lines, /(\s*{\s*)/gm, (v, v1) => v.replace(v1, '{'));
    replaceByLine(lines, /(\s*}\s*)/gm, (v, v1) => v.replace(v1, '}'));

    replaceByLine(lines, /(;).+/gm, (v, v1) => v.replace(v1, ';\n'));

    replaceByLine(lines, /({\s*})/gm, (v, v1) => v.replace(v1, '{}'));
    replaceByLine(lines, /.+({)(?!})/gm, (v, v1) => v.replace(v1, '\n{'));
    replaceByLine(lines, /({)(?!}|$)/gm, (v, v1) => v.replace(v1, '{\n'));
    replaceByLine(lines, /(?<!{)(?<=.)(})/gm, (v, v1) => v.replace(v1, '\n}'));
    replaceByLine(lines, /(})(?!;).+/gm, (v, v1) => v.replace(v1, '}\n'));

    for (let index = 0; index < lines.length; index++) {
        formatLine(lines[index]);
    }

    return ResetTabs(lines, tabSize);
}

export {
    formatCode
}

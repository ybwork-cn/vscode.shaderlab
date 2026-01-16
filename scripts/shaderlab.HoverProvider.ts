import * as vscode from 'vscode';
import $ from './$.js';
import { documentStructureUtils } from './shared.DocumentStructure.js';

type FunctionDef = {
    text: string;
    desc?: string;
}

const getTrimedText = (document: vscode.TextDocument, range: vscode.Range): string => {
    let text = document.getText(range);
    text = $.replace(text, /^\r\n/, (v) => '\n');
    const lines = text.split('\n');
    const indent = range.start.character;
    for (let i = 1; i < lines.length; i++) {
        lines[i] = lines[i].slice(indent);
    }
    return lines.join('\n');
};

const provideFunctionHover = (functionName: string): vscode.ProviderResult<vscode.Hover> => {
    const getFunctionDef = (): FunctionDef => {
        switch (functionName) {
            case 'clip': return {
                text: 'void clip(float v)',
                desc: '裁剪函数，当参数小于0时丢弃当前像素'
            };
            case 'floor': return {
                text: 'T floor(T v)',
                desc: '向下取整(多个通道时分别计算)'
            };
            case 'abs': return {
                text: 'T abs(T v)',
                desc: '对参数取绝对值(多个通道时分别计算)'
            };
            case 'min': return {
                text: 'T min(T v1,T v2)',
                desc: '对多个参数取最小值(多个通道时分别计算)'
            };
            case 'ceil': return {
                text: 'T ceil(T v)',
                desc: '向上取整(多个通道时分别计算)'
            };
            case 'round': return {
                text: 'T round(T v)',
                desc: '四舍五入取整(多个通道时分别计算)'
            };
            case 'clamp': return {
                text: 'T clamp(T v,T min,T max)',
                desc: '将参数限制在指定范围内(多个通道时分别计算)'
            };
            case 'saturate': return {
                text: 'T saturate(T v)',
                desc: '将参数限制在0到1之间(多个通道时分别计算)'
            };
            case 'frac': return {
                text: 'T frac(T v)',
                desc: '返回参数的小数部分(多个通道时分别计算)'
            };
            case 'lerp': return {
                text: 'T lerp(T v1,T v2,float t)',
                desc: '在v1和v2之间根据t插值(多个通道时分别计算)'
            };
            case 'smoothstep': return {
                text: 'T smoothstep(T edge1,T edge2,T v)',
                desc: '在edge1和edge2之间对参数进行平滑插值(多个通道时分别计算)'
            };
            case 'sqrt': return {
                text: 'T sqrt(T v)',
                desc: '计算平方根(多个通道时分别计算)'
            };
            case 'sin': return {
                text: 'T sin(T v)',
                desc: '计算正弦值(多个通道时分别计算)'
            };
            case 'cos': return {
                text: 'T cos(T v)',
                desc: '计算余弦值(多个通道时分别计算)'
            };
            case 'tan': return {
                text: 'T tan(T v)',
                desc: '计算正切值(多个通道时分别计算)'
            };
            case 'length': return {
                text: 'float length(T v)',
                desc: '计算向量的长度(只适用于多通道变量)'
            };
            case 'step': return {
                text: 'T step(T edge,T v)',
                desc: '大于等于edge时返回1.0，否则返回0.0(多个通道时分别计算)'
            };
            case 'max': return {
                text: 'T max(T v1,T v2)',
                desc: '对多个参数取最大值(多个通道时分别计算)'
            };
            case 'normalize': return {
                text: 'T normalize(T v)',
                desc: '对参数进行归一化(只适用于多通道变量)'
            };
            case 'pow': return {
                text: 'float pow(float v,float exp)',
                desc: '计算指数函数值'
            };
            case 'dot': return {
                text: 'float dot(T v1,T v2)',
                desc: '进行点积运算'
            };
            case 'mul': return {
                text: 'float4 dot(float4x4 matrix, float4 pos)',
                desc: '矩阵与向量乘法'
            };
            case 'tex2D': return {
                text: 'float4 tex2D(sampler2D tex, float2 uv)',
                desc: '贴图采样'
            };
            case 'UnityObjectToClipPos': return {
                text: 'float4 UnityObjectToClipPos(float4 pos)',
                desc: '对 `位置` 进行坐标系转换：对象空间=>裁剪空间'
            };
            case 'UnityObjectToWorldNormal': return {
                text: 'float3 UnityObjectToWorldNormal(float3 normal)',
                desc: '对 `法线` 进行坐标系转换：对象空间=>世界空间'
            };
            case 'UnityWorldSpaceLightDir': return {
                text: 'float3 UnityWorldSpaceLightDir(float3 pos)',
                desc: '计算世界空间中从该点到主光源光照的方向'
            };
            case 'UnityWorldSpaceViewDir': return {
                text: 'float3 UnityWorldSpaceViewDir(float3 pos)',
                desc: '计算世界空间中从该点到主相机的方向'
            };
            case 'TRANSFORM_TEX': return {
                text: 'float2 TRANSFORM_TEX(float2 uv, sampler2D tex)',
                desc: '对UV坐标进行缩放和平移'
            };
            default: return null;
        }
    };
    const functionDef = getFunctionDef();
    if (functionDef) {
        const hoverMessage = new vscode.MarkdownString();
        hoverMessage.isTrusted = false; // 默认值，明确写出以示清晰
        hoverMessage.supportHtml = false; // 确保不支持HTML，以防止安全问题

        // 使用 fenced code block 并指定语言标识符来触发语法高亮
        hoverMessage.appendCodeblock(functionDef.text, 'shaderlab');
        if (functionDef.desc)
            hoverMessage.appendMarkdown(functionDef.desc);
        // 创建一个 MarkdownString 来格式化悬停内容
        return new vscode.Hover(hoverMessage);
    }
};

class HoverProvider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        //调用VSCode API获取当前光标下单词的原始定义
        return vscode.commands
            .executeCommand<vscode.DefinitionLink[]>('vscode.executeDefinitionProvider', document.uri, position)
            .then<vscode.Hover>(definitions => {
                for (const def of definitions) {
                    if (token.isCancellationRequested)
                        return null;

                    const hoverMessage = new vscode.MarkdownString();
                    hoverMessage.isTrusted = false; // 默认值，明确写出以示清晰
                    hoverMessage.supportHtml = false; // 确保不支持HTML，以防止安全问题

                    // 仅处理当前文档内的定义
                    if (def.targetUri.toString() !== document.uri.toString())
                        continue;

                    return documentStructureUtils
                        .getDocumentSymbols(document)
                        .then<vscode.Hover>(symbols => {
                            for (const symbol of symbols) {
                                const symbolStack = documentStructureUtils.getSymbolStack(symbol, def.targetSelectionRange.start);
                                if (symbolStack.length === 0)
                                    continue;
                                const target = symbolStack.at(-1);
                                if (target.kind === vscode.SymbolKind.Method) {
                                    // 函数显示完整函数头
                                    let defineText = getTrimedText(document, target.range);
                                    defineText = defineText.split('{')[0];
                                    // 使用 fenced code block 并指定语言标识符来触发语法高亮
                                    hoverMessage.appendCodeblock(defineText, 'shaderlab');
                                    return new vscode.Hover(hoverMessage);
                                }
                                else if (target.kind === vscode.SymbolKind.Variable) {
                                    // 变量定义后面加分号
                                    const defineText = getTrimedText(document, def.targetRange) + ';';
                                    // 使用 fenced code block 并指定语言标识符来触发语法高亮
                                    hoverMessage.appendCodeblock(defineText, 'shaderlab');
                                    return new vscode.Hover(hoverMessage);
                                }
                                else {
                                    const defineText = getTrimedText(document, def.targetRange);
                                    // 使用 fenced code block 并指定语言标识符来触发语法高亮
                                    hoverMessage.appendCodeblock(defineText, 'shaderlab');
                                    return new vscode.Hover(hoverMessage);
                                }
                            }
                        });
                }

                // 如果没有找到定义，则尝试提供内置函数的悬停信息
                const wordRange = document.getWordRangeAtPosition(position);
                const functionName = document.getText(wordRange);
                return provideFunctionHover(functionName);
            });
    }
}

const hoverProvider = vscode.languages.registerHoverProvider('shaderlab', new HoverProvider());

export { hoverProvider };

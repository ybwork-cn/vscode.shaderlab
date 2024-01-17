import * as vscode from 'vscode';

export function provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
    const range = document.getWordRangeAtPosition(position);
    const functionName = document.getText(range);
    type FunctionDef = {
        text: string;
        desc?: string;
    }
    const getFunctionDef = (): FunctionDef => {
        switch (functionName) {
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
            default: return null;
        }
    }
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
    return null;
}

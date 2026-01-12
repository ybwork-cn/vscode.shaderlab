# Beautify ShaderLab
[git仓库](https://github.com/ybwork-cn/vscode.shaderlab.git)

本插件为ShaderLab语言插件
有bug或者改进建议，请联系 qq 2979351193

## 支持的功能

### ShaderLab (.shader)
- 高亮显示（函数、参数、结构体、关键字）
- 格式化文档
- 查找文档结构
- 跳转到定义、速览定义（支持跨文档查看定义）
- 鼠标悬浮查看内置函数定义（未覆盖所有函数）
- 悬浮查看定义（参数、变量、结构体、函数）

### HLSL (.hlsl, .hlsli, .cginc)
- 语法高亮
- 代码格式化
- 文档结构（struct、cbuffer、函数、宏定义、全局变量等）
- `#include` 文件跳转（支持 Unity Package 路径）
- 跨文件定义跳转
- 工作区符号搜索 (Ctrl+T)

## 配置项

在 VS Code 设置中可以配置以下选项：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `ybwork-shaderlab.cgIncludesPath` | Unity 内置 Shader 的 CGIncludes 路径 | `C:/Program Files/Unity/Hub/Editor/2022.3.0f1/Editor/Data/CGIncludes` |
| `ybwork-shaderlab.unityProjectPath` | Unity 项目根目录路径 | `D:/UnityProjects/MyGame` |
| `ybwork-shaderlab.packageMappings` | Unity Package 路径映射 | 见下方示例 |

### Unity Package 路径配置

对于 `#include "Packages/com.unity.render-pipelines.core/..."` 这样的 include 语句，插件会自动在以下位置查找：

1. **自动检测**：如果工作区包含 Unity 项目（有 Assets 文件夹），会自动扫描 `Library/PackageCache` 和 `Packages` 目录
2. **手动配置项目路径**：设置 `ybwork-shaderlab.unityProjectPath` 指向 Unity 项目根目录
3. **手动映射**：使用 `ybwork-shaderlab.packageMappings` 手动指定包路径

#### packageMappings 配置示例

```json
{
    "ybwork-shaderlab.packageMappings": {
        "com.unity.render-pipelines.core": "D:/UnityProjects/MyProject/Library/PackageCache/com.unity.render-pipelines.core@14.0.8",
        "com.unity.render-pipelines.universal": "D:/UnityProjects/MyProject/Library/PackageCache/com.unity.render-pipelines.universal@14.0.8"
    }
}
```

## 未来将提供的支持的功能
- 成员定义跳转（ctrl+点击结构体变量的成员，跳转到结构体成员定义处）
- 成员定义提示（鼠标悬浮查看结构体变量的成员，显示结构体成员定义）
- 提供更多内置函数的提示
- 查找所有引用
- 语法提示（在一个结构体对象后面按`.`时，显示可选的成员）
- 重命名符号（一键重命名某个结构体、结构体字段、函数参数、函数名等）

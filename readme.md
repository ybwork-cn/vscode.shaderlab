# Beautify ShaderLab

[![GitHub issues](https://img.shields.io/github/issues/ybwork-cn/vscode.shaderlab.svg)](https://github.com/ybwork-cn/vscode.shaderlab/issues)
[![GitHub license button](https://img.shields.io/github/license/ybwork-cn/vscode.shaderlab.svg)](https://github.com/ybwork-cn/vscode.shaderlab/blob/master/LICENSE)

本插件为ShaderLab语言插件
有bug或者改进建议，请于 github 提交 issue，或者加qq群反馈：1082051333，谢谢！

## 支持的功能

### ShaderLab (.shader)
- [x] 高亮显示（函数、参数、结构体、关键字）
- [x] 格式化文档
- [x] 文档结构（函数、结构体、全局变量）
- [ ] 文档结构（cbuffer、tbuffer）
- [x] 跳转到定义、速览定义（支持跨文档查看定义）
- [x] 鼠标悬浮查看内置函数定义（未覆盖所有函数）
- [x] 悬浮查看定义（参数、变量、结构体、函数）
- [x] `#include` 文件跳转（支持 Unity Package 路径）
- [ ] 工作区符号搜索 (Ctrl+T)
- [ ] 成员定义跳转（ctrl+点击结构体变量的成员，跳转到结构体成员定义处）
- [ ] 成员定义提示（鼠标悬浮查看结构体变量的成员，显示结构体成员定义）
- [ ] 查找所有引用
- [ ] 语法提示（在一个结构体对象后面按`.`时，显示可选的成员）
- [ ] 重命名符号（一键重命名某个结构体、结构体字段、函数参数、函数名等）

### HLSL (.hlsl, .hlsli, .cginc)
- [ ] 语法高亮（函数、参数、结构体、关键字）
- [x] 代码格式化
- [x] 文档结构（函数、结构体、全局变量）
- [ ] 文档结构（cbuffer、tbuffer）
- [ ] 跨文件定义跳转
- [ ] 鼠标悬浮查看内置函数定义（未覆盖所有函数）
- [ ] 悬浮查看定义（参数、变量、结构体、函数）
- [x] `#include` 文件跳转（支持 Unity Package 路径）
- [ ] 工作区符号搜索 (Ctrl+T)
- [ ] 成员定义跳转（ctrl+点击结构体变量的成员，跳转到结构体成员定义处）
- [ ] 成员定义提示（鼠标悬浮查看结构体变量的成员，显示结构体成员定义）
- [ ] 查找所有引用
- [ ] 语法提示（在一个结构体对象后面按`.`时，显示可选的成员）
- [ ] 重命名符号（一键重命名某个结构体、结构体字段、函数参数、函数名等）

### Compute Shader (.compute)
- [ ] 语法高亮（函数、参数、结构体、关键字）
- [ ] 代码格式化
- [x] 文档结构（函数、结构体、全局变量）
- [ ] 文档结构（cbuffer、tbuffer）
- [ ] 跨文件定义跳转
- [ ] 鼠标悬浮查看内置函数定义（未覆盖所有函数）
- [ ] 悬浮查看定义（参数、变量、结构体、函数）
- [ ] `#include` 文件跳转（支持 Unity Package 路径）
- [ ] 工作区符号搜索 (Ctrl+T)
- [ ] 成员定义跳转（ctrl+点击结构体变量的成员，跳转到结构体成员定义处）
- [ ] 成员定义提示（鼠标悬浮查看结构体变量的成员，显示结构体成员定义）
- [ ] 查找所有引用
- [ ] 语法提示（在一个结构体对象后面按`.`时，显示可选的成员）
- [ ] 重命名符号（一键重命名某个结构体、结构体字段、函数参数、函数名等）

### include 路径支持说明
对于 `#include "Packages/com.unity.render-pipelines.core/..."` 这样的 include 语句，插件会自动在以下位置查找：
- 1. 当前文件夹内的 `Packages/com.unity.render-pipelines.core` 目录
- 2. 工作区根目录的 `Packages/com.unity.render-pipelines.core` 目录
- 3. 工作区根目录的 `Library/PackageCache/com.unity.render-pipelines.core@14.0.8` 目录

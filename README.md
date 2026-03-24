# node-red-contrib-xiaomi-mimo-tts

小米 MiMo-V2-TTS 语音合成 Node-RED 节点，支持非流式调用，将文本转换为自然流畅的语音。

## 安装

```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-xiaomi-mimo-tts
```

安装后重启 Node-RED，在节点面板的 `TTS` 分类下找到 **MiMo TTS**。

## 架构

- **MiMo TTS Server**（配置节点）：集中管理 API Key、Base URL、模型。多个 MiMo TTS 节点可共享同一个 Server 配置，避免重复输入。
- **MiMo TTS**（功能节点）：负责语音合成，只需配置音色、格式、风格等运行参数。
- **API Key** 登录[小米MiMo平台](https://platform.xiaomimimo.com/#/console/api-keys)获取

## 节点配置

### Server 配置节点

| 参数 | 说明 | 默认值 |
|------|------|--------|
| **名称** | 配置节点名称 | — |
| **API Key** | MiMo 平台 API Key（加密存储） | — |
| **Base URL** | API 地址 | `https://api.xiaomimimo.com/v1` |
| **模型** | TTS 模型 | `mimo-v2-tts` |

### TTS 功能节点

| 参数 | 说明 | 默认值 |
|------|------|--------|
| **Server** | 关联的 Server 配置节点 | — |
| **音色** | 预置音色选择 | `mimo_default` |
| **输出格式** | wav / mp3 / pcm | `wav` |
| **发音风格** | 如"开心"、"东北话"、"唱歌" | 空（默认） |
| **输出目录** | 音频保存路径 | `/tmp/mimo-tts` |
| **文件名模式** | 前缀+随机 / 固定文件名 | 前缀+随机 |
| **文件名前缀** | 随机模式下的前缀 | `mimo_tts_` |
| **固定文件名** | 固定模式下的文件名 | `output.wav` |
| **音频标签细粒度控制文本** | 细粒度控制，精准调节语气、情绪和表达风格，例如："如果我当时……（沉默片刻）哪怕再坚持一秒钟，结果是不是就不一样了？（苦笑）呵，没如果了。" |

## 使用方式

### 基本用法

将 `msg.payload` 设为待合成文本，注入节点即可。

```
[inject: "你好，今天天气真好！"] → [MiMo TTS] → [file / play]
```

### 固定文件名

将文件名模式设为"固定文件名"，输入如 `latest.wav`。每次合成会覆盖同名文件，方便后续节点直接引用固定路径。

### 动态覆盖参数

通过 msg 字段可以动态覆盖节点配置：

```javascript
msg.payload = "明天就是周五了，真开心！";
msg.voice = "default_zh";            // 覆盖音色
msg.style = "开心";                    // 覆盖风格
msg.format = "mp3";                   // 覆盖格式
msg.outputDir = "/home/user/audio";   // 覆盖输出目录
msg.userContent = "请用温柔的语气说";  // 高级：注入 user 消息
msg.apiKey = "sk-override";           // 覆盖 API Key
msg.baseUrl = "https://other.api/v1"; // 覆盖 Base URL
```

### 支持的音色

- `mimo_default` — MiMo 默认音色
- `default_zh` — 中文女声
- `default_en` — 英文女声

### 支持的风格

- 语速：`变快` / `变慢`
- 情绪：`开心` / `悲伤` / `生气`
- 角色扮演：`孙悟空` / `林黛玉`
- 风格变化：`悄悄话` / `夹子音` / `台湾腔`
- 方言：`东北话` / `四川话` / `河南话` / `粤语`
- 特殊：`唱歌`

### 输出

| 字段 | 说明 |
|------|------|
| `msg.payload` | 音频 Buffer（二进制） |
| `msg.filename` | 保存的完整文件路径 |
| `msg.format` | 输出格式 |
| `msg.size` | 文件大小（字节） |
| `msg.duration` | 估算音频时长（毫秒） |
| `msg.mimoResponse` | API 原始响应（含 usage） |

## 流程示例（导入用）

```json
[
    {
        "id": "549c499be3632d6e",
        "type": "debug",
        "z": "172c1a90e37520c8",
        "name": "debug 26",
        "active": true,
        "tosidebar": true,
        "console": false,
        "tostatus": false,
        "complete": "true",
        "targetType": "full",
        "statusVal": "",
        "statusType": "auto",
        "x": 800,
        "y": 260,
        "wires": []
    },
    {
        "id": "8fa8dfb280d0715c",
        "type": "inject",
        "z": "172c1a90e37520c8",
        "name": "文本",
        "props": [
            {
                "p": "payload"
            }
        ],
        "repeat": "",
        "crontab": "",
        "once": false,
        "onceDelay": 0.1,
        "topic": "",
        "payload": "嗨，你好，我是小爱同学！",
        "payloadType": "str",
        "x": 350,
        "y": 260,
        "wires": [
            [
                "babc1591d0691977"
            ]
        ]
    },
    {
        "id": "babc1591d0691977",
        "type": "mimo-tts",
        "z": "172c1a90e37520c8",
        "name": "小爱同学",
        "server": "aeb3149ae70f53fe",
        "voice": "mimo_default",
        "format": "wav",
        "style": "俏皮的",
        "outputDir": "/tmp/mimo-tts",
        "filenameMode": "fixed",
        "filenamePrefix": "mimo_tts_",
        "fixedFilename": "output.wav",
        "detailText": "",
        "x": 580,
        "y": 260,
        "wires": [
            [
                "549c499be3632d6e"
            ]
        ]
    },
    {
        "id": "aeb3149ae70f53fe",
        "type": "mimo-tts-server",
        "name": "",
        "baseUrl": "https://api.xiaomimimo.com/v1",
        "model": "mimo-v2-tts"
    }
]
```

## 许可

MIT

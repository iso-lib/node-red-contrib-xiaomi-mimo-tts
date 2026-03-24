'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = function (RED) {

  // ──────────────────────────────────────────────
  //  TTS 功能节点
  // ──────────────────────────────────────────────
  function MiMoTTSNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // 读取 server 配置节点
    const serverConfig = RED.nodes.getNode(config.server) || {};

    node.on('input', async function (msg, send, done) {
      try {
        // === API 基础参数（优先级：msg > server 配置） ===
        const apiKey = msg.apiKey || (serverConfig.credentials && serverConfig.credentials.apiKey);
        if (!apiKey) {
          throw new Error('缺少 API Key，请在 Server 配置节点或 msg.apiKey 中设置');
        }

        const baseUrl = msg.baseUrl || serverConfig.baseUrl || 'https://api.xiaomimimo.com/v1';
        const model = msg.model || serverConfig.model || 'mimo-v2-tts';

        // === TTS 参数 ===
        const voice = msg.voice || config.voice || 'mimo_default';
        const format = msg.format || config.format || 'wav';
        const outputDir = msg.outputDir || config.outputDir || '/tmp/mimo-tts';
        const filenameMode = config.filenameMode || 'random';
        const filenamePrefix = config.filenamePrefix || 'mimo_tts_';
        const fixedFilename = config.fixedFilename || 'output.wav';

        // userContent 仅通过 msg 提供（高级用法）
        const userContent = msg.userContent || '';

        // 文本内容（detailText 优先级高于 msg.payload）
        let text = (config.detailText && config.detailText.trim() !== '') ? config.detailText : msg.payload;
        if (!text || typeof text !== 'string' || text.trim() === '') {
          throw new Error('msg.payload 必须是非空字符串（待合成文本）');
        }

        // 风格控制：msg.style 优先，其次节点配置
        const style = msg.style !== undefined ? msg.style : (config.style || '');
        if (style && style.trim() !== '') {
          if (!text.trim().startsWith('<style>')) {
            text = `<style>${style.trim()}</style>${text}`;
          }
        }

        node.status({ fill: 'blue', shape: 'dot', text: '合成中...' });

        // === 构造请求体 ===
        const messages = [];

        if (userContent && userContent.trim() !== '') {
          messages.push({
            role: 'user',
            content: userContent.trim(),
          });
        }

        messages.push({
          role: 'assistant',
          content: text,
        });

        const requestBody = {
          model: model,
          messages: messages,
          audio: {
            format: format,
            voice: voice,
          },
          stream: false,
        };

        // === 发送请求 ===
        const response = await axios.post(
          `${baseUrl}/chat/completions`,
          requestBody,
          {
            headers: {
              'api-key': apiKey,
              'Content-Type': 'application/json',
            },
            timeout: 60000,
            responseType: 'json',
          }
        );

        // === 解析响应 ===
        const data = response.data;
        if (!data || !data.choices || !data.choices[0]) {
          throw new Error('API 返回数据格式异常：' + JSON.stringify(data).substring(0, 500));
        }

        const message = data.choices[0].message;
        if (!message || !message.audio || !message.audio.data) {
          throw new Error('API 返回中没有音频数据');
        }

        // Base64 解码为 Buffer
        const audioBuffer = Buffer.from(message.audio.data, 'base64');

        // === 保存文件 ===
        let filename;
        if (filenameMode === 'fixed') {
          // 固定文件名：直接使用配置值
          filename = fixedFilename;
        } else {
          // 前缀 + 时间戳 + 随机后缀
          const ts = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          filename = `${filenamePrefix}${ts}_${randomSuffix}.${format}`;
        }

        // 确保固定文件名带后缀
        if (filenameMode === 'fixed' && !filename.match(/\.\w+$/)) {
          filename += '.' + format;
        }

        const fullPath = path.join(outputDir, filename);
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(fullPath, audioBuffer);

        // === 输出消息 ===
        msg.payload = audioBuffer;
        msg.filename = fullPath;
        msg.format = format;
        msg.size = audioBuffer.length;

        // WAV 格式采样率 24kHz，估算时长
        if (format === 'wav') {
          msg.duration = Math.round((audioBuffer.length - 44) / (24000 * 2) * 1000);
        } else if (format === 'pcm') {
          msg.duration = Math.round(audioBuffer.length / (24000 * 2) * 1000);
        }

        msg.mimoResponse = {
          id: data.id,
          model: data.model,
          usage: data.usage,
        };

        node.status({
          fill: 'green',
          shape: 'dot',
          text: `完成 · ${Math.round(audioBuffer.length / 1024)}KB → ${filename}`,
        });

        send(msg);
        if (done) done();

      } catch (err) {
        const errorMsg = err.response
          ? `API 错误 ${err.response.status}: ${JSON.stringify(err.response.data).substring(0, 300)}`
          : err.message;

        node.status({ fill: 'red', shape: 'ring', text: errorMsg.substring(0, 60) });
        node.error(`MiMo TTS 失败: ${errorMsg}`, msg);
        if (done) done(err);
      }
    });

    node.on('close', function () {
      node.status({});
    });
  }

  RED.nodes.registerType('mimo-tts', MiMoTTSNode);
};

'use strict';

module.exports = function (RED) {
  function MiMoTTSServerNode(config) {
    RED.nodes.createNode(this, config);
    this.baseUrl = config.baseUrl || 'https://api.xiaomimimo.com/v1';
    this.model = config.model || 'mimo-v2-tts';
    this.name = config.name;
  }
  RED.nodes.registerType('mimo-tts-server', MiMoTTSServerNode, {
    credentials: {
      apiKey: { type: 'password' },
    },
  });
};

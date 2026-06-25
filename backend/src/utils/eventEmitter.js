import { EventEmitter } from 'events';

// Singleton emitter — nodes.js emits events, SSE route forwards them to clients
const agentEmitter = new EventEmitter();

agentEmitter.setMaxListeners(50);

export default agentEmitter;

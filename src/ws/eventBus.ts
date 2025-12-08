// src/ws/eventBus.ts
import { EventEmitter } from "events";

const eventBus = new EventEmitter();

// Increase max listeners in case many bots
eventBus.setMaxListeners(200);

export default eventBus;

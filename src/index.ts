import { maestroServer } from "./maestro/server";
import { diepServer } from "./diep/server";

console.log("Maestro server listening on tcp://0.0.0.0:" + maestroServer.port);
console.log("Diep WebSocket server listening on ws://0.0.0.0:" + diepServer.port);

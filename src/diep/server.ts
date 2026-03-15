import { handleUdpMessage, handleWebSocketMessage } from "./handlers";
import { createSocket } from "dgram";
import { diepLogger } from "../shared/logger";

export const diepServer = Bun.serve({
    hostname: "0.0.0.0",
    port: 8081,
    fetch(req, server) {
        const upgraded = server.upgrade(req);
        if (upgraded) return undefined;
        return new Response("Expected WebSocket", { status: 426 });
    },
    websocket: {
        open(ws) {
            diepLogger.info({ remoteAddress: ws.remoteAddress }, "WebSocket opened");
        },
        message(ws, message) {
            handleWebSocketMessage(message, ws);
        },
        close(ws, code, reason) {
            diepLogger.info({ remoteAddress: ws.remoteAddress, code, reason }, "WebSocket closed");
        },
    },
});

diepLogger.info("TCP channel listening on ws://0.0.0.0:" + diepServer.port);

export const udpServer = createSocket("udp4");

udpServer.on("message", (msg, rinfo) => {
    handleUdpMessage(msg, rinfo, udpServer);
});

udpServer.on("error", (err) => {
    diepLogger.error({ error: err }, "UDP server error");
    udpServer.close();
});

udpServer.on("listening", () => {
    const addr = udpServer.address();
    diepLogger.info(`UDP channel listening on udp://${addr.address}:${addr.port}`);
});

udpServer.bind(8082, "0.0.0.0");

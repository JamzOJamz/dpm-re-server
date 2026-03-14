import { handleUdpMessage, handleWebSocketMessage } from "./handlers";
import { createSocket } from "dgram";

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
            console.log("WebSocket opened:", ws.remoteAddress);
        },
        message(ws, message) {
            handleWebSocketMessage(message, ws);
        },
        close(ws, code, reason) {
            console.log(`WebSocket closed: ${ws.remoteAddress} [${code}] ${reason}`);
        },
    },
});

export const udpServer = createSocket("udp4");

udpServer.on("message", (msg, rinfo) => {
    handleUdpMessage(msg, rinfo, udpServer);
});

udpServer.on("error", (err) => {
    console.error("UDP server error:", err);
    udpServer.close();
});

udpServer.on("listening", () => {
    const addr = udpServer.address();
    console.log(`UDP upgrade server listening on udp://${addr.address}:${addr.port}`);
});

udpServer.bind(8082, "0.0.0.0");

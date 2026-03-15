import type { Socket } from "dgram";
import { Envelope } from "./proto";
import { diepLogger } from "../shared/logger";

export async function handleWebSocketMessage(message: string | Buffer<ArrayBuffer>, ws: Bun.ServerWebSocket) {
    if (typeof message !== "object") {
        diepLogger.warn("Received non-binary message, ignoring");
        return;
    }

    try {
        const decoded = Envelope.decode(message);
        // console.log("Decoded message:", JSON.stringify(decoded, null, 2));

        const msg = decoded.toJSON();

        let data: any = null;
        switch (msg.contentType) {
            case "UNCOMPRESSED":
                data = msg.uncompressedData;
                break;
            case "COMPRESSED":
            default:
                throw new Error("Unknown or unhandled content type: " + msg.contentType);
        }

        switch (data.type) {
            case "PING":
                handlePingOverTcp(ws);
                break;
            case "CONNECT_REQUEST":
                handleConnectRequest(ws);
                break;
            default:
                diepLogger.warn("Unknown or unhandled message type: " + data.type);
                break;
        }
    } catch (err) {
        diepLogger.error("Failed to handle WebSocket message: " + (err as Error).message);
    }
}

export async function handleUdpMessage(msg: Buffer, rinfo: { address: string; port: number }, udpServer: Socket) {
    try {
        const decoded = Envelope.decode(msg);
        diepLogger.debug("Decoded UDP message: " + JSON.stringify(decoded, null, 2));

        const msgJson = decoded.toJSON();

        let data: any = null;
        switch (msgJson.contentType) {
            case "UNCOMPRESSED":
                data = msgJson.uncompressedData;
                break;
            case "COMPRESSED":
            default:
                throw new Error("Unknown or unhandled content type: " + msgJson.contentType);
        }

        switch (data.type) {
            case "UDP_HANDSHAKE_REQUEST":
                handleUdpHandshakeRequest(rinfo, udpServer);
                break;
            case "PING":
                handlePingOverUdp(rinfo, udpServer);
                break;
            default:
                diepLogger.warn("Unknown or unhandled UDP message type: " + data.type);
                break;
        }
    } catch (err) {
        diepLogger.error("Failed to handle UDP message: " + err);
    }
}

function handlePingOverTcp(ws: Bun.ServerWebSocket) {
    diepLogger.debug("Received message of type PING, sending PONG");

    const payload = {
        contentType: 1,
        uncompressedData: {
            type: 2, // PONG
        },
    };

    const err = Envelope.verify(payload);
    if (err) {
        throw new Error(`Invalid PONG payload: ${err}`);
    }

    const message = Envelope.create(payload);
    const buffer = Envelope.encode(message).finish();
    ws.send(buffer);
}

function handleConnectRequest(ws: Bun.ServerWebSocket) {
    diepLogger.debug({ udpPort: 8082 }, "Received message of type CONNECT_REQUEST, sending CONNECT_RESPONSE with UDP port info");

    const payload = {
        contentType: 1,
        uncompressedData: {
            type: 12, // CONNECT_RESPONSE
            connectResponseMessageField: {
                udpPort: 8082,
            },
        },
    };

    const err = Envelope.verify(payload);
    if (err) {
        throw new Error(`Invalid connect_response payload: ${err}`);
    }

    const message = Envelope.create(payload);
    const buffer = Envelope.encode(message).finish();
    ws.send(buffer);
}

function handleUdpHandshakeRequest(rinfo: { address: string; port: number }, udpServer: Socket) {
    diepLogger.debug({ address: rinfo.address, port: rinfo.port }, "Received message of type UDP_HANDSHAKE_REQUEST, sending UDP_HANDSHAKE_RESPONSE");

    const payload = {
        contentType: 1,
        uncompressedData: {
            type: 14, // UDP_HANDSHAKE_RESPONSE
            udpHandshakeDataField: {
                token: "abc123", // TODO: Generate a token?
            },
        },
    };

    const err = Envelope.verify(payload);
    if (err) {
        throw new Error(`Invalid UDP_HANDSHAKE_RESPONSE payload: ${err}`);
    }

    const message = Envelope.create(payload);
    const buffer = Envelope.encode(message).finish();

    udpServer.send(buffer, rinfo.port, rinfo.address, (err: any) => {
        if (err) {
            diepLogger.error("Failed to send UDP_HANDSHAKE_RESPONSE: " + err);
        } else {
            diepLogger.info(`UDP_HANDSHAKE_RESPONSE sent to ${rinfo.address}:${rinfo.port}`);
        }
    });
}

function handlePingOverUdp(rinfo: { address: string; port: number }, udpServer: Socket) {
    diepLogger.info(`Received message of type PING from ${rinfo.address}:${rinfo.port}, sending PONG`);
    const payload = {
        contentType: 1,
        uncompressedData: {
            type: 2, // PONG
        },
    };

    const err = Envelope.verify(payload);
    if (err) {
        throw new Error(`Invalid PONG payload: ${err}`);
    }

    const message = Envelope.create(payload);
    const buffer = Envelope.encode(message).finish();
    udpServer.send(buffer, rinfo.port, rinfo.address, (err: any) => {
        if (err) {
            diepLogger.error("Failed to send PONG: " + err);
        } else {
            diepLogger.info(`PONG sent to ${rinfo.address}:${rinfo.port}`);
        }
    });
}

import type { Socket } from "dgram";
import { Envelope } from "./proto";

export async function handleWebSocketMessage(message: string | Buffer<ArrayBuffer>, ws: Bun.ServerWebSocket) {
    if (typeof message !== "object") {
        console.warn("Received non-binary message, ignoring");
        return;
    }

    try {
        const decoded = Envelope.decode(message);
        // console.log("Decoded message:", JSON.stringify(decoded, null, 2));

        const msg = decoded.toJSON();

        let data: any = null;
        switch (msg.contentType) {
            case "uncompressed":
                data = msg.uncompressedData;
                break;
            case "compressed":
            default:
                throw new Error("Unknown or unhandled content type: " + msg.contentType);
        }

        switch (data.type) {
            case "ping":
                handlePingOverTcp(ws);
                break;
            case "connect_request":
                handleConnectRequest(ws);
                break;
            default:
                console.warn("Unknown or unhandled message type:", data.type);
                break;
        }
    } catch (err) {
        console.error("Failed to handle WebSocket message:", err);
    }
}

export async function handleUdpMessage(msg: Buffer, rinfo: { address: string; port: number }, udpServer: Socket) {
    try {
        const decoded = Envelope.decode(msg);
        console.log("Decoded UDP message:", JSON.stringify(decoded, null, 2));

        const msgJson = decoded.toJSON();

        let data: any = null;
        switch (msgJson.contentType) {
            case "uncompressed":
                data = msgJson.uncompressedData;
                break;
            case "compressed":
            default:
                throw new Error("Unknown or unhandled content type: " + msgJson.contentType);
        }

        switch (data.type) {
            case "upd_handshake_request":
                handleUdpHandshakeRequest(rinfo, udpServer);
                break;
            case "ping":
                handlePingOverUdp(rinfo, udpServer);
                break;
            default:
                console.warn("Unknown or unhandled UDP message type:", data.type);
                break;
        }
    } catch (err) {
        console.error("Failed to handle UDP message:", err);
    }
}

function handlePingOverTcp(ws: Bun.ServerWebSocket) {
    console.log("Received ping, sending pong");

    const payload = {
        contentType: 1,
        uncompressedData: {
            type: 2, // pong
        },
    };

    const err = Envelope.verify(payload);
    if (err) {
        throw new Error(`Invalid pong payload: ${err}`);
    }

    const message = Envelope.create(payload);
    const buffer = Envelope.encode(message).finish();
    ws.send(buffer);
}

function handleConnectRequest(ws: Bun.ServerWebSocket) {
    console.log("Received connect_request, sending connect_response");

    const payload = {
        contentType: 1,
        uncompressedData: {
            type: 12,
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
    console.log(`Received UDP handshake request from ${rinfo.address}:${rinfo.port}, sending handshake response`);

    const payload = {
        contentType: 1,
        uncompressedData: {
            type: 14, // upd_handshake_response
            /*udpHandshakeDataField: {
        token: "abc123", // TODO: Generate a token?
      },*/
        },
    };

    const err = Envelope.verify(payload);
    if (err) {
        throw new Error(`Invalid UDP handshake response payload: ${err}`);
    }

    const message = Envelope.create(payload);
    const buffer = Envelope.encode(message).finish();

    udpServer.send(buffer, rinfo.port, rinfo.address, (err: any) => {
        if (err) {
            console.error("Failed to send UDP handshake response:", err);
        } else {
            console.log(`UDP handshake response sent to ${rinfo.address}:${rinfo.port}`);
        }
    });
}

function handlePingOverUdp(rinfo: { address: string; port: number }, udpServer: Socket) {
    console.log(`Received UDP ping from ${rinfo.address}:${rinfo.port}, sending pong`);
    const payload = {
        contentType: 1,
        uncompressedData: {
            type: 2, // pong
        },
    };

    const err = Envelope.verify(payload);
    if (err) {
        throw new Error(`Invalid UDP pong payload: ${err}`);
    }

    const message = Envelope.create(payload);
    const buffer = Envelope.encode(message).finish();
    udpServer.send(buffer, rinfo.port, rinfo.address, (err: any) => {
        if (err) {
            console.error("Failed to send UDP pong response:", err);
        } else {
            console.log(`UDP pong response sent to ${rinfo.address}:${rinfo.port}`);
        }
    });
}

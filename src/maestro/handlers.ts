import { Envelope } from "./proto";
import { generateSessionToken } from "./utils/session-token";
import { maestroLogger } from "../shared/logger";

export async function handlePacket(packet: Buffer, socket: any) {
    // console.log(`[Packet] ${packet.length} bytes`);
    // console.log(`[Hex]    ${packet.toString("hex")}`);

    try {
        const decoded = Envelope.decode(packet);
        // console.log("Decoded message:", JSON.stringify(decoded, null, 2));

        const msg = decoded.toJSON();

        let data: any = null;
        switch (msg.contentType) {
            case "UNCOMPRESSED":
                data = msg.uncompressedData;
                break;
        }

        if (data.createSessionRequestField) {
            handleCreateSessionRequest(data.createSessionRequestField, socket);
        } else if (data[".diepio.proto.enterGameRequestField"]) {
            handleEnterGameRequest(socket);
        } else {
            maestroLogger.warn("Unknown message type: " + JSON.stringify(Object.keys(data)));
        }
    } catch (err) {
        maestroLogger.error("Failed to handle packet: " + err);
    }
}

function handleCreateSessionRequest(request: any, socket: any) {
    maestroLogger.debug("Received CreateSessionRequest");

    if (request.clientVersion != "3.0.0") {
        maestroLogger.warn({ clientVersion: request.clientVersion }, "Unsupported client version"); // TODO: Handle this properly (send error response)
    }

    if (request.platform != "ANDROID") {
        maestroLogger.warn({ platform: request.platform }, "Unsupported platform"); // TODO: Handle this properly (send error response)
    }

    var sessionToken = request.sessionToken;
    if (!sessionToken) {
        sessionToken = generateSessionToken();
        maestroLogger.info({ sessionToken }, "Generated new session token");
    } else {
        maestroLogger.info({ sessionToken }, "Reusing provided session token");
    }

    const response = createCreateSessionResponsePacket(sessionToken);
    socket.write(response);

    maestroLogger.debug("Sent CreateSessionResponse");
}

function handleEnterGameRequest(socket: any) {
    maestroLogger.debug("Received EnterGameRequest");

    const response = createEnterGameResponsePacket();

    maestroLogger.info({ host: "192.168.56.2", port: 8081 }, "Sending game server info to client");

    socket.write(response);

    maestroLogger.debug("Sent EnterGameResponse");
}

function createCreateSessionResponsePacket(
    sessionToken: string,
    // isPlaying = false, // This field seems to be unused by the DPM client (behaves the same whether it's true or false), so we'll just omit it for now
): Buffer {
    const payload = {
        contentType: 1,
        uncompressedData: {
            createSessionResponseField: {
                sessionToken,
                // isPlaying,
            },
        },
    };

    const err = Envelope.verify(payload);
    if (err) {
        throw new Error(`Invalid CreateSessionResponse payload: ${err}`);
    }

    const message = Envelope.create(payload);
    const body = Buffer.from(Envelope.encode(message).finish());
    const framed = Buffer.allocUnsafe(4 + body.length);
    framed.writeUInt32BE(body.length, 0);
    body.copy(framed, 4);

    return framed;
}

function createEnterGameResponsePacket(): Buffer {
    const payload = {
        contentType: 1,
        uncompressedData: {
            [".diepio.proto.enterGameResponseField"]: {
                host: "192.168.56.2",
                port: 8081,
            },
        },
    };

    const err = Envelope.verify(payload);
    if (err) {
        throw new Error(`Invalid EnterGameResponse payload: ${err}`);
    }

    const message = Envelope.create(payload);
    const body = Buffer.from(Envelope.encode(message).finish());
    const framed = Buffer.allocUnsafe(4 + body.length);
    framed.writeUInt32BE(body.length, 0);
    body.copy(framed, 4);

    return framed;
}

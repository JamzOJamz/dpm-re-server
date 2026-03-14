import { Envelope } from "./proto";
import { generateSessionToken } from "./utils/session-token";

export async function handlePacket(packet: Buffer, socket: any) {
  // console.log(`[Packet] ${packet.length} bytes`);
  // console.log(`[Hex]    ${packet.toString("hex")}`);

  try {
    const decoded = Envelope.decode(packet);
    console.log("Decoded message:", JSON.stringify(decoded, null, 2));

    const msg = decoded.toJSON();

    let data: any = null;
    switch (msg.contentType) {
      case "uncompressed":
        data = msg.uncompressedData;
        break;
    }

    if (data.createSessionRequestField) {
      handleCreateSessionRequest(data.createSessionRequestField, socket);
    } else if (data[".diepio.proto.enterGameRequestField"]) {
      console.warn("Received enterGameRequest, which is not implemented yet");
    } else {
      console.warn("Unknown message type:", Object.keys(data));
    }
  } catch (err) {
    console.error("Failed to decode packet:", err);
  }
}

function handleCreateSessionRequest(request: any, socket: any) {
  console.log("Received createSessionRequest:", request);

  if (request.clientVersion != "3.0.0") {
    console.warn("Unsupported client version:", request.clientVersion); // TODO: Handle this properly (send error response)
    return;
  }

  if (request.platform != "android") {
    console.warn("Unsupported platform:", request.platform); // TODO: Handle this properly (send error response)
    return;
  }

  const response = createCreateSessionResponsePacket(
    request.sessionToken ?? generateSessionToken(),
  );
  socket.write(response);
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
    throw new Error(`Invalid createSessionResponse payload: ${err}`);
  }

  const message = Envelope.create(payload);
  const body = Buffer.from(Envelope.encode(message).finish());
  const framed = Buffer.allocUnsafe(4 + body.length);
  framed.writeUInt32BE(body.length, 0);
  body.copy(framed, 4);

  return framed;
}

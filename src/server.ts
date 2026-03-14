import { handlePacket } from "./handlers";
import type { SocketData } from "./types";

const server = Bun.listen<SocketData>({
  hostname: "0.0.0.0",
  port: 8080,
  socket: {
    open(socket) {
      console.log("Client connected from " + socket.remoteAddress);
      socket.data = { buffer: Buffer.alloc(0), expectedSize: null };
    },
    data(socket, rawData) {
      socket.data.buffer = Buffer.concat([
        socket.data.buffer,
        Buffer.from(rawData),
      ]);

      while (true) {
        const buf = socket.data.buffer;

        if (socket.data.expectedSize === null) {
          if (buf.length < 4) break;
          socket.data.expectedSize = buf.readUInt32BE(0);
        }

        if (buf.length < 4 + socket.data.expectedSize) break;

        const packet = buf.slice(4, 4 + socket.data.expectedSize);
        socket.data.buffer = buf.slice(4 + socket.data.expectedSize);
        socket.data.expectedSize = null;

        handlePacket(packet, socket);
      }
    },
    close(socket) {
      console.log("Client disconnected");
    },
    error(socket, error) {
      console.log("Error: " + error.message);
    },
  },
});

console.log("Listening on tcp://0.0.0.0:" + server.port);

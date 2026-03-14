import { load } from "protobufjs";
import { join } from "path";

const root = await load([
  join(import.meta.dir, "../../proto/maestro/maestro_user.proto"),
  join(import.meta.dir, "../../proto/maestro/client_server.proto"),
]); // prettier-ignore

export const Envelope = root.lookupType("maestro.user_proto.envelope");

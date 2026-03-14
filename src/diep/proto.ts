import { load } from "protobufjs";
import { join } from "path";

const root = await load(
  join(import.meta.dir, "../../proto/diep/client_gameserver.proto"),
); // prettier-ignore

export const Envelope = root.lookupType("diep_io.client_gameserver_proto.envelope");

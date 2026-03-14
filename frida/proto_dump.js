const moduleName = "libgame-DPM-GooglePlay-Gold-Release-Module-180.so";
const lib = Process.getModuleByName(moduleName);

function dumpBlob(label, offset, size) {
    console.log(`Dumping ${label}`);
    const bytes = lib.base.add(offset).readByteArray(size);
    const hex = Array.from(new Uint8Array(bytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    console.log(hex);
}

dumpBlob("client_gameserver", 0x1263faf, 2152); // prettier-ignore
dumpBlob("client_server",     0x1264cd3, 316); // prettier-ignore
dumpBlob("maestro_user",      0x1264f1c, 1095); // prettier-ignore

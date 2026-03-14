const moduleName = "libgame-DPM-GooglePlay-Gold-Release-Module-180.so";
const lib = Process.getModuleByName(moduleName);

function dumpBlob(label, offset, size) {
    console.log(`Dumping ${label}`);
    const bytes = lib.base.add(offset).readByteArray(size);
    const hex = Array.from(new Uint8Array(bytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    console.log(hex);
}

dumpBlob("client_gameserver", 0x1263FAF, 2152);
dumpBlob("client_server",     0x1264CD3, 316);
dumpBlob("maestro_user",      0x1264F1C, 1095);
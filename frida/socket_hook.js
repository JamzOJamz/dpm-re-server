Java.perform(function() {

    var JavaSocket = Java.use("com.miniclip.network.JavaSocket");

    // Set to null to disable spoofing
    var SPOOFED_HOST = "192.168.56.2";
    var SPOOFED_PORT = 8080;

    JavaSocket.$init.overload(
        "java.lang.String",
        "java.lang.String",
        "int",
        "long",
        "int",
        "java.lang.String"
    ).implementation = function(socketType, host, port, nativeObj, bufferSize, extra) {

        var finalHost = SPOOFED_HOST !== null ? SPOOFED_HOST : host;
        var finalPort = SPOOFED_PORT !== null ? SPOOFED_PORT : port;

        console.log("\n[JavaSocket.$init] New connection");
        console.log("  socketType:   " + socketType);
        console.log("  nativeObject: " + nativeObj);
        console.log("  bufferSize:   " + bufferSize);
        console.log("  extra:        " + extra);
        console.log("  host:         " + host + (SPOOFED_HOST !== null ? " => " + finalHost + " (spoofed)" : ""));
        console.log("  port:         " + port + (SPOOFED_PORT !== null ? " => " + finalPort + " (spoofed)" : ""));

        this.$init(socketType, finalHost, finalPort, nativeObj, bufferSize, extra);
    };

    JavaSocket.connectTCP.implementation = function() {
        console.log("\n[JavaSocket.connectTCP] Attempting connection to " + this._hostAddress.value + ":" + this._hostPort.value);
        return this.connectTCP();
    };

    JavaSocket.onConnect.implementation = function(nativeObj) {
        console.log("\n[JavaSocket.onConnect] Connect event fired");
        return this.onConnect(nativeObj);
    };

    JavaSocket.onDisconnect.implementation = function(nativeObj, code, message) {
        console.log("\n[JavaSocket.onDisconnect] Disconnect event fired");
        console.log("  code:    " + code);
        console.log("  message: " + message);
        return this.onDisconnect(nativeObj, code, message);
    };

    JavaSocket.sendDataTCP.implementation = function(bArr) {
        console.log("\n[sendDataTCP] Called");
        console.log("  length: " + bArr.length);

        // Hex dump the bytes being sent
        var hex = "";
        var ascii = "";
        for (var i = 0; i < Math.min(bArr.length, 64); i++) {
            var b = bArr[i] & 0xFF;
            hex += ("0" + b.toString(16)).slice(-2) + " ";
            ascii += (b >= 32 && b < 127) ? String.fromCharCode(b) : ".";
        }
        console.log("  hex:    " + hex);
        console.log("  ascii:  " + ascii);

        // Print Java stack trace
        var Exception = Java.use("java.lang.Exception");
        var stackTrace = Exception.$new().getStackTrace();
        console.log("  stack trace:");
        for (var j = 0; j < stackTrace.length; j++) {
            console.log("    at " + stackTrace[j].toString());
        }

        // Call the original method
        return this.sendDataTCP(bArr);
    };

    /*JavaSocket.sendData.implementation = function(bArr) {
        console.log("\n[sendData] Called");

        // Print Java stack trace
        var Exception = Java.use("java.lang.Exception");
        var stackTrace = Exception.$new().getStackTrace();
        console.log("  stack trace:");
        for (var j = 0; j < stackTrace.length; j++) {
            console.log("    at " + stackTrace[j].toString());
        }

        // Call the original method
        return this.sendData(bArr);
    };*/

});
import pino from "pino";

const logger = pino({
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
});

export const maestroLogger = logger.child({ service: "Maestro Replica" });
export const diepLogger = logger.child({ service: "DPM Server" });

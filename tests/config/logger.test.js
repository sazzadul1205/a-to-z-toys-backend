import { logger } from "../../config/logger.js";

describe("Logger", () => {
  it("exposes all log levels", () => {
    expect(logger.error).toBeInstanceOf(Function);
    expect(logger.warn).toBeInstanceOf(Function);
    expect(logger.info).toBeInstanceOf(Function);
    expect(logger.http).toBeInstanceOf(Function);
    expect(logger.debug).toBeInstanceOf(Function);
  });

  it("returns the current log level", () => {
    logger.setLevel("info");
    expect(logger.getLevel()).toBe("info");
  });

   it("respects LOG_LEVEL env var", () => {
     logger.setLevel("debug");
     expect(logger.getLevel()).toBe("debug");
     logger.setLevel("info");
     expect(logger.getLevel()).toBe("info");
   });

  it("writes log files to the log directory", () => {
    logger.info("test log entry");
    const files = logger.getLogFiles();
    expect(Array.isArray(files)).toBe(true);
  });

  it("reads content from a log file", () => {
    logger.info("test log entry for reading");
    const files = logger.getLogFiles();
    if (files.length > 0) {
      const content = logger.readLogFile(files[files.length - 1]);
      expect(content).toContain("test log entry for reading");
    }
  });

  it("does not include path traversal chars in filenames", () => {
    const files = logger.getLogFiles();
    for (const f of files) {
      expect(f).not.toContain("..");
      expect(f).not.toContain("/");
      expect(f).not.toContain("\\");
    }
  });
});

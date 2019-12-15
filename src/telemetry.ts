/* eslint-disable no-console */

const TELEMETRY_LEVELS = [
  'debug',
  'warn',
  'error',
  'critical',
] as const;

export type TelemetryLevel = typeof TELEMETRY_LEVELS[number];

const ERROR_THRESHOLD = TELEMETRY_LEVELS.indexOf('error');

const ERROR_LEVELS: Set<TelemetryLevel> =
  new Set(TELEMETRY_LEVELS.slice(ERROR_THRESHOLD));

/**
 * @ignore
 */
export default class Telemetry {

  private levels: Set<TelemetryLevel>
  private sender: TelemetryHandler

  constructor(level: TelemetryLevel, sender: TelemetryHandler) {
    const indexOfLevel = TELEMETRY_LEVELS.indexOf(level);
    this.levels = new Set(TELEMETRY_LEVELS.slice(indexOfLevel));
    this.sender = sender;
  }

  send(level: TelemetryLevel, message: string, ...args: any[]) {
    if (this.levels.has(level)) {
      const isError = ERROR_LEVELS.has(level);
      const finalMess = `Motel ${level}: ${message}`;
      this.sender(isError, finalMess, ...args);
    }
  }
}

export const consoleTelemetryHandler: TelemetryHandler = (isError, message, ...args) => {
  if (isError) {
    console.error(message, ...args);
  } else {
    console.log(message, ...args);
  }
};

/**
 * Callback to handle telemetry data.
 * @param isError Whether this telemetry is considered an error.
 * @param message Descriptive string describing something that happened.
 * @param args Possibly empty array containing additional information.
 */
export interface TelemetryHandler {
  (isError: boolean, message: string, ...args: any[]): void;
}

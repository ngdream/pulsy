// DevTools file
const isDevelopment = process.env.NODE_ENV === "development";

const logStyle = {
  info: "color: #1E90FF; font-weight: bold;",
  warn: "color: #FFA500; font-weight: bold;",
  error: "color: #FF4500; font-weight: bold;",
  measure: "color: #32CD32; font-weight: bold;",
  debug: "color: #9932CC; font-weight: bold;",
  group: "color: #4169E1; font-weight: bold;",
  none: "",
  groupEnd: "",
};

type LogLevel =
  | "info"
  | "warn"
  | "error"
  | "measure"
  | "debug"
  | "group"
  | "none"
  | "groupEnd";

type DevToolsConfig = {
  enableDevTools?: boolean;
  logLevel?: LogLevel;
  trackPerformance?: boolean;
  enableConsoleGroups?: boolean;
  enableStateTimeline?: boolean;
};

let devToolsConfig: DevToolsConfig = {
  enableDevTools: isDevelopment,
  logLevel: "info",
  trackPerformance: true,
  enableConsoleGroups: true,
  enableStateTimeline: true,
};

// Function to configure devTools
export const configureDevTools = (config: DevToolsConfig): void => {
  devToolsConfig = { ...devToolsConfig, ...config };
};

// Timeline to track state changes
const stateTimeline: Array<{
  timestamp: number;
  storeName: string;
  value: any;
}> = [];

export const devTools = {
  log: (message: string, style: LogLevel = "info", ...args: any[]) => {
    if (
      devToolsConfig.enableDevTools &&
      (devToolsConfig.logLevel === style || devToolsConfig.logLevel === "info")
    ) {
      if (devToolsConfig.enableConsoleGroups && style === "group") {
        console.group(`%c${message}`, logStyle[style]);
      } else if (style === "groupEnd") {
        console.groupEnd();
      } else {
        console.log(`%c${message}`, logStyle[style], ...args);
      }
    }
  },
  mark: (markName: string) => {
    if (devToolsConfig.enableDevTools && devToolsConfig.trackPerformance) {
      performance.mark(markName);
      devTools.log(`Mark: ${markName}`, "debug");
    }
  },
  measure: (measureName: string, startMark: string, endMark: string) => {
    if (devToolsConfig.enableDevTools && devToolsConfig.trackPerformance) {
      performance.measure(measureName, startMark, endMark);
      const measure = performance.getEntriesByName(measureName).pop();
      if (measure) {
        devTools.log(
          `${measureName}: ${measure.duration.toFixed(2)}ms`,
          "measure"
        );
      }
    }
  },
  trackStateChange: (storeName: string, value: any) => {
    if (devToolsConfig.enableDevTools && devToolsConfig.enableStateTimeline) {
      stateTimeline.push({ timestamp: Date.now(), storeName, value });
      devTools.log(`State changed: ${storeName}`, "debug", value);
    }
  },
  getStateTimeline: () => stateTimeline,
  clearStateTimeline: () => {
    stateTimeline.length = 0;
    devTools.log("State timeline cleared", "info");
  },
  logPerformance: () => {
    if (devToolsConfig.enableDevTools && devToolsConfig.trackPerformance) {
      const measures = performance.getEntriesByType("measure");
      devTools.log("Performance Summary:", "group");
      measures.forEach((measure) => {
        devTools.log(
          `${measure.name}: ${measure.duration.toFixed(2)}ms`,
          "measure"
        );
      });
      devTools.log("", "groupEnd");
    }
  },
  visualizeStateChanges: () => {
    if (devToolsConfig.enableDevTools && devToolsConfig.enableStateTimeline) {
      console.table(stateTimeline);
    }
  },
};

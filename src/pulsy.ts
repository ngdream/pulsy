import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { devTools, configureDevTools } from "./devtools";

// Type for the store
type Store<T> = {
  value: T;
  reloaders: Set<(value: T) => void>;
  middleware: Middleware<T>[];
  memoize: boolean;
};

// Middleware type
type Middleware<T> = (
  nextValue: T,
  prevValue: T,
  storeName: string
) => T | Promise<T>;

// Pulsy configuration type
type PulsyConfig = {
  enableDevTools?: boolean;
  defaultPersist?: boolean;
  onStoreCreate?: (name: string, initialValue: any) => void;
  onStoreUpdate?: (name: string, newValue: any) => void;
  persist?: boolean;
  defaultMemoize?: boolean;
};

// Map to hold the stores
const stores: Map<string, Store<any>> = new Map();

// Default configuration
let pulsyConfig: PulsyConfig = {
  enableDevTools: process.env.NODE_ENV === "development",
  defaultPersist: false,
  onStoreCreate: undefined,
  onStoreUpdate: undefined,
  persist: undefined,
  defaultMemoize: false,
};

// Function to configure Pulsy
export function configurePulsy(config: PulsyConfig): void {
  pulsyConfig = { ...pulsyConfig, ...config };
  configureDevTools({ enableDevTools: pulsyConfig.enableDevTools ?? true });
  if (pulsyConfig.enableDevTools) {
    devTools.log("Pulsy configured", "info", pulsyConfig);
  }
}

// Function to create a store
export function createStore<T>(
  name: string,
  initialValue: T,
  options?: {
    persist?: boolean;
    middleware?: Middleware<T>[];
    memoize?: boolean;
  }
): void {
  const persist =
    options?.persist ?? pulsyConfig.persist ?? pulsyConfig.defaultPersist;
  const memoize = options?.memoize ?? pulsyConfig.defaultMemoize;

  if (stores.has(name)) {
    devTools.log(
      `Store with name "${name}" already exists. Skipping creation.`,
      "warn"
    );
    return;
  }

  devTools.mark(`createStore-start-${name}`);

  try {
    let value = initialValue;

    if (persist) {
      const storedValue = localStorage.getItem(name);
      if (storedValue !== null) {
        try {
          value = JSON.parse(storedValue);
        } catch (error) {
          devTools.log(
            `Error parsing stored value for "${name}". Using initial value.`,
            "warn"
          );
        }
      }
    }

    stores.set(name, {
      value,
      reloaders: new Set(),
      middleware: options?.middleware ?? [],
      memoize: memoize!,
    });

    if (pulsyConfig.onStoreCreate) {
      pulsyConfig.onStoreCreate(name, value);
    }

    if (persist) {
      localStorage.setItem(name, JSON.stringify(value));
      devTools.log(`Store "${name}" persisted.`, "info");
    }

    devTools.mark(`createStore-end-${name}`);
    devTools.measure(
      `createStore-${name}`,
      `createStore-start-${name}`,
      `createStore-end-${name}`
    );
    devTools.log(`Store created: ${name}`, "info", value);
  } catch (error) {
    devTools.log(
      `Error creating store "${name}": ${(error as Error).message}`,
      "error"
    );
  }
}

// Function to get the value of a store
export function getStoreValue<T>(name: string): T | undefined {
  const store = stores.get(name);
  if (!store) {
    throw new Error(`Store with name "${name}" does not exist.`);
  }
  return store.value;
}

// Function to initialize multiple stores at once with optional configuration
export function initializePulsy(
  storeConfigs: Record<string, any>,
  config?: PulsyConfig
): void {
  if (config) {
    configurePulsy(config);
  }

  devTools.mark("initializePulsy-start");

  try {
    Object.entries(storeConfigs).forEach(([name, initialValue]) => {
      if (typeof name !== "string") {
        throw new Error("Store name must be a string.");
      }
      createStore(name, initialValue);
    });
  } catch (error) {
    devTools.log(
      `Error initializing stores: ${(error as Error).message}`,
      "error"
    );
  }

  devTools.mark("initializePulsy-end");
  devTools.log("Pulsy stores initialized", "info", Object.keys(storeConfigs));
}

// Hook to use a Pulsy store
export default function usePulsy<T>(
  name: string
): [T, (newValue: T | ((prevValue: T) => T)) => Promise<void>] {
  const storeRef = useRef<Store<T>>();

  // Initialize state with the existing store value
  const [value, setValue] = useState<T>(() => {
    devTools.mark(`usePulsy-init-start-${name}`);

    let store = stores.get(name);
    if (!store) {
      throw new Error(`Store with name "${name}" does not exist.`);
    }
    storeRef.current = store;
    devTools.mark(`usePulsy-init-end-${name}`);
    return store.value;
  });

  // Define setter function to update the store and notify all reloaders
  const setter = useCallback(
    async (newValue: T | ((prevValue: T) => T)) => {
      devTools.mark(`usePulsy-setter-start-${name}`);

      const store = storeRef.current;
      if (store) {
        try {
          let updatedValue =
            typeof newValue === "function"
              ? (newValue as (prevValue: T) => T)(store.value)
              : newValue;

          // Apply middleware
          for (const middleware of store.middleware) {
            updatedValue = await middleware(updatedValue, store.value, name);
          }

          store.value = updatedValue;
          store.reloaders.forEach((r) => r(updatedValue));
          if (pulsyConfig.onStoreUpdate) {
            pulsyConfig.onStoreUpdate(name, updatedValue);
          }
          devTools.log(`Store updated: ${name}`, "info", updatedValue);
          if (pulsyConfig.persist ?? pulsyConfig.defaultPersist) {
            localStorage.setItem(name, JSON.stringify(updatedValue));
            devTools.log(`Store "${name}" persisted after update.`, "info");
          }
        } catch (error) {
          devTools.log(
            `Error updating store "${name}": ${(error as Error).message}`,
            "error"
          );
        }
      }
      devTools.mark(`usePulsy-setter-end-${name}`);
      devTools.measure(
        `usePulsy-setter-${name}`,
        `usePulsy-setter-start-${name}`,
        `usePulsy-setter-end-${name}`
      );
    },
    [name]
  );

  useEffect(() => {
    devTools.mark(`usePulsy-effect-start-${name}`);

    const store = storeRef.current!;
    store.reloaders.add(setValue);
    setValue(store.value);

    devTools.log(`Effect run for store: ${name}`, "info");

    return () => {
      store.reloaders.delete(setValue);
      if (store.reloaders.size === 0) {
        stores.delete(name);
        devTools.log(`Store deleted: ${name}`, "info");
      }

      devTools.mark(`usePulsy-effect-end-${name}`);
      devTools.measure(
        `usePulsy-effect-${name}`,
        `usePulsy-effect-start-${name}`,
        `usePulsy-effect-end-${name}`
      );
    };
  }, [name]);

  // Memoize the value if memoization is enabled for this store
  const memoizedValue = useMemo(
    () => value,
    [value, storeRef.current?.memoize]
  );

  return [storeRef.current?.memoize ? memoizedValue : value, setter];
}

// Utility function to create a namespaced store
export const createNamespacedStore = (namespace: string) => {
  return <T>(key: string) => usePulsy<T>(`${namespace}:${key}`);
};

// Function to add middleware to an existing store
export function addMiddleware<T>(
  name: string,
  middleware: Middleware<T>
): void {
  const store = stores.get(name) as Store<T> | undefined;
  if (!store) {
    throw new Error(`Store with name "${name}" does not exist.`);
  }
  store.middleware.push(middleware);
  devTools.log(`Middleware added to store: ${name}`, "info");
}

export function useTimeTravel<T>(
  name: string
): [
  T,
  (newValue: T | ((prevValue: T) => T)) => Promise<void>,
  () => void,
  () => void,
  T[]
] {
  const [value, setValue] = usePulsy<T>(name);
  const historyRef = useRef<T[]>([value]);
  const positionRef = useRef<number>(0);

  const updateValue = useCallback(
    async (newValue: T | ((prevValue: T) => T)) => {
      const updatedValue =
        typeof newValue === "function"
          ? (newValue as (prevValue: T) => T)(value)
          : newValue;
      historyRef.current = historyRef.current.slice(0, positionRef.current + 1);
      historyRef.current.push(updatedValue);
      positionRef.current++;
      await setValue(updatedValue);
    },
    [value, setValue]
  );

  const undo = useCallback(() => {
    if (positionRef.current > 0) {
      positionRef.current--;
      setValue(historyRef.current[positionRef.current]);
    }
  }, [setValue]);

  const redo = useCallback(() => {
    if (positionRef.current < historyRef.current.length - 1) {
      positionRef.current++;
      setValue(historyRef.current[positionRef.current]);
    }
  }, [setValue]);

  return [value, updateValue, undo, redo, historyRef.current];
}

// Computed stores
export function createComputedStore<T>(
  name: string,
  computeFn: () => T,
  dependencies: string[]
): void {
  const computedValue = computeFn();
  createStore(name, computedValue);

  dependencies.forEach((depName) => {
    const [, setter] = usePulsy(name);
    const [depValue] = usePulsy(depName);
    useEffect(() => {
      setter(computeFn());
    }, [depValue]);
  });
}

export function composeStores<T extends Record<string, any>>(
  name: string,
  storeMap: { [K in keyof T]: string }
): [T, (updates: Partial<{ [K in keyof T]: any }>) => Promise<void>] {
  const composedStore = {} as T;
  const setters = {} as { [K in keyof T]: (value: any) => Promise<void> };

  // Log the creation of the composed store
  devTools.log(`Composing store: ${name}`, "info");

  // Create the composed store and setters based on the provided store map
  Object.entries(storeMap).forEach(([key, storeName]) => {
    const [value, setValue] = usePulsy(storeName);
    //@ts-ignore
    composedStore[key as keyof T] = value;
    setters[key as keyof T] = setValue;
  });

  // Register the composed store in Pulsy
  createStore(name, composedStore);

  // Function to update the composed store
  const setComposedStore = async (
    updates: Partial<{ [K in keyof T]: any }>
  ) => {
    devTools.log(`Updating composed store: ${name}`, "info", updates);
    try {
      for (const [key, value] of Object.entries(updates)) {
        if (key in setters) {
          await setters[key as keyof T](value);
        } else {
          devTools.log(`No setter found for key: ${key}`, "warn");
        }
      }
      devTools.log(`Composed store updated successfully: ${name}`, "info");
    } catch (error) {
      devTools.log(`Error updating composed store: ${name}`, "error", error);
    }
  };

  return [composedStore, setComposedStore];
}

// Enhanced logging middleware
const enhancedLoggingMiddleware: Middleware<any> = (
  nextValue,
  prevValue,
  storeName
) => {
  devTools.log(`Store Update: ${storeName}`, "group");
  devTools.log("Previous Value:", "info", prevValue);
  devTools.log("Next Value:", "info", nextValue);
  devTools.log("", "groupEnd");
  return nextValue;
};

// Action creators
type Action<T> = { type: string; payload?: T };
type ActionCreator<T> = (payload?: T) => Action<T>;
type ActionHandler<S, T> = (state: S, action: Action<T>) => S;

export function createActions<S, T>(
  storeName: string,
  actionHandlers: Record<string, ActionHandler<S, T>>
): Record<string, ActionCreator<T>> {
  const actions: Record<string, ActionCreator<T>> = {};

  for (const type in actionHandlers) {
    actions[type] = (payload?: T) => {
      const [currentState, setState] = usePulsy<S>(storeName);
      const action = { type, payload };
      const newState = actionHandlers[type](currentState, action);
      setState(newState);
      return action;
    };
  }

  return actions;
}

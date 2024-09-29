import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { devTools, configureDevTools } from "./devtools";

// Type for the store
type Store<T> = {
  value: T;
  reloaders: Set<(value: T) => void>;
  middleware: Middleware<T>[];
  memoize: boolean;
  persist?: boolean | PersistenceOptions;
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

  onStoreCreate?: (name: string, initialValue: any) => void;
  onStoreUpdate?: (name: string, newValue: any) => void;
  persist?: boolean;
  defaultMemoize?: boolean;
};

// Types for persistence options
type PersistenceOptions = {
  storage?: Storage;
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
  version?: number;
  migrate?: (persistedState: any, version: number) => any;
};

// Default persistence options
const defaultPersistenceOptions: PersistenceOptions = {
  storage: localStorage,
  serialize: JSON.stringify,
  deserialize: JSON.parse,
  version: 1,
};

// Map to hold the stores
const stores: Map<string, Store<any>> = new Map();

// Default configuration
let pulsyConfig: PulsyConfig = {
  enableDevTools: process.env.NODE_ENV === "development",
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

// Function to persist a store
function persistStore<T>(
  name: string,
  value: T,
  options: PersistenceOptions = {}
): void {
  const { storage, serialize } = { ...defaultPersistenceOptions, ...options };
  try {
    const serializedValue = serialize!({
      value,
      version: options.version || 1,
    });
    storage!.setItem(`pulsy_${name}`, serializedValue);
    devTools.log(`Store "${name}" persisted successfully.`, "info");
  } catch (error) {
    devTools.log(
      `Error persisting store "${name}": ${(error as Error).message}`,
      "error"
    );
  }
}

// Function to retrieve a persisted store
function retrievePersistedStore<T>(
  name: string,
  options: PersistenceOptions = {}
): T | undefined {
  const { storage, deserialize, version, migrate } = {
    ...defaultPersistenceOptions,
    ...options,
  };
  try {
    const serializedValue = storage!.getItem(`pulsy_${name}`);
    if (serializedValue) {
      let { value, version: storedVersion } = deserialize!(serializedValue);

      // Perform migration if versions don't match
      if (version && storedVersion !== version && migrate) {
        value = migrate(value, storedVersion);
        // Re-persist the migrated value
        persistStore(name, value, { ...options, version });
      }

      devTools.log(`Store "${name}" retrieved successfully.`, "info");
      return value;
    }
  } catch (error) {
    devTools.log(
      `Error retrieving persisted store "${name}": ${(error as Error).message}`,
      "error"
    );
  }
  return undefined;
}

// Enhanced createStore function with improved persistence
export function createStore<T>(
  name: string,
  initialValue: T,
  options?: {
    persist?: boolean | PersistenceOptions;
    middleware?: Middleware<T>[];
    memoize?: boolean;
  }
): void {
  const persistOptions =
    typeof options?.persist === "object" ? options.persist : {};
  const shouldPersist = options?.persist || pulsyConfig.persist;

  let value = initialValue;

  if (shouldPersist) {
    const persistedValue = retrievePersistedStore<T>(name, persistOptions);
    if (persistedValue !== undefined) {
      value = persistedValue;
    }
  }

  stores.set(name, {
    value,
    reloaders: new Set(),
    middleware: options?.middleware ?? [],
    memoize: options?.memoize ?? pulsyConfig.defaultMemoize ?? false,
    persist: shouldPersist,
  });

  if (pulsyConfig.onStoreCreate) {
    pulsyConfig.onStoreCreate(name, value);
  }

  if (shouldPersist) {
    persistStore(name, value, persistOptions);
  }

  devTools.log(`Store created: ${name}`, "info", value);
}

// Function to get the value of a store
export function getStoreValue<T>(name: string): T | undefined {
  const store = stores.get(name);
  if (!store) {
    throw new Error(`Store with name "${name}" does not exist.`);
  }
  return store.value;
}

// Enhanced setter function with improved persistence
export const createSetter =
  <T>(name: string) =>
  async (newValue: T | ((prevValue: T) => T)) => {
    devTools.mark(`usePulsy-setter-start-${name}`);
    const store = stores.get(name);
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

        if (store.persist) {
          persistStore(
            name,
            updatedValue,
            typeof store.persist === "object" ? store.persist : undefined
          );
        }
        devTools.mark(`usePulsy-setter-end-${name}`);
        devTools.measure(
          `usePulsy-setter-${name}`,
          `usePulsy-setter-start-${name}`,
          `usePulsy-setter-end-${name}`
        );
      } catch (error) {
        devTools.log(
          `Error updating store "${name}": ${(error as Error).message}`,
          "error"
        );
      }
    }
  };

export function setStoreValue<T>(name: string, value: T) {
  const setter = createSetter(name);
  setter(value);
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

// Function to clear persisted stores
export function clearPersistedStores(
  storageType: Storage = localStorage
): void {
  Object.keys(storageType).forEach((key) => {
    if (key.startsWith("pulsy_")) {
      storageType.removeItem(key);
    }
  });
  devTools.log("All persisted stores cleared.", "info");
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
  const setter = useCallback(async (newValue: T | ((prevValue: T) => T)) => {
    // devTools.mark(`usePulsy-setter-start-${name}`);

    // const store = storeRef.current;
    // if (store) {
    //   try {
    //     let updatedValue =
    //       typeof newValue === "function"
    //         ? (newValue as (prevValue: T) => T)(store.value)
    //         : newValue;

    //     // Apply middleware
    //     for (const middleware of store.middleware) {
    //       updatedValue = await middleware(updatedValue, store.value, name);
    //     }

    //     store.value = updatedValue;
    //     store.reloaders.forEach((r) => r(updatedValue));
    //     if (pulsyConfig.onStoreUpdate) {
    //       pulsyConfig.onStoreUpdate(name, updatedValue);
    //     }
    //     devTools.log(`Store updated: ${name}`, "info", updatedValue);
    //     if (
    //       (store.persist == undefined &&
    //         (pulsyConfig.persist ?? pulsyConfig.defaultPersist)) ||
    //       store.persist == true
    //     ) {
    //       localStorage.setItem(name, JSON.stringify(updatedValue));
    //       devTools.log(`Store "${name}" persisted after update.`, "info");
    //     }
    //   } catch (error) {
    //     devTools.log(
    //       `Error updating store "${name}": ${(error as Error).message}`,
    //       "error"
    //     );
    //   }
    // }
    // devTools.mark(`usePulsy-setter-end-${name}`);
    // devTools.measure(
    //   `usePulsy-setter-${name}`,
    //   `usePulsy-setter-start-${name}`,
    //   `usePulsy-setter-end-${name}`
    // );
    const setter = await createSetter(name);
    setter(newValue);
  }, []);

  useEffect(() => {
    devTools.mark(`usePulsy-effect-start-${name}`);

    const store = storeRef.current!;
    store.reloaders.add(setValue);
    setValue(store.value);

    devTools.log(`Effect run for store: ${name}`, "info");

    return () => {
      store.reloaders.delete(setValue);
      devTools.mark(`usePulsy-effect-end-${name}`);
      devTools.measure(
        `usePulsy-effect-${name}`,
        `usePulsy-effect-start-${name}`,
        `usePulsy-effect-end-${name}`
      );
    };
  }, []);

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

// Improved Computed Stores
export function createComputedStore<T>(
  name: string,
  computeFn: () => T,
  dependencies: string[]
): void {
  const computedValue = computeFn();
  createStore(name, computedValue);

  const updateComputedStore = () => {
    const newValue = computeFn();
    const store = stores.get(name);
    if (store) {
      store.value = newValue;
      store.reloaders.forEach((reloader) => reloader(newValue));
      if (pulsyConfig.onStoreUpdate) {
        pulsyConfig.onStoreUpdate(name, newValue);
      }
    }
  };

  dependencies.forEach((depName) => {
    const depStore = stores.get(depName);
    if (depStore) {
      depStore.reloaders.add(updateComputedStore);
    }
  });
}

// Improved Compose Store
export function composeStores<T extends Record<string, any>>(
  name: string,
  storeMap: { [K in keyof T]: string }
): [() => T, (updates: Partial<{ [K in keyof T]: any }>) => Promise<void>] {
  const composedValue = {} as T;
  Object.entries(storeMap).forEach(([key, storeName]) => {
    const store = stores.get(storeName);
    if (store) {
      composedValue[key as keyof T] = store.value;
    }
  });

  createStore(name, composedValue);

  const updateComposedStore = () => {
    const newComposedValue = {} as T;
    let hasChanges = false;

    Object.entries(storeMap).forEach(([key, storeName]) => {
      const store = stores.get(storeName);
      if (store) {
        const value = store.value;
        if (value !== composedValue[key as keyof T]) {
          newComposedValue[key as keyof T] = value;
          hasChanges = true;
        } else {
          newComposedValue[key as keyof T] = composedValue[key as keyof T];
        }
      }
    });

    if (hasChanges) {
      const composedStore = stores.get(name);
      if (composedStore) {
        composedStore.value = newComposedValue;
        composedStore.reloaders.forEach((reloader) =>
          reloader(newComposedValue)
        );
        if (pulsyConfig.onStoreUpdate) {
          pulsyConfig.onStoreUpdate(name, newComposedValue);
        }
      }
    }
  };

  Object.values(storeMap).forEach((storeName) => {
    const store = stores.get(storeName);
    if (store) {
      store.reloaders.add(updateComposedStore);
    }
  });

  const getComposedStore = (): T => {
    const store = stores.get(name);
    return store ? (store.value as T) : composedValue;
  };

  const setComposedStore = async (
    updates: Partial<{ [K in keyof T]: any }>
  ) => {
    devTools.log(`Updating composed store: ${name}`, "info", updates);
    try {
      for (const [key, value] of Object.entries(updates)) {
        if (key in storeMap) {
          const store = stores.get(storeMap[key as keyof T]);
          if (store) {
            store.value = value;
            store.reloaders.forEach((reloader) => reloader(value));
            if (pulsyConfig.onStoreUpdate) {
              pulsyConfig.onStoreUpdate(storeMap[key as keyof T], value);
            }
          }
        } else {
          devTools.log(`No store found for key: ${key}`, "warn");
        }
      }
      devTools.log(`Composed store updated successfully: ${name}`, "info");
    } catch (error) {
      devTools.log(`Error updating composed store: ${name}`, "error", error);
    }
  };

  return [getComposedStore, setComposedStore];
}

// Action creators
type Action<T> = { type: string; payload?: T };
type ActionCreator<T> = (payload?: T) => Action<T>;
type ActionHandler<S, T> = (state: S, action: Action<T>) => S;

export function createActions<S, T>(
  storeName: string,
  actionHandlers: Record<string, ActionHandler<S, T>>
): Record<string, ActionCreator<T>> {
  const actions: Record<string, ActionCreator<T>> = {};
  console.log(actionHandlers);
  for (const type in actionHandlers) {
    if (Object.prototype.hasOwnProperty.call(actionHandlers, type)) {
      actions[type] = (payload?: T) => {
        const store = stores.get(storeName);

        if (!store) {
          throw new Error(
            `Store with name "${storeName}" does not exist. Please ensure the store is initialized before dispatching actions.`
          );
        }

        const currentState = store.value as S;
        const action = { type, payload };
        const newState = actionHandlers[type](currentState, action);

        // Update the store
        store.value = newState;
        store.reloaders.forEach((reloader) => reloader(newState));

        // Call optional onStoreUpdate callback if provided
        pulsyConfig.onStoreUpdate?.(storeName, newState);

        // Persist state if required
        const shouldPersist = store.persist;
        if (shouldPersist) {
          try {
            localStorage.setItem(storeName, JSON.stringify(newState));
          } catch (error) {
            console.error(
              `Failed to persist state for store "${storeName}"`,
              error
            );
          }
        }

        return action;
      };
    }
  }

  return actions;
}

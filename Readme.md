

# Pulsy

Pulsy is a state management solution for React applications that simplifies store creation, management, and persistence. It provides flexible configuration options, integrates seamlessly with development tools, and includes advanced features for state tracking and manipulation.

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Advantages](#advantages)
- [Disadvantages](#disadvantages)
- [Installation](#installation)
- [API](#api)
  - [configurePulsy](#configurepulsyconfig-pulsyconfig)
  - [configureDevTools](#configuredevtoolsconfig-devtoolsconfig)
  - [createStore](#createstoret-name-string-initialvalue-t)
  - [getStoreValue](#getstorevaluet-name-string)
  - [initializePulsy](#initializepulsystoreconfigs-recordstring-any-config-pulsyconfig)
  - [usePulsy](#usepulsyt-name-string)
  - [createNamespacedStore](#createnamespacedstore-namespace-string)
  - [useTimeTravel](#usetime travelt-name-string)
  - [createComputedStore](#createcomputedstorename-string-computefn--dependencies-string-array)
  - [composeStores](#composestoresname-string-storemap-t)
  - [createActions](#createactionstore-name-string-actionhandlers-recordstring-actionhandlers)
  - [enhancedLoggingMiddleware](#enhancedloggingmiddleware)
- [Development Tools Integration](#development-tools-integration)
- [License](#license)
- [Sponsored By](#sponsored-by)
- [Author](#author)

## Description

Pulsy is designed to streamline state management in React applications. It offers an intuitive API for creating and managing stores, advanced features for state tracking, and integrates with development tools for enhanced debugging and performance tracking.

## Features

- **Create and Manage Stores**: Efficiently create, access, and update stores in your React application.
- **Flexible Configuration**: Customize store persistence, development tools integration, and more.
- **Development Tools Integration**: Advanced logging and performance tracking to aid in debugging and optimization.
- **Persistence Support**: Options to persist store data across page reloads.
- **State Time Travel**: Ability to navigate through state changes with undo and redo functionality.
- **Computed Stores**: Automatically compute store values based on dependencies.
- **Store Composition**: Combine multiple stores into a single composed store.
- **Enhanced Logging Middleware**: Provides detailed logging of store updates.
- **Action Creators**: Simplify state updates with action creators and handlers.

## Advantages

- **Easy Integration**: Seamlessly integrates with React, making it simple to adopt in existing projects.
- **Flexible Configuration**: Offers granular control over development tools, persistence, and callbacks.
- **Advanced Features**: Includes time travel, computed stores, and store composition for sophisticated state management.
- **Enhanced Debugging**: Provides detailed logging and performance tracking to diagnose and optimize application behavior.
- **Namespace Support**: Allows for creating namespaced stores, which helps in organizing state in larger applications.

## Disadvantages

- **Learning Curve**: May require some initial learning and setup to fully utilize configuration options and advanced features.
- **Performance Overhead**: Enabling performance tracking and logging can introduce some overhead, particularly in development mode.
- **Persistence Complexity**: Custom persistence logic might be needed if you require complex storage solutions beyond localStorage.

## Installation

Add Pulsy to your project with:

```bash
npm install pulsy
```

or

```bash
yarn add pulsy
```

## API

### `configurePulsy(config: PulsyConfig)`

Configures Pulsy with custom settings.

**Parameters:**

- `config` (PulsyConfig): Configuration options for Pulsy.

**PulsyConfig:**

- `enableDevTools` (boolean): Enable or disable development tools integration. Default is `true` in development mode.
- `defaultPersist` (boolean): Default persistence setting for stores. Default is `false`.
- `onStoreCreate` (function): Callback called when a store is created.
- `onStoreUpdate` (function): Callback called when a store is updated.
- `persist` (boolean): Global persistence setting for all stores.

**Usage:**

```typescript
import { configurePulsy } from "pulsy";

configurePulsy({
  enableDevTools: true,
  defaultPersist: true,
  onStoreCreate: (name, initialValue) => {
    console.log(`Store created: ${name}`, initialValue);
  },
  onStoreUpdate: (name, newValue) => {
    console.log(`Store updated: ${name}`, newValue);
  },
  persist: true,
});
```

### `configureDevTools(config: DevToolsConfig)`

Configures the development tools settings.

**Parameters:**

- `config` (DevToolsConfig): Configuration options for development tools.

**DevToolsConfig:**

- `enableDevTools` (boolean): Enable or disable development tools. Default is `true` in development mode.
- `logLevel` (LogLevel): Set the log level for development tools. Options are `"info"`, `"warn"`, `"error"`, `"measure"`, `"debug"`, `"group"`, or `"none"`. Default is `"info"`.
- `trackPerformance` (boolean): Enable or disable performance tracking. Default is `true`.
- `enableConsoleGroups` (boolean): Enable or disable console groups for grouped logging. Default is `true`.
- `enableStateTimeline` (boolean): Enable or disable state change timeline tracking. Default is `true`.

**Usage:**

```typescript
import { configureDevTools } from "pulsy";

configureDevTools({
  enableDevTools: true,
  logLevel: "warn",
  trackPerformance: false,
  enableConsoleGroups: false,
  enableStateTimeline: true,
});
```

### `createStore<T>(name: string, initialValue: T)`

Creates a new store with a given name and initial value.

**Parameters:**

- `name` (string): The name of the store.
- `initialValue` (T): The initial value of the store.

**Usage:**

```typescript
import { createStore } from "pulsy";

createStore("myStore", { count: 0 });
```

### `getStoreValue<T>(name: string): T | undefined`

Gets the current value of a store by its name.

**Parameters:**

- `name` (string): The name of the store.

**Returns:**

- The current value of the store or `undefined` if the store does not exist.

**Usage:**

```typescript
import { getStoreValue } from "pulsy";

const storeValue = getStoreValue("myStore");
console.log(storeValue);
```

### `initializePulsy(storeConfigs: Record<string, any>, config?: PulsyConfig)`

Initializes multiple stores at once with optional configuration.

**Parameters:**

- `storeConfigs` (Record<string, any>): An object where the keys are store names and the values are their initial values.
- `config` (optional, PulsyConfig): Configuration options for Pulsy.

**Usage:**

```typescript
import { initializePulsy } from "pulsy";

initializePulsy(
  {
    "store1": { count: 1 },
    "store2": { data: [] },
  },
  { persist: true }
);
```

### `usePulsy<T>(name: string): [T, (newValue: T | ((prevValue: T) => T)) => void]`

A React hook to use a Pulsy store in a component.

**Parameters:**

- `name` (string): The name of the store.

**Returns:**

- An array where the first element is the store's value and the second element is a function to update the store's value.

**Usage:**

```typescript
import { usePulsy } from "pulsy";

function CounterComponent() {
  const [state, setState] = usePulsy("myStore");

  const increment = () => setState((prev) => ({ count: prev.count + 1 }));

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

### `createNamespacedStore(namespace: string)`

Creates a function to create stores with a namespaced key.

**Parameters:**

- `namespace` (string): The namespace to prepend to store keys.

**Returns:**

- A function that takes a store key and uses the namespaced key.

**Usage:**

```typescript
import { createNamespacedStore } from "pulsy";

const namespacedStore = createNamespacedStore("myNamespace");

namespacedStore("counter", { count: 0 }); // Creates "myNamespace:counter"
```

### `useTimeTravel<T>(name: string): [T, (newValue: T | ((prevValue: T) => T)) => Promise<void>, () => void, () => void]`

A React hook to use a Pulsy store with time travel capabilities, allowing undo and redo operations.

**Parameters:**

- `name` (string): The name of the store.

**Returns:**

- An array with the store's value, a function to update the value, and functions to undo and redo changes.

**Usage:**

```typescript
import { useTimeTravel } from "pulsy";

function TimeTravelComponent() {
  const [state, setState, undo, redo] = useTimeTravel("myStore");

  return (
    <div>
      <p>Count

: {state.count}</p>
      <button onClick={() => setState((prev) => ({ count: prev.count + 1 }))}>
        Increment
      </button>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
    </div>
  );
}
```

### `createComputedStore<T>(name: string, computeFn: () => T, dependencies: string[])`

Creates a computed store that automatically updates based on dependencies.

**Parameters:**

- `name` (string): The name of the computed store.
- `computeFn` (function): Function to compute the value of the store.
- `dependencies` (string[]): Names of stores that the computed store depends on.

**Usage:**

```typescript
import { createComputedStore } from "pulsy";

createComputedStore("computedStore", () => {
  const [value1] = usePulsy("store1");
  const [value2] = usePulsy("store2");
  return value1 + value2;
}, ["store1", "store2"]);
```

### `composeStores<T extends Record<string, any>>(name: string, storeMap: T): [T, (updates: Partial<T>) => Promise<void>]`

Combines multiple stores into a single composed store.

**Parameters:**

- `name` (string): The name of the composed store.
- `storeMap` (T): An object where keys are store names and values are the store's keys in the composed store.

**Returns:**

- An array with the composed store and a function to update it.

**Usage:**

```typescript
import { composeStores } from "pulsy";

const [composedStore, setComposedStore] = composeStores("composedStore", {
  part1: "store1",
  part2: "store2",
});
```

### `createActions<S, T>(storeName: string, actionHandlers: Record<string, ActionHandler<S, T>>): Record<string, ActionCreator<T>>`

Creates action creators and handlers for a store.

**Parameters:**

- `storeName` (string): The name of the store.
- `actionHandlers` (Record<string, ActionHandler<S, T>>): An object where keys are action types and values are functions to handle actions.

**Returns:**

- An object where keys are action types and values are action creators.

**Usage:**

```typescript
import { createActions } from "pulsy";

const actions = createActions("myStore", {
  increment: (state, action) => ({ count: state.count + 1 }),
  decrement: (state, action) => ({ count: state.count - 1 }),
});

actions.increment(); // Creates an action to increment the count
```

### `enhancedLoggingMiddleware(nextValue: any, prevValue: any, storeName: string)`

Middleware function for enhanced logging of store updates.

**Parameters:**

- `nextValue` (any): The new value of the store.
- `prevValue` (any): The previous value of the store.
- `storeName` (string): The name of the store.

**Returns:**

- The new value of the store.

**Usage:**

```typescript
import { enhancedLoggingMiddleware } from "pulsy";

const storeMiddleware = enhancedLoggingMiddleware;
```

## Development Tools Integration

Pulsy integrates with development tools to enhance debugging and performance tracking.

### DevTools Configuration

Use `configureDevTools` to set up dev tools options such as logging level, performance tracking, and state timeline.

```typescript
import { configureDevTools } from "pulsy";

configureDevTools({
  enableDevTools: true,
  logLevel: "warn",
  trackPerformance: false,
  enableConsoleGroups: false,
  enableStateTimeline: true,
});
```

### DevTools API

- **`log(message: string, style: LogLevel = "info", ...args: any[])`**: Logs a message to the console with the specified style.
- **`mark(markName: string)`**: Marks a point in performance tracking.
- **`measure(measureName: string, startMark: string, endMark: string)`**: Measures the duration between two performance marks.
- **`trackStateChange(storeName: string, value: any)`**: Tracks changes to store state.
- **`getStateTimeline()`**: Returns the timeline of state changes.
- **`clearStateTimeline()`**: Clears the state change timeline.
- **`logPerformance()`**: Logs performance measures.
- **`visualizeStateChanges()`**: Visualizes state changes in a table format.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Sponsored By

Pulsy is sponsored by [SKLFGroup](https://sklfgroup.com).

## Author

Pulsy is created and maintained by [NGDream](https://github.com/ngdream).


Here’s a comprehensive `README.md` for the Pulsy library with examples and explanations:

```markdown
# Pulsy

Pulsy is a modern state management library designed for simplicity and flexibility. It supports React hooks, middleware, persistence, computed stores, and time-travel debugging. Pulsy is lightweight yet powerful, making it an excellent choice for managing state in React applications.

## Features

- **React Integration:** Use Pulsy with React hooks for seamless state updates.
- **Middleware Support:** Intercept and customize state updates.
- **State Persistence:** Automatically save and restore state from storage.
- **Time-Travel Debugging:** Undo and redo state changes with ease.
- **Computed Stores:** Derive state based on other stores.
- **DevTools Compatibility:** Monitor and debug state changes effectively.

---

## Installation

Install Pulsy via npm or yarn:

```bash
npm install pulsy
# or
yarn add pulsy
```

---

## Getting Started

### Basic Example

Create and use a store in a React component:

```tsx
import { createStore, usePulsy } from "pulsy";

// Create a store
createStore("counter", 0);

function Counter() {
  const [count, setCount] = usePulsy<number>("counter");

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount((prev) => prev + 1)}>Increment</button>
    </div>
  );
}
```

### Middleware Example

Add middleware to log state changes:

```tsx
createStore("exampleStore", 0, {
  middleware: [
    (nextValue, prevValue, name) => {
      console.log(`${name} changed from ${prevValue} to ${nextValue}`);
      return nextValue;
    },
  ],
});
```

### Persistence Example

Persist state with `localStorage`:

```tsx
createStore("persistentStore", { theme: "dark" }, {
  persist: {
    storage: localStorage,
    version: 1,
    migrate: (state, version) => {
      if (version < 1) {
        return { ...state, migrated: true };
      }
      return state;
    },
  },
});
```

### Time-Travel Debugging

Use undo and redo in your app:

```tsx
function CounterWithUndo() {
  const [count, setCount, undo, redo, history] = useTimeTravel<number>("counter");

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount((prev) => prev + 1)}>Increment</button>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
      <p>History: {JSON.stringify(history)}</p>
    </div>
  );
}
```

### Computed Stores

Create a store that derives its value from others:

```tsx
createStore("price", 100);
createStore("quantity", 2);

createComputedStore("totalCost", () => {
  const price = getStoreValue<number>("price");
  const quantity = getStoreValue<number>("quantity");
  return price * quantity;
}, ["price", "quantity"]);
```

---

## API Reference

### Core Functions

#### `createStore`
Creates a new store.

```ts
function createStore<T>(
  name: string,
  initialValue: T,
  options?: {
    persist?: boolean | PersistenceOptions;
    middleware?: Middleware<T>[];
    memoize?: boolean;
  }
): void;
```

#### `usePulsy`
React hook to access and update a store.

```ts
function usePulsy<T>(name: string): [
  T, // Current value
  (newValue: T | ((prev: T) => T)) => Promise<void> // Setter
];
```

#### `useTimeTravel`
Manage state with undo/redo support.

```ts
function useTimeTravel<T>(name: string): [
  T,                                  // Current value
  (newValue: T | ((prev: T) => T)) => Promise<void>, // Setter
  () => void,                         // Undo
  () => void,                         // Redo
  T[]                                 // History
];
```

#### `createComputedStore`
Create a derived store.

```ts
function createComputedStore<T>(
  name: string,
  computeFn: () => T,
  dependencies: string[]
): void;
```

#### `configurePulsy`
Configure global settings for Pulsy.

```ts
function configurePulsy(config: PulsyConfig): void;
```

---

## Advanced Features

### Adding Middleware
Middleware functions can intercept and modify state updates.

```ts
addMiddleware("exampleStore", (nextValue, prevValue) => {
  if (nextValue < 0) {
    return 0; // Prevent negative values
  }
  return nextValue;
});
```

### Namespaced Stores
Use namespaces for modular state management.

```ts
const userNamespace = createNamespacedStore("user");
const setUser = userNamespace("info");
```

### Composing Stores
Combine multiple stores into one for centralized management.

```ts
composeStores("userProfile", {
  name: "userName",
  age: "userAge",
});
```

---

## Clearing Persisted Stores

Remove all persisted data:

```ts
clearPersistedStores(localStorage);
```

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/your-repo/pulsy).

---

Pulsy simplifies state management while providing advanced features to enhance your development workflow. Try it today!
``` 

Let me know if there’s anything else you’d like to add or modify!
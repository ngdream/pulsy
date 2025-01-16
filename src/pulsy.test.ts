import {
  configurePulsy,
  createStore,
  getStoreValue,
  setStoreValue,
  initializePulsy,
  clearPersistedStores,
  addMiddleware,
  createActions,
} from "./pulsy";
import { devTools } from "./devtools";

describe("Pulsy", () => {
  beforeEach(() => {
    // Clear all stores before each test
    clearPersistedStores();
    jest.clearAllMocks();
  });

  it("should configure Pulsy with given configuration", () => {
    const config = {
      enableDevTools: true,
      onStoreCreate: jest.fn(),
      onStoreUpdate: jest.fn(),
      persist: true,
      defaultMemoize: true,
    };

    configurePulsy(config);

    expect(devTools.log).toHaveBeenCalledWith(
      "Pulsy configured",
      "info",
      config
    );
  });

  it("should create a store and persist it", () => {
    const storeName = "testStore";
    const initialValue = { count: 0 };

    createStore(storeName, initialValue, { persist: true });

    const storeValue = getStoreValue(storeName);
    expect(storeValue).toEqual(initialValue);
    expect(localStorage.getItem(`pulsy_${storeName}`)).toBe(
      JSON.stringify({ value: initialValue, version: 1 })
    );
  });

  it("should retrieve a persisted store", () => {
    const storeName = "testStore";
    const initialValue = { count: 0 };
    localStorage.setItem(
      `pulsy_${storeName}`,
      JSON.stringify({ value: initialValue, version: 1 })
    );

    createStore(storeName, initialValue, { persist: true });

    const storeValue = getStoreValue(storeName);
    expect(storeValue).toEqual(initialValue);
  });

  it("should update a store value and persist it", async () => {
    const storeName = "testStore";
    const initialValue = { count: 0 };

    createStore(storeName, initialValue, { persist: true });

    await setStoreValue(storeName, { count: 1 });

    const storeValue = getStoreValue(storeName);
    expect(storeValue).toEqual({ count: 1 });
    expect(localStorage.getItem(`pulsy_${storeName}`)).toBe(
      JSON.stringify({ value: { count: 1 }, version: 1 })
    );
  });

  it("should initialize multiple stores", () => {
    const storeConfigs = {
      store1: { count: 0 },
      store2: { count: 1 },
    };

    initializePulsy(storeConfigs);

    expect(getStoreValue("store1")).toEqual({ count: 0 });
    expect(getStoreValue("store2")).toEqual({ count: 1 });
  });

  it("should clear all persisted stores", () => {
    const storeName = "testStore";
    const initialValue = { count: 0 };

    createStore(storeName, initialValue, { persist: true });
    clearPersistedStores();

    expect(localStorage.getItem(`pulsy_${storeName}`)).toBeNull();
  });

  it("should add middleware to a store", async () => {
    const storeName = "testStore";
    const initialValue = { count: 0 };
    const middleware = jest.fn((nextValue) => nextValue);

    createStore(storeName, initialValue);
    addMiddleware(storeName, middleware);

    await setStoreValue(storeName, { count: 1 });

    expect(middleware).toHaveBeenCalledWith(
      { count: 1 },
      { count: 0 },
      storeName
    );
  });

  it("should create actions for a store", () => {
    const storeName = "testStore";
    const initialValue = { count: 0 };

    createStore(storeName, initialValue);

    const actionHandlers = {
      increment: (state) => ({ ...state, count: state.count + 1 }),
      decrement: (state) => ({ ...state, count: state.count - 1 }),
    };

    const actions = createActions(storeName, actionHandlers);

    actions.increment();
    expect(getStoreValue(storeName)).toEqual({ count: 1 });

    actions.decrement();
    expect(getStoreValue(storeName)).toEqual({ count: 0 });
  });
});

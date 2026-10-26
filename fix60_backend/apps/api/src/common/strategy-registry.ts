/** Named implementations of one integration (payments, storage, push). */
export interface StrategyRegistry<T> {
  register: (name: string, implementation: T) => void;
  get: (name: string) => T;
  names: () => string[];
}

/** Creates a registry; `get` throws for unknown names so misconfiguration fails at boot. */
export function createStrategyRegistry<T>(category: string): StrategyRegistry<T> {
  const implementations = new Map<string, T>();
  return {
    register: (name, implementation) => {
      implementations.set(name, implementation);
    },
    get: (name) => {
      const implementation = implementations.get(name);
      if (!implementation) {
        throw new Error(`No ${category} strategy registered as "${name}"`);
      }
      return implementation;
    },
    names: () => [...implementations.keys()],
  };
}

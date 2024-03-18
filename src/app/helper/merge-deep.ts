function keys<T extends object>(object: T): (keyof T)[] {
  return <any>Object.keys(object);
}

export function mergeDeep<T extends object>(source1: T, source2: T, ...sources: T[]): T {
  let allSources: T[] = [source1, source2, ...sources];

  const merged: Partial<T> = {};

  while (allSources.length) {
    const current = allSources.shift()!;

    for (const key of keys(current)) {
      const value = current[key];
      if (typeof value === 'object' && !Array.isArray(value)) {
        (<any>merged[key]) = typeof merged[key] === 'undefined' ? value : mergeDeep(<any>merged[key], value);
      } else if (Array.isArray(value)) {
        (<any>merged[key]) = typeof merged[key] === 'undefined' ? value : [...<any[]>merged[key], ...value];
      } else {
        merged[key] = value;
      }
    }
  }

  return <T>merged;
}

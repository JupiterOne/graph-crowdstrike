export class Total {
  private cache: Record<string, number> = {};

  setValue(key: string, value: number | undefined) {
    if (
      key !== undefined &&
      value !== undefined &&
      this.cache[key] === undefined
    ) {
      this.cache[key] = value;
    }
  }

  getValue(key: string) {
    return this.cache[key];
  }
}


export interface StatsHolder {
  /**
   * Adds a value to the bucket
   * @param value The value to add to the bucket
   * @param timestamp the timestamp associated with the value in milliseconds since epoch (see Date.valueOf())
   */
  addValue(value: number, timestamp?: number),

  getAverage(): number,
  getMinValue(): number,
  getMaxValue(): number,
  getNumValues(): number,
  getLastValue(): number,
}

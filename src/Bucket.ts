import { StatsHolder } from './StatsHolder';

export class Bucket implements StatsHolder {
  private acum = 0;
  private lastValue: number;
  private lastTimestamp: number;
  private maxValue: number;
  private minValue: number;
  private numValues = 0;

  constructor(private startTimestamp: number, private bucketDuration: number, startValue?: number) {
    this.lastTimestamp = startTimestamp;
    if (startValue !== undefined) {
      this.addValue(startValue, startTimestamp);
    }
  }
  /**
   * Adds a value to the bucket
   * @param value The value to add to the bucket
   * @param timestamp the timestamp associated with the value in milliseconds since epoch (see Date.valueOf())
   */
  addValue(value: number, timestamp?: number) {
    const effectiveTimestamp = timestamp === undefined ? new Date().valueOf() : timestamp;
    if ((effectiveTimestamp < this.startTimestamp) || (effectiveTimestamp > (this.startTimestamp + this.bucketDuration))) {
      throw new Error(`Timestamp out of range of bucket (start: ${this.startTimestamp}, duration: ${this.bucketDuration}, timestamp: ${effectiveTimestamp}`);
    }
    if (effectiveTimestamp < this.lastTimestamp) {
      throw new Error(`Can't go back in time, last timestamp was ${this.lastTimestamp} and current timestamp is ${effectiveTimestamp}`);
    }
    if (this.numValues === 0) {
      // It's the first metric
      this.lastTimestamp = effectiveTimestamp;
      this.lastValue = value;
      this.maxValue = value;
      this.minValue = value;
      this.acum = value * (effectiveTimestamp - this.startTimestamp);
    } else {
      // There's already another value
      if (effectiveTimestamp > this.lastTimestamp) {
        this.acum += this.lastValue * (effectiveTimestamp - this.lastTimestamp);
      }
      if (value > this.maxValue || (effectiveTimestamp === this.startTimestamp && this.numValues === 1)) {
        this.maxValue = value;
      }
      if (value < this.minValue || (effectiveTimestamp === this.startTimestamp && this.numValues === 1)) {
        this.minValue = value;
      }
      this.lastValue = value;
      this.lastTimestamp = effectiveTimestamp;
    }
    this.numValues++;
  }
  getAverage(): number {
    if (this.numValues === 0) {
      return undefined;
    }
    if (this.numValues === 1) {
      return this.lastValue;
    }
    return (this.acum + (this.startTimestamp + this.bucketDuration - this.lastTimestamp) * this.lastValue) / this.bucketDuration;
  }
  getMinValue(): number {
    return this.minValue;
  }
  getMaxValue(): number {
    return this.maxValue;
  }
  getNumValues(): number {
    return this.numValues;
  }
  getLastValue(): number {
    return this.lastValue;
  }
}

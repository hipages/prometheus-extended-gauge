import { Gauge, GaugeConfiguration, labelValues } from 'prom-client';
import { BucketedCircularBuffer } from './BucketedCircularBuffer';

export interface ExtendedGaugeConfiguration extends GaugeConfiguration {
  bucketSizeMillis: number,
  numBuckets: number,
  average: boolean,
  max: boolean,
  min: boolean,
}

/**
 * A gauge is a metric that represents a single numerical value that can arbitrarily go up and down.
 */
export class ExtendedGauge {
  config: ExtendedGaugeConfiguration;
  mainGauge: Gauge;
  averageGauge: Gauge;
  maxGauge: Gauge;
  minGauge: Gauge;
  currentValues: {[key: string]: BucketedCircularBuffer} = {};

  /**
   * @param configuration Configuration when creating a Gauge metric. Name and Help is mandatory
   */
  constructor(configuration: ExtendedGaugeConfiguration);

  /**
   * @param name The name of the metric
   * @param help Help description
   * @param labels Label keys
   * @param bucketSizeMillis The number of millis in a bucket
   * @param numBuckets The number of buckets to keep
   * @param average Whether to keep a per-bucket average
   * @param max Whether to keep a per-bucket max
   * @param min Whether to keep a per-bucket min
   * @deprecated
   */
  constructor(name: string, help: string, labels?: string[], bucketSizeMillis?: number, numBuckets?: number, average?: boolean, max?: boolean, min?: boolean);

  constructor(first: ExtendedGaugeConfiguration | string, help?: string, labelNames?: string[], bucketSizeMillis = 1000, numBuckets = 60, average = false, max = false, min = false) {
    this.config = (typeof first === 'string') ? {
      name: first,
      help,
      labelNames,
      average,
      max,
      min,
      bucketSizeMillis,
      numBuckets,
    } : first;
    this.mainGauge = new Gauge(this.config);
    if (this.config.average) {
      this.averageGauge = new Gauge({name: `${this.config.name}_avg`, help: `${this.config.name} (Moving time window Average)`, labelNames: this.config.labelNames, registers: this.config.registers});
    }
    if (this.config.max) {
      this.maxGauge = new Gauge({name: `${this.config.name}_max`, help: `${this.config.name} (Moving time window Max)`, labelNames: this.config.labelNames, registers: this.config.registers});
    }
    if (this.config.min) {
      this.minGauge = new Gauge({name: `${this.config.name}_min`, help: `${this.config.name} (Moving time window Min)`, labelNames: this.config.labelNames, registers: this.config.registers});
    }
  }

  /**
   * Increment gauge for given labels
   * @param labels Object with label keys and values
   * @param value The value to increment with
   * @param timestamp Timestamp to associate the time series with
   */
  inc(labels: labelValues, value?: number, timestamp?: number | Date): void;

  /**
   * Increment gauge
   * @param value The value to increment with
   * @param timestamp Timestamp to associate the time series with
   */
  inc(value?: number, timestamp?: number | Date): void;

  inc(first: any, second?: any, third?: any): void {
    const labels = (typeof first === 'object') ? first : {};
    const delta = ((typeof first === 'object') ? second : first) || 1;
    const timestamp = (typeof first === 'object') ? third : second;
    const hash = hashObject(labels);
    const currentValue = this.getLastValue(hash);
    this.setInternal(labels, hash, currentValue + delta, timestamp);
  }

  /**
   * Decrement gauge
   * @param labels Object with label keys and values
   * @param value Value to decrement with
   * @param timestamp Timestamp to associate the time series with
   */
  dec(labels: labelValues, value?: number, timestamp?: number | Date): void;

  /**
   * Decrement gauge
   * @param value The value to decrement with
   * @param timestamp Timestamp to associate the time series with
   */
  dec(value?: number, timestamp?: number | Date): void;

  dec(first: any, second?: any, third?: any): void {
    const labels = (typeof first === 'object') ? first : {};
    const delta = ((typeof first === 'object') ? second : first) || 1;
    const timestamp = (typeof first === 'object') ? third : second;
    const hash = hashObject(labels);
    const currentValue = this.getLastValue(hash);
    this.setInternal(labels, hash, currentValue - delta, timestamp);
  }

  private getLastValue(hash: string) {
    if (this.currentValues[hash]) {
      const lastValue = this.currentValues[hash].getLastValue();
      return lastValue || 0;
    }
    return 0;
  }

  /**
   * Set gauge value for labels
   * @param labels Object with label keys and values
   * @param value The value to set
   * @param timestamp Timestamp to associate the time series with
   */
  set(labels: labelValues, value: number, timestamp?: number | Date): void;

  /**
   * Set gauge value
   * @param value The value to set
   * @param timestamp Timestamp to associate the time series with
   */
  set(value: number, timestamp?: number | Date): void;

  set(first: any, second?: any, third?: any): void {
    const labels = (typeof first === 'object') ? first : {};
    const value = ((typeof first === 'object') ? second : first) || 1;
    const timestamp = (typeof first === 'object') ? third : second;
    const hash = hashObject(labels);
    this.setInternal(labels, hash, value, timestamp);
  }

  setInternal(labels: labelValues, labelHash: string, value: number, timestamp?: number | Date): void {
    this.mainGauge.set(labels, value, timestamp);
    const effectiveTimestamp = this.getTimestampValue(timestamp);
    if (!this.currentValues[labelHash]) {
      this.currentValues[labelHash] = new  BucketedCircularBuffer(this.config.bucketSizeMillis, this.config.numBuckets, effectiveTimestamp);
    }
    const bucket = this.currentValues[labelHash];
    bucket.addValue(value, effectiveTimestamp);
    if (this.averageGauge) {
      this.averageGauge.set(labels, bucket.getAverage(), timestamp);
    }
    if (this.maxGauge) {
      this.maxGauge.set(labels, bucket.getMaxValue(), timestamp);
    }
    if (this.minGauge) {
      this.minGauge.set(labels, bucket.getMinValue(), timestamp);
    }
  }

  private getTimestampValue(timestamp: number | Date): number {
    if (timestamp === undefined) {
      return undefined;
    }
    if (timestamp instanceof Date) {
      return timestamp.valueOf();
    }
    return timestamp;
  }

  /**
   * Set gauge value to current epoch time in ms
   * @param labels Object with label keys and values
   */
  setToCurrentTime(labels?: labelValues): void {
    const now = Date.now() / 1000;
    if (labels === undefined) {
      this.set(now);
    } else {
      this.set(labels, now);
    }
  }

  /**
   * Start a timer where the gauges value will be the duration in seconds
   * @param labels Object with label keys and values
   * @return Function to invoke when timer should be stopped
   */
  startTimer(labels?: labelValues): (labels?: labelValues) => void {
    const start = process.hrtime();
    return (endLabels) => {
      const delta = process.hrtime(start);
      this.set(
        {...labels, ...endLabels},
        delta[0] + delta[1] / 1e9,
      );
    };
  }

  /**
   * Return the child for given labels
   * @param values Label values
   * @return Configured gauge with given labels
   */
  labels(...values: string[]): ExtendedGaugeInternal {
    return new ExtendedGaugeInternal(this, toLabelValues(this.config.labelNames, values));
  }
}

function toLabelValues(labelNames: string[], values: string[]): labelValues {
  if (labelNames.length !== values.length) {
    throw new Error('Number of label names and values mismatch');
  }
  const resp = {};
  labelNames.forEach((name, idx) => resp[name] = values[idx]);
  return resp;
}

export class ExtendedGaugeInternal {
  constructor(private parent: ExtendedGauge, private labels: labelValues) {}

  /**
   * Increment gauge with value
   * @param value The value to increment with
   * @param timestamp Timestamp to associate the time series with
   */
  inc(value?: number, timestamp?: number | Date): void {
    this.parent.inc(this.labels, value, timestamp);
  }

  /**
   * Decrement with value
   * @param value The value to decrement with
   * @param timestamp Timestamp to associate the time series with
   */
  dec(value?: number, timestamp?: number | Date): void {
    this.parent.dec(this.labels, value, timestamp);
  }

  /**
   * Set gauges value
   * @param value The value to set
   * @param timestamp Timestamp to associate the time series with
   */
  set(value: number, timestamp?: number | Date): void {
    this.parent.set(this.labels, value, timestamp);
  }

  /**
   * Set gauge value to current epoch time in ms
   */
  setToCurrentTime(): void {
    this.parent.setToCurrentTime(this.labels);
  }

  /**
   * Start a timer where the gauges value will be the duration in seconds
   * @return Function to invoke when timer should be stopped
   */
  startTimer(): (labels?: labelValues) => void {
    return this.parent.startTimer(this.labels);
  }
}

function hashObject(labels) {
  let keys = Object.keys(labels);
  if (keys.length === 0) {
    return '';
  }
  if (keys.length > 1) {
    keys = keys.sort(); // need consistency across calls
  }
  return keys.map((key, i) => `${key}:${labels[key]}`).join(',');
}

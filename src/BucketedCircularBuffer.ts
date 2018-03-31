import { Bucket } from './Bucket';
import { StatsHolder } from './StatsHolder';

export class BucketedCircularBuffer implements StatsHolder {

  currentTimestamp;
  currentStep = -1;
  currentBucketIndex = -1;
  currentBucket: Bucket;

  buckets: Bucket[] = [];

  /**
   * Creates a new BucketedCircularBuffer
   * @param stepSizeMillis number of millis in a bucket (Default: 1024)
   * @param numBuckets number of buckets to keep (Default: 64)
   * @param startTimestamp The initial timestamp to use for the first bucket
   */
  constructor(private stepSizeMillis = 1024, private numBuckets = 64, startTimestamp?: number) {
    this.moveToTimestamp(startTimestamp === undefined ? new Date().valueOf() : startTimestamp);
  }
  private calcStepFromTimestamp(timestamp: number): number {
    if (this.stepSizeMillis === 1024) {
      // tslint:disable-next-line:no-bitwise
      return timestamp >> 10;
    }
    return Math.floor(timestamp / this.stepSizeMillis);
  }
  private calcBucketIndexFromStep(step: number): number {
    if (this.numBuckets === 64) {
      // tslint:disable-next-line:no-bitwise
      return step & 63;
    }
    return step % this.numBuckets;
  }
  private moveToTimestamp(timestamp: number) {
    if (timestamp < this.currentTimestamp) {
      throw new Error(`Can't move back in time, last seen timestamp is ${this.currentTimestamp} and given timestamp is ${timestamp}`);
    }
    this.currentTimestamp = timestamp;
    const bucketStep = this.calcStepFromTimestamp(timestamp);
    const stepsMoved = bucketStep - this.currentStep;
    if (stepsMoved === 0) {
      // Nothing to do, we're still in the same bucketStep
      return;
    }
    // We need to move to a new bucket
    const lastValue = this.currentBucket ? this.currentBucket.getLastValue() : undefined;

    if (stepsMoved === 1 || !this.currentBucket) {
      // Most probable case after no move for a high traffic one

      this.currentStep = bucketStep;
      this.currentBucketIndex = this.calcBucketIndexFromStep(this.currentStep);
      this.currentBucket = new Bucket(bucketStep * this.stepSizeMillis, this.stepSizeMillis, lastValue);
      this.buckets[this.currentBucketIndex] = this.currentBucket;
    } else {
      if (stepsMoved >= this.numBuckets) {
        // We've moved more buckets than we keep. If there's a lastValue we should fill the buckets array with buckets of that value so that the moving average is right
        if (lastValue !== undefined) {
          for (let i = 0; i < this.numBuckets; i++) {
            this.buckets[i] = new Bucket(0, this.stepSizeMillis, lastValue);
            // Using 0 as the start timestamp doesn't matter becuase we're not going to add values to these buckets
          }
        } else {
          // Just wipe the array, no point in adding buckets that will have no values ever
          this.buckets = [];
        }
      } else {
        // We've moved a few buckets, but not enough to remove the current one... let's remove anything between that one (current) and bucketStep.
        for (let i = this.currentStep + 1; i < bucketStep; i++) {
          this.buckets[i % this.numBuckets] = (lastValue === undefined) ? undefined : new Bucket(0, this.stepSizeMillis, lastValue);
        }
      }
      this.currentStep = bucketStep;
      this.currentBucketIndex = this.calcBucketIndexFromStep(this.currentStep);
      this.currentBucket = new Bucket(bucketStep * this.stepSizeMillis, this.stepSizeMillis, lastValue);
      this.buckets[this.currentBucketIndex] = this.currentBucket;
    }
  }
  addValue(value: number, timestamp?: number) {
    const effectiveTimestamp = timestamp === undefined ? new Date().valueOf() : timestamp;
    this.moveToTimestamp(effectiveTimestamp);
    this.currentBucket.addValue(value, effectiveTimestamp);
  }
  getAverage(): number {
    const resp = this.buckets.reduce((acum: {sum: number, count: number}, bucket) => {
      if (bucket) {
        const average = bucket.getAverage();
        if (average !== undefined) {
          acum.sum += average;
          acum.count++;
        }
      }
      return acum;
    }, {sum: 0, count: 0});
    return resp.count > 0 ? resp.sum / resp.count : undefined;
  }
  getMinValue(): number {
    return this.reduceUndefinedAware(Math.min, Bucket.prototype.getMinValue);
  }
  getMaxValue(): number {
    return this.reduceUndefinedAware(Math.max, Bucket.prototype.getMaxValue);
  }
  getNumValues(): number {
    return this.reduceUndefinedAware((a, b) => a + b, Bucket.prototype.getNumValues);
  }
  getLastValue(): number {
    return this.currentBucket.getLastValue();
  }

  private reduceUndefinedAware(aggregatorFunc: (value1: number, value2: number) => number, extractorFunc: () => number): number {
    return this.buckets.reduce((prev: number, bucket) => {
      if (!bucket) {
        return prev;
      }
      const bucketMin: number = extractorFunc.call(bucket);
      if (bucketMin === undefined) {
        return prev;
      }
      if (prev === undefined) {
        return bucketMin;
      } else {
        return aggregatorFunc(prev, bucketMin);
      }
    }, undefined);
  }
}

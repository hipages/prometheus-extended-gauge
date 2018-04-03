import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import * as must from 'must';
import { BucketedCircularBuffer } from '../src/BucketedCircularBuffer';

async function sleep(ms) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

suite('BucketedCircularBuffer', () => {
  suite('Empty Bucket', () => {
    test('An empty bucket returns 0 num values', () => {
      const bucket = new BucketedCircularBuffer(1000, 10, 5000);
      bucket.getNumValues().must.be.equal(0);
    });
    test('An empty bucket returns an undefined max', () => {
      const bucket = new BucketedCircularBuffer(1000, 10, 5000);
      must(bucket.getMaxValue()).be.undefined();
    });
    test('An empty bucket returns an undefined min', () => {
      const bucket = new BucketedCircularBuffer(1000, 10, 5000);
      must(bucket.getMinValue()).be.undefined();
    });
    test('An empty bucket returns an undefined average', () => {
      const bucket = new BucketedCircularBuffer(1000, 10, 5000);
      must(bucket.getAverage()).be.undefined();
    });
    test('An empty bucket returns an undefined last value', () => {
      const bucket = new BucketedCircularBuffer(1000, 10, 5000);
      must(bucket.getLastValue()).be.undefined();
    });
  });
  suite('Time continuum', () => {
    test('Trying to add a value before the startTime throws an error', () => {
      const bucket = new BucketedCircularBuffer(1000, 10, 5000);
      try {
        bucket.addValue(0, 1);
        true.must.be.false();
      } catch (e) {
        e.must.be.an.error('Can\'t move back in time, last seen timestamp is 5000 and given timestamp is 1');
      }
    });
  });
  suite('Average', () => {
    test('Series 1', () => {
      const bucket = new BucketedCircularBuffer(100, 5, 1000);
      bucket.addValue(22, 1010);
      bucket.addValue(18, 1013);
      bucket.addValue(23, 1100);
      bucket.addValue(80, 1200);
      bucket.addValue(20, 1210);
      bucket.addValue(32, 1410);
      const expected = (13 * 22 + 87 * 18 + 100 * 23 + 10 * 80 + 200 * 20 + 90 * 32) / 500;
      Math.abs(bucket.getAverage() - expected).must.be.below(0.000001);
    });
    test('Series 2', () => {
      const bucket = new BucketedCircularBuffer(100, 5, 1000);
      bucket.addValue(22, 1010);
      bucket.addValue(18, 1013);
      bucket.addValue(23, 1100);
      bucket.addValue(0, 1200);
      bucket.addValue(80, 1200);
      bucket.addValue(100, 1210);
      bucket.addValue(20, 1210);
      bucket.addValue(32, 1410);
      const expected = (13 * 22 + 87 * 18 + 100 * 23 + 10 * 80 + 200 * 20 + 90 * 32) / 500;
      Math.abs(bucket.getAverage() - expected).must.be.below(0.000001);
    });
  });
  suite('Max', () => {
    test('Series 1', () => {
      const bucket = new BucketedCircularBuffer(100, 5, 1000);
      bucket.addValue(22, 1010);
      bucket.addValue(18, 1013);
      bucket.addValue(23, 1100);
      bucket.addValue(80, 1200);
      bucket.addValue(20, 1210);
      bucket.addValue(32, 1410);
      bucket.getMaxValue().must.equal(80);
    });
    test('Series 2', () => {
      const bucket = new BucketedCircularBuffer(100, 5, 1000);
      bucket.addValue(22, 1010);
      bucket.addValue(18, 1013);
      bucket.addValue(23, 1100);
      bucket.addValue(0, 1200);
      bucket.addValue(80, 1200);
      bucket.addValue(100, 1210);
      bucket.addValue(20, 1210);
      bucket.addValue(32, 1410);
      bucket.getMaxValue().must.equal(100);
    });
  });
  suite('Min', () => {
    test('Series 1', () => {
      const bucket = new BucketedCircularBuffer(100, 5, 1000);
      bucket.addValue(22, 1010);
      bucket.addValue(18, 1013);
      bucket.addValue(23, 1100);
      bucket.addValue(80, 1200);
      bucket.addValue(20, 1210);
      bucket.addValue(32, 1410);
      bucket.getMinValue().must.equal(18);
    });
    test('Series 2', () => {
      const bucket = new BucketedCircularBuffer(100, 5, 1000);
      bucket.addValue(22, 1010);
      bucket.addValue(18, 1013);
      bucket.addValue(23, 1100);
      bucket.addValue(0, 1200);
      bucket.addValue(80, 1200);
      bucket.addValue(100, 1210);
      bucket.addValue(20, 1210);
      bucket.addValue(32, 1410);
      bucket.getMinValue().must.equal(0);
    });
    test('Series 3', () => {
      const bucket = new BucketedCircularBuffer(100, 5, 1000);
      bucket.addValue(1, 1010);
      bucket.addValue(18, 1013);
      bucket.addValue(23, 1100);
      bucket.addValue(80, 1200);
      bucket.addValue(20, 1210);
      bucket.addValue(32, 1410);
      bucket.addValue(32, 1510);
      bucket.getMinValue().must.equal(20);
    });
  });
  suite('Real timestamps', () => {
    test('Can add stuff in real time', async () => {
      const now = new Date().valueOf();
      const bucket = new BucketedCircularBuffer(100, 5, now);
      await sleep(1);
      bucket.addValue(30);
      bucket.getMinValue().must.equal(30);
      bucket.getMaxValue().must.equal(30);
      await sleep(100);
      bucket.addValue(40);
      bucket.getMinValue().must.equal(30);
      bucket.getMaxValue().must.equal(40);
    });
  });
});

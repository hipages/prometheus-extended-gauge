import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import * as must from 'must';
import { Bucket } from '../src/Bucket';

suite('Bucket', () => {
  suite('Empty Bucket', () => {
    test('An empty bucket returns 0 num values', () => {
      const bucket = new Bucket(1000, 1000);
      bucket.getNumValues().must.be.equal(0);
    });
    test('An empty bucket returns an undefined max', () => {
      const bucket = new Bucket(1000, 1000);
      must(bucket.getMaxValue()).be.undefined();
    });
    test('An empty bucket returns an undefined min', () => {
      const bucket = new Bucket(1000, 1000);
      must(bucket.getMinValue()).be.undefined();
    });
    test('An empty bucket returns an undefined average', () => {
      const bucket = new Bucket(1000, 1000);
      must(bucket.getAverage()).be.undefined();
    });
    test('An empty bucket returns an undefined last value', () => {
      const bucket = new Bucket(1000, 1000);
      must(bucket.getLastValue()).be.undefined();
    });
  });
  suite('Bucket with initial value', () => {
    test('A bucket with an initial value returns 1 num values', () => {
      const bucket = new Bucket(1000, 1000, 23);
      bucket.getNumValues().must.be.equal(1);
    });
    test('A bucket with an initial value returns the initial value as the max', () => {
      const bucket = new Bucket(1000, 1000, 23);
      bucket.getMaxValue().must.be.equal(23);
    });
    test('A bucket with an initial value returns the initial value as the min', () => {
      const bucket = new Bucket(1000, 1000, 23);
      bucket.getMinValue().must.be.equal(23);
    });
    test('A bucket with an initial value returns the initial value as the average', () => {
      const bucket = new Bucket(1000, 1000, 23);
      bucket.getAverage().must.be.equal(23);
    });
    test('A bucket with an initial value returns the initial value as the last value', () => {
      const bucket = new Bucket(1000, 1000, 23);
      bucket.getLastValue().must.be.equal(23);
    });
  });
  suite('Time continuum', () => {
    test('Trying to add a value before the startTime throws an error', () => {
      const bucket = new Bucket(1000, 1000, 23);
      try {
        bucket.addValue(0, 1);
        true.must.be.false();
      } catch (e) {
        e.must.be.an.error('Timestamp out of range of bucket (start: 1000, duration: 1000, timestamp: 1');
      }
    });
    test('Trying to add a value after the startTime + bucketDuration throws an error', () => {
      const bucket = new Bucket(1000, 1000, 23);
      try {
        bucket.addValue(0, 2001);
        true.must.be.false();
      } catch (e) {
        e.must.be.an.error('Timestamp out of range of bucket (start: 1000, duration: 1000, timestamp: 2001');
      }
    });
    test('Trying to add a value in a timestamp earlier than the last seen timestamp throws an error', () => {
      const bucket = new Bucket(1000, 1000, 23);
      bucket.addValue(0, 1005);
      try {
        bucket.addValue(0, 1003);
        true.must.be.false();
      } catch (e) {
        e.must.be.an.error('Can\'t go back in time, last timestamp was 1005 and current timestamp is 1003');
      }
    });
    test('Adding more than one value in the same timestamp overrides the previous value', () => {
      const bucket = new Bucket(1000, 1000, 20);
      bucket.addValue(10, 1500);
      bucket.getAverage().must.equal(15);
      bucket.getLastValue().must.equal(10);
      bucket.addValue(30, 1500);
      bucket.getAverage().must.equal(25);
      bucket.getLastValue().must.equal(30);
    });
  });
  suite('Average', () => {
    test('Series 1', () => {
      const bucket = new Bucket(1000, 1000, 23);
      bucket.addValue(22, 1010);
      bucket.addValue(18, 1013);
      bucket.addValue(23, 1100);
      bucket.addValue(80, 1200);
      bucket.addValue(20, 1210);
      bucket.addValue(32, 1410);
      bucket.getAverage().must.equal((10 * 23 + 3 * 22 + 87 * 18 + 100 * 23 + 10 * 80 + 200 * 20 + 590 * 32) / 1000);
    });
    test('Series 2', () => {
      const bucket = new Bucket(1000, 1000, 23);
      bucket.addValue(22, 1010);
      bucket.addValue(18, 1013);
      bucket.addValue(23, 1100);
      bucket.addValue(0, 1200);
      bucket.addValue(80, 1200);
      bucket.addValue(100, 1210);
      bucket.addValue(20, 1210);
      bucket.addValue(32, 1410);
      bucket.getAverage().must.equal((10 * 23 + 3 * 22 + 87 * 18 + 100 * 23 + 10 * 80 + 200 * 20 + 590 * 32) / 1000);
    });
    test('Series 3', () => {
      const bucket = new Bucket(1000, 1000);
      bucket.addValue(22, 1010);
      bucket.addValue(18, 1013);
      bucket.addValue(23, 1100);
      bucket.addValue(80, 1200);
      bucket.addValue(20, 1210);
      bucket.addValue(32, 1410);
      bucket.getAverage().must.equal((13 * 22 + 87 * 18 + 100 * 23 + 10 * 80 + 200 * 20 + 590 * 32) / 1000);
    });
  });
  suite('Max', () => {
    test('Overriding first milli value ', () => {
      const bucket = new Bucket(1000, 1000, 23);
      bucket.addValue(10, 1000);
      bucket.getMaxValue().must.equal(10);
    });
    test('Series 1', () => {
      const bucket = new Bucket(1000, 1000, 23);
      bucket.addValue(22, 1010);
      bucket.addValue(18, 1013);
      bucket.addValue(23, 1100);
      bucket.addValue(80, 1200);
      bucket.addValue(20, 1210);
      bucket.addValue(32, 1410);
      bucket.getMaxValue().must.equal(80);
    });
    test('Series 2', () => {
      const bucket = new Bucket(1000, 1000, 23);
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
    test('Overriding first milli value ', () => {
      const bucket = new Bucket(1000, 1000, 23);
      bucket.addValue(30, 1000);
      bucket.getMinValue().must.equal(30);
    });
    test('Series 1', () => {
      const bucket = new Bucket(1000, 1000, 23);
      bucket.addValue(22, 1010);
      bucket.addValue(18, 1013);
      bucket.addValue(23, 1100);
      bucket.addValue(80, 1200);
      bucket.addValue(20, 1210);
      bucket.addValue(32, 1410);
      bucket.getMinValue().must.equal(18);
    });
    test('Series 2', () => {
      const bucket = new Bucket(1000, 1000, 23);
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
  });
});

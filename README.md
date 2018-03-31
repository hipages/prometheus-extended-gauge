# prometheus-gauge-extras

[![CircleCI](https://circleci.com/gh/hipages/prometheus-gauge-extras/tree/master.svg?style=svg)](https://circleci.com/gh/hipages/prometheus-gauge-extras/tree/master)
[![codecov](https://codecov.io/gh/hipages/prometheus-gauge-extras/branch/master/graph/badge.svg)](https://codecov.io/gh/hipages/prometheus-gauge-extras)

## What's the problem this helps solve?

prometheus, as well as many other metrics collection frameworks, offers some basic constructs for gathering stats: Counters, Gauges, Histograms and Summaries.

The problem is that Gauges are sampled every time that Prometheus scrapes the stats, but there may be a lot of activity that is missed. Especially if the gauge changes a lot (e.g. # of active connections in a connection pool).

In this case, there may be spikes that are overlooked in the sampling. This is where the `ExtendedGauge` comes in handy. It is a drop-in replacement for a normal Prometheus Gauge with the exception that it keeps a moving time window that you can configure and it can expose the max, min and average value of the gauge in that moving time window (as Gauges).

The moving time window is implemented using a circular buffer where you have a certain number of buckets, each for a period of time. So, for example, you could specify to have 60 buckets of 1000ms each to have a moving time window of 1 minute with a granularity of 1 second.

You can configure the moving time window by setting:
* `bucketSizeMillis`: The size of a bucket in millisencods (defaults to 1024ms)
* `numBuckets`: The number of buckets to keep


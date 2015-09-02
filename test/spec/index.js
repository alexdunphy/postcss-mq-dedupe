/* eslint-env node, mocha */

'use strict';

var expect = require('chai').expect;
var mqDedupe = require('./../../');

describe('postcss-mq-dedupe', function() {
  it('should be defined as a function', function() {
    expect(mqDedupe).to.be.a('function');
  });
});

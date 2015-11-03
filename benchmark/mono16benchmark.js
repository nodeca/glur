#!/usr/bin/env node
/*eslint-env node */
/*eslint-disable no-console*/

'use strict';


var util      = require('util');
var Benchmark = require('benchmark');
var ansi      = require('ansi');
var cursor    = ansi(process.stdout);


var mono16    = require('../mono16');


var IMPLS = [ {
  name: 'glur-mono16',
  code: {
    run: function (data) {
      return mono16(data.buffer, data.width, data.height, data.radius);
    }
  }
} ];

var SAMPLES_SRC = [ {
  name: 'Big',
  width: 3200,
  height: 2500,
  radius: 50
} ];

var SAMPLES = [];


SAMPLES_SRC.forEach(function (sample) {
  var content = {};

  content.width  = sample.width;
  content.height = sample.height;
  content.radius = sample.radius;
  content.buffer = new Uint16Array(sample.width * sample.height);

  var title  = util.format('(%d bytes raw / [%dx%d]px)',
                           content.buffer.length, content.width, content.height);


  function onComplete() {
    cursor.write('\n');
  }


  var suite = new Benchmark.Suite(title, {
    onError: function (err) {
      console.log(err.target.error);
    },

    onStart: function onStart() {
      console.log('\nSample: %s %s', sample.name, title);
    },

    onComplete: onComplete
  });

  IMPLS.forEach(function (impl) {
    suite.add(impl.name, {

      onCycle: function onCycle(event) {
        cursor.horizontalAbsolute();
        cursor.eraseLine();
        cursor.write(' > ' + event.target);
      },

      onComplete: onComplete,

      defer: !!impl.code.async,

      fn: function (deferred) {
        if (impl.code.async) {
          impl.code.run(content, function() {
            deferred.resolve();
            return;
          });
        } else {
          impl.code.run(content);
          return;
        }
      }
    });
  });


  SAMPLES.push({
    name: sample.name,
    title: title,
    content: content,
    suite: suite
  });
});


function select(patterns) {
  var result = [];

  if (!(patterns instanceof Array)) {
    patterns = [ patterns ];
  }

  function checkName(name) {
    return patterns.length === 0 || patterns.some(function (regexp) {
      return regexp.test(name);
    });
  }

  SAMPLES.forEach(function (sample) {
    if (checkName(sample.name)) {
      result.push(sample);
    }
  });

  return result;
}


function run(files) {
  var selected = select(files);

  if (selected.length > 0) {
    console.log('Selected samples: (%d of %d)', selected.length, SAMPLES.length);
    selected.forEach(function (sample) {
      console.log(' > %s', sample.name);
    });
  } else {
    console.log('There isn\'t any sample matches any of these patterns: %s', util.inspect(files));
  }

  selected.forEach(function (sample) {
    sample.suite.run();
  });
}

module.exports.IMPLS             = IMPLS;
module.exports.SAMPLES           = SAMPLES;
module.exports.select            = select;
module.exports.run               = run;

run(process.argv.slice(2).map(function (source) {
  return new RegExp(source, 'i');
}));

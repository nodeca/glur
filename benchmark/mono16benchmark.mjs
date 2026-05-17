#!/usr/bin/env node

import util from 'util'
import Benchmark from 'benchmark'
import ansi from 'ansi'
import blurMono16 from '../lib/blur_mono16.mjs'

const cursor = ansi(process.stdout)

const IMPLS = [{
  name: 'glur-mono16',
  code: {
    run (data) {
      return blurMono16(data.buffer, data.width, data.height, data.radius)
    }
  }
}]

const SAMPLES_SRC = [{
  name: 'Big',
  width: 3200,
  height: 2500,
  radius: 50
}]

const SAMPLES = []

SAMPLES_SRC.forEach(function (sample) {
  const content = {}

  content.width = sample.width
  content.height = sample.height
  content.radius = sample.radius
  content.buffer = new Uint16Array(sample.width * sample.height)

  const title = util.format('(%d bytes raw / [%dx%d]px)',
    content.buffer.length, content.width, content.height)

  function onComplete () {
    cursor.write('\n')
  }

  const suite = new Benchmark.Suite(title, {
    onError (err) {
      console.log(err.target.error)
    },

    onStart: function onStart () {
      console.log('\nSample: %s %s', sample.name, title)
    },

    onComplete
  })

  IMPLS.forEach(function (impl) {
    suite.add(impl.name, {

      onCycle: function onCycle (event) {
        cursor.horizontalAbsolute()
        cursor.eraseLine()
        cursor.write(' > ' + event.target)
      },

      onComplete,

      defer: !!impl.code.async,

      fn (deferred) {
        if (impl.code.async) {
          impl.code.run(content, function () {
            deferred.resolve()
          })
        } else {
          impl.code.run(content)
        }
      }
    })
  })

  SAMPLES.push({
    name: sample.name,
    title,
    content,
    suite
  })
})

function select (patterns) {
  const result = []

  if (!(patterns instanceof Array)) {
    patterns = [patterns]
  }

  function checkName (name) {
    return patterns.length === 0 || patterns.some(function (regexp) {
      return regexp.test(name)
    })
  }

  SAMPLES.forEach(function (sample) {
    if (checkName(sample.name)) {
      result.push(sample)
    }
  })

  return result
}

function run (files) {
  const selected = select(files)

  if (selected.length > 0) {
    console.log('Selected samples: (%d of %d)', selected.length, SAMPLES.length)
    selected.forEach(function (sample) {
      console.log(' > %s', sample.name)
    })
  } else {
    console.log('There isn\'t any sample matches any of these patterns: %s', util.inspect(files))
  }

  selected.forEach(function (sample) {
    sample.suite.run()
  })
}

export { IMPLS, SAMPLES, select, run }

run(process.argv.slice(2).map(function (source) {
  return new RegExp(source, 'i')
}))

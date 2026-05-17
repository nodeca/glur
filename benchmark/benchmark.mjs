#!/usr/bin/env node

import path from 'path'
import fs from 'fs'
import util from 'util'
import { fileURLToPath, pathToFileURL } from 'url'
import Benchmark from 'benchmark'
import ansi from 'ansi'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const cursor = ansi(process.stdout)

const IMPLS_DIRECTORY = path.join(__dirname, 'implementations')
const IMPLS_PATHS = {}
const IMPLS = []

for (const name of fs.readdirSync(IMPLS_DIRECTORY).sort()) {
  const file = path.join(IMPLS_DIRECTORY, name, 'index.mjs')
  const code = await import(pathToFileURL(file).href)
  IMPLS_PATHS[name] = file
  IMPLS.push({ name, code })
}

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
  content.buffer = new Uint32Array(sample.width * sample.height)

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

export { IMPLS_DIRECTORY, IMPLS_PATHS, IMPLS, SAMPLES, select, run }

run(process.argv.slice(2).map(function (source) {
  return new RegExp(source, 'i')
}))

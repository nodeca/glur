!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.glur=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var glur = require('./lib/gauss');
var iir_gauss = require('./lib/iir_gauss');

////////////////////////////////////////////////////////////////////////////////
// API methods

var blurCanvas = function (canvas, radius, callback) {
  var ctx = canvas.getContext('2d');
  var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var src = imageData.data;

  var data32 = new Uint32Array(src.buffer);
  glur.blur32(data32, canvas.width, canvas.height, radius);

  ctx.putImageData(imageData, 0, 0);

  callback();
};

var fastBlurCanvas = function (canvas, radius, callback) {
  var ctx = canvas.getContext('2d');
  var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var src = imageData.data;

  var data32 = new Uint32Array(src.buffer);
  iir_gauss.blur32(data32, canvas.width, canvas.height, radius);

  ctx.putImageData(imageData, 0, 0);

  callback();
};

exports.blurCanvas = blurCanvas;
exports.fastBlurCanvas = fastBlurCanvas;
},{"./lib/gauss":2,"./lib/iir_gauss":3}],2:[function(require,module,exports){
'use strict';

var buildKernel = function (radius) {
  var rows = radius * 2 + 1;
  var kernel = new Float32Array(rows);
  var sigma = radius / 3;
  var sigma22 = 2 * sigma * sigma;
  var sigmaPi2 = 2 * Math.PI * sigma;

  var sqrtSigmaPi2 = Math.sqrt(sigmaPi2);
  var radius2 = radius * radius;
  var total = 0;
  var index = 0;
  var row, distance;
  for (row = -radius; row <= radius; row++) {
    distance = row * row;
    if (distance > radius2)
      kernel[index] = 0;
    else
      kernel[index] = Math.exp(-1 * (distance) / sigma22) / sqrtSigmaPi2;
    total += kernel[index];
    index++;
  }
  for (row = 0; rows < rows; row++) {
    kernel[row] /= total;
  }

  return kernel;
};

var convolve = function (src, out, kernel, width, height, radius) {
  var x, y, rgb, r, g, b, a, weight_sum, out_index, y_offset, col, f;

  for (y = 0; y < height; y++) {
    out_index = y;
    y_offset = y * width;
    for (x = 0; x < width; x++) {
      r = 0;
      g = 0;
      b = 0;
      a = 0;
      weight_sum = 0;
      for (col = -radius; col <= radius; col++) {
        f = kernel[radius + col];

        if (f != 0) {
          var ix = x + col;
          if (ix < 0) {
            ix = 0;
          } else if (ix >= width) {
            ix = width - 1;
          }
          rgb = src[y_offset + ix];

          a += f * ((rgb >> 24) & 0xff);
          r += f * ((rgb >> 16) & 0xff);
          g += f * ((rgb >> 8) & 0xff);
          b += f * (rgb & 0xff);
          weight_sum += f;
        }
      }
      a = (a / weight_sum | 0) & 0xff;
      r = (r / weight_sum | 0) & 0xff;
      g = (g / weight_sum | 0) & 0xff;
      b = (b / weight_sum | 0) & 0xff;
      out[out_index] = (a << 24) | (r << 16) | (g << 8) | b;
      out_index += height;
    }
  }
};

var blur32 = function (src, width, height, radius) {
  var out = new Uint32Array(width * height * 4);
  var kernel = buildKernel(radius);

  convolve(src, out, kernel, width, height, radius);
  convolve(out, src, kernel, height, width, radius);
};

exports.blur32 = blur32;

},{}],3:[function(require,module,exports){
var gaussCoef = function (sigma) {
  var sigma_inv_4 = sigma * sigma;
  sigma_inv_4 = 1.0 / (sigma_inv_4 * sigma_inv_4);

  var coef_A = sigma_inv_4 * (sigma * (sigma * (sigma * 1.1442707 + 0.0130625) - 0.7500910) + 0.2546730);
  var coef_W = sigma_inv_4 * (sigma * (sigma * (sigma * 1.3642870 + 0.0088755) - 0.3255340) + 0.3016210);
  var coef_B = sigma_inv_4 * (sigma * (sigma * (sigma * 1.2397166 - 0.0001644) - 0.6363580) - 0.0536068);

  var z0_abs = Math.exp(coef_A);

  var z0_real = z0_abs * Math.cos(coef_W);
  var z0_im = z0_abs * Math.sin(coef_W);
  var z2 = Math.exp(coef_B);

  var z0_abs_2 = z0_abs * z0_abs;

  var res = {
    a0: 0.0,
    a1: 0.0,
    a2: 0.0,
    b0: 0.0
  };
  res.a2 = 1.0 / (z2 * z0_abs_2);
  res.a0 = (z0_abs_2 + 2 * z0_real * z2) * res.a2;
  res.a1 = -(2 * z0_real + z2) * res.a2;

  res.b0 = 1.0 - (res.a0 + res.a1 + res.a2);

  return res;
};


var convolve32 = function (src, out, tmp, coeff, width, height) {
  var x, y, rgb, r, g, b, a, out_index, y_offset, x_offset;
  var r0, g0, b0, a0, r1, g1, b1, a1, r2, g2, b2, a2;

  var coeff_b0 = coeff.b0;
  var coeff_a0 = coeff.a0;
  var coeff_a1 = coeff.a1;
  var coeff_a2 = coeff.a2;

  console.time('convolve');
  for (y = 0; y < height; y++) {
    out_index = y + height * width - 1;
    y_offset = y * width;

    rgb = src[y_offset];
    a = (rgb >> 24) & 0xff;
    r = (rgb >> 16) & 0xff;
    g = (rgb >> 8) & 0xff;
    b = rgb & 0xff;

    a0 = a;
    r0 = r;
    g0 = g;
    b0 = b;

    a1 = a0;
    r1 = r0;
    g1 = g0;
    b1 = b0;

    a2 = a1;
    r2 = r1;
    g2 = g1;
    b2 = b1;

    x_offset = 0;
    for (x = 0; x < width; x++) {
      rgb = src[y_offset + x];
      a = (rgb >> 24) & 0xff;
      r = (rgb >> 16) & 0xff;
      g = (rgb >> 8) & 0xff;
      b = rgb & 0xff;

      a = coeff_b0 * a + (coeff_a0 * a0 + coeff_a1 * a1 + coeff_a2 * a2);
      r = coeff_b0 * r + (coeff_a0 * r0 + coeff_a1 * r1 + coeff_a2 * r2);
      g = coeff_b0 * g + (coeff_a0 * g0 + coeff_a1 * g1 + coeff_a2 * g2);
      b = coeff_b0 * b + (coeff_a0 * b0 + coeff_a1 * b1 + coeff_a2 * b2);

      a2 = a1;
      r2 = r1;
      g2 = g1;
      b2 = b1;

      a1 = a0;
      r1 = r0;
      g1 = g0;
      b1 = b0;

      a0 = a;
      r0 = r;
      g0 = g;
      b0 = b;

      tmp[x_offset] = a;
      tmp[x_offset + 1] = r;
      tmp[x_offset + 2] = g;
      tmp[x_offset + 3] = b;
      x_offset += 4;
    }

    a0 = a;
    r0 = r;
    g0 = g;
    b0 = b;

    a1 = a0;
    r1 = r0;
    g1 = g0;
    b1 = b0;

    a2 = a1;
    r2 = r1;
    g2 = g1;
    b2 = b1;

    for (x = width - 1; x >= 0; x--) {
      x_offset -= 4;
      a = tmp[x_offset];
      r = tmp[x_offset + 1];
      g = tmp[x_offset + 2];
      b = tmp[x_offset + 3];

      a = coeff_b0 * a + (coeff_a0 * a0 + coeff_a1 * a1 + coeff_a2 * a2);
      r = coeff_b0 * r + (coeff_a0 * r0 + coeff_a1 * r1 + coeff_a2 * r2);
      g = coeff_b0 * g + (coeff_a0 * g0 + coeff_a1 * g1 + coeff_a2 * g2);
      b = coeff_b0 * b + (coeff_a0 * b0 + coeff_a1 * b1 + coeff_a2 * b2);

      a2 = a1;
      r2 = r1;
      g2 = g1;
      b2 = b1;

      a1 = a0;
      r1 = r0;
      g1 = g0;
      b1 = b0;

      a0 = a;
      r0 = r;
      g0 = g;
      b0 = b;

      a = (a |0) & 0xff;
      r = (r |0) & 0xff;
      g = (g |0) & 0xff;
      b = (b |0) & 0xff;

      out_index -= height;
      out[out_index] = (a << 24) | (r << 16) | (g << 8) | b;
    }
  }
  console.timeEnd('convolve');
};


var blur32 = function (src, width, height, radius) {
  var out = new Uint32Array(width * height * 4);
  var tmp = new Float32Array(width * 4);

  var coeff = gaussCoef(radius);

  convolve32(src, out, tmp, coeff, width, height, radius);
  convolve32(out, src, tmp, coeff, height, width, radius);
};

exports.blur32 = blur32;
},{}]},{},[1])(1)
});
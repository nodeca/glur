'use strict';

var glur = require('./lib/glur');

////////////////////////////////////////////////////////////////////////////////
// API methods

var blurCanvas = function (canvas, radius, callback) {
  var ctx = canvas.getContext('2d');
  var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var src = imageData.data;

  var data32 = new Uint32Array(src.buffer);
  var res = glur.blur32(data32, canvas.width, canvas.height, radius);

  imageData.data.set(res);
  ctx.putImageData(imageData, 0, 0);

  callback();
};

exports.blurCanvas = blurCanvas;
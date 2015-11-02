'use strict';

var glur = require('../../../');

exports.run = function(data) {
  return glur(data.buffer, data.width, data.height, data.radius);
};

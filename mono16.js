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

  var a2 = 1.0 / (z2 * z0_abs_2),
      a0 = (z0_abs_2 + 2 * z0_real * z2) * a2,
      a1 = -(2 * z0_real + z2) * a2,
      b0 = 1.0 - (a0 + a1 + a2);

  return new Float32Array([ b0, a0, a1, a2 ]);
};


var convolveMono16 = function (src, out, tmp, coeff, width, height) {
  var x, y, out_index, y_offset, x_offset;
  var v, v0, v1, v2;

  var coeff_b0 = coeff[0];
  var coeff_a0 = coeff[1];
  var coeff_a1 = coeff[2];
  var coeff_a2 = coeff[3];

  for (y = 0; y < height; y++) {
    y_offset = y * width;

    v = src[y_offset];
    v0 = v;
    v1 = v0;
    v2 = v1;

    x_offset = 0;

    for (x = 0; x < width; x++) {
      v = src[y_offset + x];
      v = coeff_b0 * v + (coeff_a0 * v0 + coeff_a1 * v1 + coeff_a2 * v2);

      v2 = v1;
      v1 = v0;
      v0 = v;

      tmp[x_offset] = v;
      x_offset++;
    }

    v0 = v;
    v1 = v0;
    v2 = v1;

    out_index = y + height * width;

    for (x = width - 1; x >= 0; x--) {
      x_offset--;

      v = tmp[x_offset];
      v = coeff_b0 * v + (coeff_a0 * v0 + coeff_a1 * v1 + coeff_a2 * v2);

      v2 = v1;
      v1 = v0;
      v0 = v;

      out_index -= height;
      out[out_index] = v;
    }
  }
};


var blurMono16 = function (src, width, height, radius) {
  var out      = new Uint16Array(width * height),
      tmp_line = new Float32Array(width);

  var coeff = gaussCoef(radius);

  convolveMono16(src, out, tmp_line, coeff, width, height, radius);
  convolveMono16(out, src, tmp_line, coeff, height, width, radius);
};

module.exports = blurMono16;

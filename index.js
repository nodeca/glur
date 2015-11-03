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


function clampTo8(i) { return i < 0 ? 0 : (i > 255 ? 255 : i); }


var convolveRGBA = function (src, out, tmp, coeff, width, height) {
  var x, y, rgba, r, g, b, a, out_offs, in_offs, line_buf_offs;
  var r0, g0, b0, a0, r1, g1, b1, a1, r2, g2, b2, a2;

  var coeff_b0 = coeff[0];
  var coeff_a0 = coeff[1];
  var coeff_a1 = coeff[2];
  var coeff_a2 = coeff[3];

  // console.time('convolve');
  for (y = 0; y < height; y++) {
    in_offs = y * width * 4;

    rgba = src[in_offs];

    r = src[in_offs];
    g = src[in_offs + 1];
    b = src[in_offs + 2];
    a = src[in_offs + 3];

    r0 = r;
    g0 = g;
    b0 = b;
    a0 = a;

    r1 = r0;
    g1 = g0;
    b1 = b0;
    a1 = a0;

    r2 = r1;
    g2 = g1;
    b2 = b1;
    a2 = a1;

    line_buf_offs = 0;

    for (x = 0; x < width; x++) {
      r = src[in_offs];
      g = src[in_offs + 1];
      b = src[in_offs + 2];
      a = src[in_offs + 3];

      in_offs += 4;

      r = coeff_b0 * r + (coeff_a0 * r0 + coeff_a1 * r1 + coeff_a2 * r2);
      g = coeff_b0 * g + (coeff_a0 * g0 + coeff_a1 * g1 + coeff_a2 * g2);
      b = coeff_b0 * b + (coeff_a0 * b0 + coeff_a1 * b1 + coeff_a2 * b2);
      a = coeff_b0 * a + (coeff_a0 * a0 + coeff_a1 * a1 + coeff_a2 * a2);

      r2 = r1;
      g2 = g1;
      b2 = b1;
      a2 = a1;

      r1 = r0;
      g1 = g0;
      b1 = b0;
      a1 = a0;

      r0 = r;
      g0 = g;
      b0 = b;
      a0 = a;

      tmp[line_buf_offs    ] = r;
      tmp[line_buf_offs + 1] = g;
      tmp[line_buf_offs + 2] = b;
      tmp[line_buf_offs + 3] = a;

      line_buf_offs += 4;
    }

    r0 = r;
    g0 = g;
    b0 = b;
    a0 = a;

    r1 = r0;
    g1 = g0;
    b1 = b0;
    a1 = a0;

    r2 = r1;
    g2 = g1;
    b2 = b1;
    a2 = a1;

    out_offs = (y + height * width) * 4;

    for (x = width - 1; x >= 0; x--) {
      line_buf_offs -= 4;

      r = tmp[line_buf_offs];
      g = tmp[line_buf_offs + 1];
      b = tmp[line_buf_offs + 2];
      a = tmp[line_buf_offs + 3];

      r = coeff_b0 * r + (coeff_a0 * r0 + coeff_a1 * r1 + coeff_a2 * r2);
      g = coeff_b0 * g + (coeff_a0 * g0 + coeff_a1 * g1 + coeff_a2 * g2);
      b = coeff_b0 * b + (coeff_a0 * b0 + coeff_a1 * b1 + coeff_a2 * b2);
      a = coeff_b0 * a + (coeff_a0 * a0 + coeff_a1 * a1 + coeff_a2 * a2);

      r2 = r1;
      g2 = g1;
      b2 = b1;
      a2 = a1;

      r1 = r0;
      g1 = g0;
      b1 = b0;
      a1 = a0;

      r0 = r;
      g0 = g;
      b0 = b;
      a0 = a;

      out_offs -= height * 4;

      out[out_offs    ] = clampTo8((r + .5) |0);
      out[out_offs + 1] = clampTo8((g + .5) |0);
      out[out_offs + 2] = clampTo8((b + .5) |0);
      out[out_offs + 3] = clampTo8((a + .5) |0);
    }
  }
  // console.timeEnd('convolve');
};


var blurRGBA = function (src, width, height, radius) {
  // Unify input data type, to keep convolver calls isomorphic
  var srcUint8 = new Uint8Array(src.buffer);

  var out      = new Uint8Array(srcUint8.length),
      tmp_line = new Float32Array(width * 4);

  var coeff = gaussCoef(radius);

  convolveRGBA(srcUint8, out, tmp_line, coeff, width, height, radius);
  convolveRGBA(out, srcUint8, tmp_line, coeff, height, width, radius);
};

module.exports = blurRGBA;

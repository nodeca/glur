// Calculate Gaussian blur of an image using IIR filter
// The method is taken from Intel's white paper and code example attached to it:
// https://software.intel.com/en-us/articles/iir-gaussian-blur-filter
// -implementation-using-intel-advanced-vector-extensions

function gaussCoef(sigma) {
  if (sigma < 0.5) {
    sigma = 0.5;
  }

  var a = Math.exp(0.726 * 0.726) / sigma;
  var g1 = Math.exp(-a);
  var g2 = Math.exp(-2 * a);
  var k = (1 - g1) * (1 - g1) / (1 + 2 * a * g1 - g2);
  var a0 = k;
  var a1 = k * (a - 1) * g1;
  var a2 = k * (a + 1) * g1;
  var a3 = -k * g2;
  var b1 = 2 * g1;
  var b2 = -g2;
  var left_corner = (a0 + a1) / (1 - b1 - b2);
  var right_corner = (a2 + a3) / (1 - b1 - b2);
  return new Float32Array([ a0, a1, a2, a3, b1, b2, left_corner, right_corner ]);
}

function convolveMono16(src, out, line, coeff, width, height) {
  // takes src image and writes the blurred and transposed result into out

  var prev_src, curr_src, curr_out, prev_out, prev_prev_out;
  var src_index, out_index, line_index;
  var i, j;
  var t0, t1, t2, t3;

  for (i = 0; i < height; i++) {
    src_index = i * width;
    out_index = i;
    line_index = 0;

    // left to right
    prev_src = src[src_index];
    prev_prev_out = prev_src * coeff[6];
    prev_out = prev_prev_out;

    for (j = 0; j < width; j++) {
      curr_src = src[src_index];
      t0 = curr_src * coeff[0];
      t1 = prev_src * coeff[1];
      t2 = prev_out * coeff[4];
      t3 = prev_prev_out * coeff[5];
      curr_out = t0 + t1 + t2 + t3;

      prev_prev_out = prev_out;
      prev_out = curr_out;
      prev_src = curr_src;

      line[line_index] = prev_out;
      line_index++;
      src_index++;
    }
    src_index--;
    line_index--;
    out_index += height * (width - 1);

    // right to left
    prev_src = src[src_index];
    prev_prev_out = prev_src * coeff[7];
    prev_out = prev_prev_out;
    curr_src = prev_src;

    for (j = width - 1; j >= 0; j--) {
      t0 = curr_src * coeff[2];
      t1 = prev_src * coeff[3];
      t2 = prev_out * coeff[4];
      t3 = prev_prev_out * coeff[5];
      curr_out = t0 + t1 + t2 + t3;
      prev_prev_out = prev_out;
      prev_out = curr_out;

      prev_src = curr_src;
      curr_src = src[src_index];

      out[out_index] = line[line_index] + prev_out;

      src_index--;
      line_index--;
      out_index -= height;
    }
  }
}


function blurMono16(src, width, height, radius) {
  // Quick exit on zero radius
  if (!radius) { return; }

  var out      = new Uint16Array(src.length),
      tmp_line = new Float32Array(width);

  var coeff = gaussCoef(radius);

  convolveMono16(src, out, tmp_line, coeff, width, height, radius);
  convolveMono16(out, src, tmp_line, coeff, height, width, radius);
}

module.exports = blurMono16;

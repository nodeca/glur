var gaussCoef = function(sigma)
{
  var alpha, lamma,  k;
  // defensive check
  if (sigma < 0.5)
    sigma = 0.5;

  alpha = Math.exp((0.726)*(0.726)) / sigma;
  lamma = Math.exp(-alpha);

  var res = {
    b1: 0,
    b2: 0,
    a0: 0,
    a1: 0,
    a2: 0,
    a3: 0,
    cprev: 0,
    cnext: 0
  };

  res.b2 = Math.exp(-2*alpha);
  k = (1-lamma)*(1-lamma)/(1+2*alpha*lamma- (res.b2));
  res.a0 = k;
  res.a1 = k*(alpha-1)*lamma;
  res.a2 = k*(alpha+1)*lamma;
  res.a3 = -k* (res.b2);
  res.b1 = -2*lamma;
  res.cprev = (res.a0 + res.a1)/(1+ res.b1 + res.b2);
  res.cnext = (res.a2 + res.a3)/(1+ res.b1 + res.b2);
  return res;
};

var convolve = function (src, out, coeff, width, height, radius) {
  var x, y, rgb, r, g, b, a, weight_sum, out_index, y_offset, col, f;
  var  r0, g0, b0, a0, r1, g1, b1, a1, r2, g2, b2, a2;

  var tmp = new Uint32Array(width);

  for (y = 0; y < height; y++) {
    out_index = y;
    y_offset = y * width;

    for (x = 0; x < width; x++) {
      if (x > 2) {
        rgb = src[y_offset + x];
        a = (rgb >> 24) & 0xff;
        r = (rgb >> 16) & 0xff;
        g = (rgb >> 8) & 0xff;
        b =  rgb & 0xff;

        rgb = src[y_offset + x - 1];
        a0 = (rgb >> 24) & 0xff;
        r0 = (rgb >> 16) & 0xff;
        g0 = (rgb >> 8) & 0xff;
        b0 = rgb & 0xff;

        rgb = tmp[x - 1];

        a1 = (rgb >> 24) & 0xff;
        r1 = (rgb >> 16) & 0xff;
        g1 = (rgb >> 8) & 0xff;
        b1 =  rgb & 0xff;

        rgb = tmp[x - 2];
        a2 = (rgb >> 24) & 0xff;
        r2 = (rgb >> 16) & 0xff;
        g2 = (rgb >> 8) & 0xff;
        b2 = rgb & 0xff;

        a = coeff.a0 * a + coeff.a1 * a0 - (coeff.b1 * a1 + coeff.b2 * a2);
        r = coeff.a0 * r + coeff.a1 * r0 - (coeff.b1 * r1 + coeff.b2 * r2);
        g = coeff.a0 * g + coeff.a1 * g0 - (coeff.b1 * g1 + coeff.b2 * g2);
        b = coeff.a0 * b + coeff.a1 * b0 - (coeff.b1 * b1 + coeff.b2 * b2);


        a = a + 0.5 | 0 & 0xff;
        r = r + 0.5 | 0 & 0xff;
        g = g + 0.5 | 0 & 0xff;
        b = b + 0.5 | 0 & 0xff;

//        out[out_index] = (a << 24) | (r << 16) | (g << 8) | b;
        tmp[x] = (a << 24) | (r << 16) | (g << 8) | b;
      } else {
//        out[out_index] = src[y_offset + x];
        tmp[x] = src[y_offset + x];// * coeff.cprev;
      }
      out_index += height;
    }

    for (x = width - 1; x >= 0; x--) {
      if (x < width - 3) {
        rgb = tmp[x];
        var _a = (rgb >> 24) & 0xff;
        var _r = (rgb >> 16) & 0xff;
        var _g = (rgb >> 8) & 0xff;
        var _b =  rgb & 0xff;

        rgb = src[y_offset + x];
        a = (rgb >> 24) & 0xff;
        r = (rgb >> 16) & 0xff;
        g = (rgb >> 8) & 0xff;
        b =  rgb & 0xff;

        rgb = src[y_offset + x + 1];
        a0 = (rgb >> 24) & 0xff;
        r0 = (rgb >> 16) & 0xff;
        g0 = (rgb >> 8) & 0xff;
        b0 = rgb & 0xff;

        rgb = tmp[x + 1];

        a1 = (rgb >> 24) & 0xff;
        r1 = (rgb >> 16) & 0xff;
        g1 = (rgb >> 8) & 0xff;
        b1 =  rgb & 0xff;

        rgb = tmp[x + 2];
        a2 = (rgb >> 24) & 0xff;
        r2 = (rgb >> 16) & 0xff;
        g2 = (rgb >> 8) & 0xff;
        b2 = rgb & 0xff;

        a = _a + coeff.a0 * a + coeff.a1 * a0 - (coeff.b1 * a1 + coeff.b2 * a2);
        r = _r + coeff.a0 * r + coeff.a1 * r0 - (coeff.b1 * r1 + coeff.b2 * r2);
        g = _g + coeff.a0 * g + coeff.a1 * g0 - (coeff.b1 * g1 + coeff.b2 * g2);
        b = _b + coeff.a0 * b + coeff.a1 * b0 - (coeff.b1 * b1 + coeff.b2 * b2);

        a = a + 0.5 | 0 & 0xff;
        r = r + 0.5 | 0 & 0xff;
        g = g + 0.5 | 0 & 0xff;
        b = b + 0.5 | 0 & 0xff;

        out[y + x * height] = (a << 24) | (r << 16) | (g << 8) | b;
        tmp[x] = (a << 24) | (r << 16) | (g << 8) | b;
      } else {
        out[y + x * height] = tmp[x];// * coeff.cnext;
        tmp[x] = tmp[x];// * coeff.cnext;
      }
//      out_index += height;
    }
  }
};

glur
====

[![NPM version](https://img.shields.io/npm/v/glur.svg)](https://www.npmjs.org/package/glur)

> Fast Gaussian Blur in pure JavaScript, via IIR filer. Speed does not depend on
> blur radius.

__[Demo](http://nodeca.github.io/glur/demo)__


Install
-------

```bash
npm install glur --save
```


API
---

`require('glur')(src, width, height, radius)`

- __src__ - typed array with image RGBA data (will be updated with blured image).
- __width__ - image width.
- __height__ - image height.
- __radius__ - blur radius.

`require('glur/mono16')(src, width, height, radius)` - the same as above, but
input data is grayscale Uint16Array. Can be useful to calculate unsharp mask via
brightness/ligthness channel.


References
----------

- [IIR Gaussian Blur Filter Implementation using Intel® Advanced Vector Extensions](https://software.intel.com/en-us/articles/iir-gaussian-blur-filter-implementation-using-intel-advanced-vector-extensions) -
  very good article with technical details for programmers.
- [Быстрое размытие по Гауссу](http://habrahabr.ru/post/151157/) (RUS) - alternative
  with more simple aproximation function (we use it here in glur).


Licence
-------

[MIT](https://github.com/nodeca/glur/blob/master/LICENSE)

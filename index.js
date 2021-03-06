/*!
 * connect-timeout
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var createError = require('http-errors');
var debug = require('debug')('connect:timeout');
var ms = require('ms');
var onHeaders = require('on-headers');

/**
 * Timeout:
 *
 * See README.md for documentation.
 *
 * @param {Number} time
 * @param {Object} options
 * @return {Function} middleware
 * @api public
   */

module.exports = function timeout(time, options) {
  options = options || {};

  time = typeof time === 'string'
    ? ms(time)
    : Number(time || 5000);

  var respond = !('respond' in options) || options.respond === true;

  return function(req, res, next) {
    var destroy = req.socket.destroy;
    var id = setTimeout(function(){
      req.timedout = true;
      req.emit('timeout', time);
      req = res = next = null;
    }, time);

    if (respond) {
      req.on('timeout', onTimeout(time, next));
    }

    req.clearTimeout = function(){
      clearTimeout(id);
      id = null;
    };

    req.socket.destroy = function(){
      clearTimeout(id);
      if (destroy) {
        destroy.call(this);
      }
      next = destroy = id = req = res = null;
    };

    req.timedout = false;

    onHeaders(res, function(){
      clearTimeout(id);
      id = null;
      req = res = next = null;
    });

    next();
  };
};

function onTimeout(time, cb){
  return function(){
    cb(createError(503, 'Response timeout', {
      code: 'ETIMEDOUT',
      timeout: time
    }));
    
    time = cb = null;
  };
}

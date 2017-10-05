var Interpolate, debug, expression, filters, ref, unique, walk;

debug = require('debug')('rules:interpolate');

expression = require('./expression');

filters = require('./filters');

ref = require('../utils'), unique = ref.unique, walk = ref.walk;

Interpolate = (function() {
  function Interpolate(arg) {
    var filters;
    this.scope = arg.scope, this.context = arg.context, filters = arg.filters;
    this._filters = filters;
    this.re = {
      match: new RegExp('\{{2,3}([^\{]*?\|.*?)\}{2,3}', 'g'),
      filter: new RegExp("{([^\"|]*)}|\"([^\"|:]*)\"|'([^'|]*)'|([^\t(,|:)]+)", 'g'),
      split: new RegExp(' *\\| *')
    };
  }

  Interpolate.filters = {};

  Interpolate.templates = {};

  Interpolate.prototype.matches = function(input) {
    var test;
    test = new RegExp(this.re.match.source);
    return !!test.exec(input);
  };

  Interpolate.prototype._matches = function(input) {
    var test;
    test = new RegExp(this.re.match.source);
    return test.exec(input) || [];
  };

  Interpolate.template = function(name, template) {
    this.templates[name] = template;
    return this;
  };

  Interpolate.filter = function(name, fn) {
    this.filters[name] = fn;
    return this;
  };

  Interpolate.prototype.parse = function(types, fn) {
    return types.split(this.re.split).forEach((function(_this) {
      return function(call) {
        var args, name, parts;
        parts = call.match(_this.re.filter);
        name = parts.shift().trim();
        args = parts.map(_this.expr);
        return fn(name, args.slice());
      };
    })(this));
  };

  Interpolate.prototype.filter = function(val, types) {
    var fns;
    if (types == null) {
      types = [];
    }
    if (!types.length) {
      return val;
    }
    fns = this._filters || this.constructor.filters;
    this.parse(types.join('|'), (function(_this) {
      return function(name, args) {
        var fn;
        fn = fns[name];
        if (!fn) {
          return;
        }
        args.unshift(val);
        return val = fn.apply(_this, args);
      };
    })(this));
    return val;
  };

  Interpolate.prototype.expr = function(expr) {
    var e, fn, val;
    fn = new expression(expr);
    try {
      val = fn.exec(this.scope, this.context);
    } catch (error) {
      e = error;
      console.error(expr, e.message);
      val = expr;
    }
    return val;
  };

  Interpolate.prototype.exec = function(input) {
    var expr, parts, val;
    parts = this.split(input);
    expr = parts.shift();
    val = this.expr(expr);
    return this.filter(val, parts);
  };

  Interpolate.prototype.has = function(input) {
    return input.search(this.re.match) > -1;
  };

  Interpolate.prototype.replace = function(input) {
    return input.replace(this.re.match, (function(_this) {
      return function(_, match) {
        return _this.exec(match);
      };
    })(this));
  };

  Interpolate.prototype.value = function(input) {
    var matches;
    matches = this._matches(input);
    if (!matches.length) {
      return input;
    }
    if (matches[0].trim().length !== input.trim().length) {
      return this.replace(input);
    }
    return this.exec(matches[1]);
  };

  Interpolate.prototype.values = function(input) {
    return this.map(input, (function(_this) {
      return function(match) {
        return _this.value(match);
      };
    })(this));
  };

  Interpolate.prototype.props = function(str) {
    var arr;
    arr = [];
    this.each(str, function(match, expr, filters) {
      var fn;
      fn = new expression(expr);
      return arr = arr.concat(fn.props);
    });
    return unique(arr);
  };

  Interpolate.prototype.filters = function(str) {
    var arr;
    arr = [];
    this.each(str, (function(_this) {
      return function(match, expr, filters) {
        var filtersArray, filtr, i, len, results;
        filtersArray = _this.split(filters);
        results = [];
        for (i = 0, len = filtersArray.length; i < len; i++) {
          filtr = filtersArray[i];
          if (filtr !== '') {
            results.push(arr.push(filtr.trim().split(':')[0]));
          }
        }
        return results;
      };
    })(this));
    return unique(arr);
  };

  Interpolate.prototype.each = function(str, callback) {
    var expr, index, m, parts, results;
    index = 0;
    results = [];
    while (m = this.re.match.exec(str)) {
      parts = this.split(m[1]);
      expr = parts.shift();
      filters = parts.join('|');
      callback(m[0], expr, filters, index);
      results.push(index++);
    }
    return results;
  };

  Interpolate.prototype.walk = function(obj, fn) {
    var modify;
    if (typeof fn !== 'function') {
      fn = function(val) {
        return val;
      };
    }
    modify = (function(_this) {
      return function(value, isKey) {
        var val;
        val = fn(value, isKey);
        if (_this.matches(val)) {
          return _this.value(val);
        } else {
          return val;
        }
      };
    })(this);
    return walk(obj, modify);
  };

  Interpolate.prototype.split = function(val) {
    return val.replace(/\|\|/g, '\\u007C\\u007C').split('|');
  };

  Interpolate.prototype.map = function(str, callback) {
    var ret;
    ret = [];
    this.each(str, (function(_this) {
      return function() {
        return ret.push(callback.apply(_this, arguments));
      };
    })(this));
    return ret;
  };

  return Interpolate;

})();

filters(Interpolate);

module.exports = Interpolate;

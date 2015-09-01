'use strict';

var postcss = require('postcss');
var cssMediaQuery = require('css-mediaquery');
var units = require('units');


// Utilities
//------------------------------------------------------------------------------

var hasOwnProperty = {}.hasOwnProperty;

var getPxValue = function(value, property) {
  return units.convert('px', value, null, property).value;
};


// PostCSS plugin wrapper (exports)
//------------------------------------------------------------------------------

module.exports = postcss.plugin('postcss-mq-simplify', function() {
  return function(css) {
    css.eachAtRule('media', function(media) {
      // Update AST value
      media.params = formatMedia(media, buildOutput);
    });
  };
});


// Plugin logic
//------------------------------------------------------------------------------

var formatMedia = function(media, callback) {
  var rules = cssMediaQuery.parse(media.params);
  var conditions = {};

  // Format data structure
  rules.forEach(function(rule) {
    var level = conditions;
    var prevLevel;

    level = createStructure(level, rule.inverse);
    level = createStructure(level, rule.type);
    prevLevel = level; // Cache position

    rule.expressions.forEach(function(expression) {
      level = prevLevel;

      if (typeof expression.modifier !== 'undefined') {
        level = createStructure(level, expression.modifier);
      }

      level = createStructure(level, expression.feature, []);
      level.push(expression.value);
    });
  });

  return callback(media, conditions);
};

var buildOutput = function(media, conditions) {
  var output = [];

  forLevel(conditions, function(inverse, level) {
    output.push(
      inverse === false.toString()
        ? 'only'
        : 'not'
    );

    forLevel(level, function(type, level) {
      output.push(type);

      forLevel(level, function(modifier, level) {
        // level is an array at this point if rule lacks a modifier
        if (Array.isArray(level)) {
          pushFeature(output, modifier, level[0]);
        } else {
          if (typeof transforms[modifier] === 'function') {
            transforms[modifier](level);
          }

          forLevel(level, function(feature, value) {
            pushFeature(output, feature, value[0], modifier);
          });
        }
      });
    });
  });

  return output.join(' ');
};

var createStructure = function(current, level, structure) {
  if (typeof current[level] === 'undefined') {
    current[level] = structure || {};
  }

  return current[level];
};

var forLevel = function(object, callback) {
  var property;

  for (property in object) {
    if (!hasOwnProperty.call(object, property)) {
      continue;
    }

    callback(property, object[property]);
  }
};

var pushFeature = function(output, feature, value, modifier) {
  output.push('and');
  output.push('(' + (modifier ? modifier + '-' : '') + feature + ':');
  output.push(value + ')');
};

// MQ transform methods
//------------------------------------------------------------------------------

var transforms = {};

transforms.min = function(rules) {
  var feature;

  for (feature in rules) {
    if (!hasOwnProperty.call(rules, feature)) {
      continue;
    }

    rules[feature] = [rules[feature].reduce(function(a, b) {
      return getPxValue(a) > getPxValue(b)
        ? a
        : b;
    })];
  }
};

transforms.max = function(rules) {
  var feature;

  for (feature in rules) {
    if (!hasOwnProperty.call(rules, feature)) {
      continue;
    }

    rules[feature] = [rules[feature].reduce(function(a, b) {
      return getPxValue(a) < getPxValue(b)
        ? a
        : b;
    })];
  }
};

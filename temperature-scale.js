/* Fixed Celsius colors shared by the desktop and older TV browsers. */
(function () {
  'use strict';
  var stops = [
    [-10, [153, 151, 230]], [0, [111, 173, 237]],
    [10, [97, 200, 222]], [18, [150, 220, 195]],
    [24, [235, 213, 120]], [32, [241, 165, 102]],
    [40, [235, 105, 101]]
  ];
  function color(celsius) {
    var i, lower = stops[0], upper = stops[stops.length - 1], fraction;
    for (i = 1; i < stops.length; i++) {
      if (celsius <= stops[i][0]) { lower = stops[i - 1]; upper = stops[i]; break; }
    }
    fraction = Math.max(0, Math.min(1, (celsius - lower[0]) / (upper[0] - lower[0])));
    return 'rgb(' + lower[1].map(function (channel, index) {
      return Math.round(channel + (upper[1][index] - channel) * fraction);
    }).join(',') + ')';
  }
  function gradient(low, high) {
    var minimum = Math.min(low, high), maximum = Math.max(low, high), span = maximum - minimum;
    var points = [color(minimum) + ' 0%'];
    stops.forEach(function (stop) {
      if (stop[0] > minimum && stop[0] < maximum) {
        points.push(color(stop[0]) + ' ' + ((stop[0] - minimum) / span * 100) + '%');
      }
    });
    points.push(color(maximum) + ' 100%');
    return 'linear-gradient(90deg,' + points.join(',') + ')';
  }
  window.BISWTemperatureScale = {color:color, gradient:gradient};
}());

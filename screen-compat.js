/* Route built-in television browsers to the plain-script display. */
(function () {
  var tv = /Tizen|SmartTV|SMART-TV|Web0S|WebOS|NetCast|Maple|HbbTV|Viera|BRAVIA|CE-HTML/i.test(navigator.userAgent);
  var modules = 'noModule' in document.createElement('script');
  if (tv || !modules) window.location.replace('tv.html');
}());

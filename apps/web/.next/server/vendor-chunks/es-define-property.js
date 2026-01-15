"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/es-define-property";
exports.ids = ["vendor-chunks/es-define-property"];
exports.modules = {

/***/ "(ssr)/../../packages/shared/node_modules/es-define-property/index.js":
/*!**********************************************************************!*\
  !*** ../../packages/shared/node_modules/es-define-property/index.js ***!
  \**********************************************************************/
/***/ ((module) => {

eval("\n\n/** @type {import('.')} */\nvar $defineProperty = Object.defineProperty || false;\nif ($defineProperty) {\n\ttry {\n\t\t$defineProperty({}, 'a', { value: 1 });\n\t} catch (e) {\n\t\t// IE 8 has a broken defineProperty\n\t\t$defineProperty = false;\n\t}\n}\n\nmodule.exports = $defineProperty;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi4vLi4vcGFja2FnZXMvc2hhcmVkL25vZGVfbW9kdWxlcy9lcy1kZWZpbmUtcHJvcGVydHkvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQWE7O0FBRWIsV0FBVyxhQUFhO0FBQ3hCO0FBQ0E7QUFDQTtBQUNBLG9CQUFvQixTQUFTLFVBQVU7QUFDdkMsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBOztBQUVBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vQG15dHV0b3JhcHAvd2ViLy4uLy4uL3BhY2thZ2VzL3NoYXJlZC9ub2RlX21vZHVsZXMvZXMtZGVmaW5lLXByb3BlcnR5L2luZGV4LmpzP2FlMDQiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG4vKiogQHR5cGUge2ltcG9ydCgnLicpfSAqL1xudmFyICRkZWZpbmVQcm9wZXJ0eSA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSB8fCBmYWxzZTtcbmlmICgkZGVmaW5lUHJvcGVydHkpIHtcblx0dHJ5IHtcblx0XHQkZGVmaW5lUHJvcGVydHkoe30sICdhJywgeyB2YWx1ZTogMSB9KTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdC8vIElFIDggaGFzIGEgYnJva2VuIGRlZmluZVByb3BlcnR5XG5cdFx0JGRlZmluZVByb3BlcnR5ID0gZmFsc2U7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSAkZGVmaW5lUHJvcGVydHk7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(ssr)/../../packages/shared/node_modules/es-define-property/index.js\n");

/***/ })

};
;